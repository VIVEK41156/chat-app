import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';

let io = null;
// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

export const getIO = () => io;
export const getOnlineUsers = () => onlineUsers;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    let currentUserId = socket.handshake.query.userId || null;

    console.log(`[Socket] Client connected: ${socket.id} (User: ${currentUserId || 'anonymous'})`);

    // Handle user registration in socket pool
    const handleUserOnline = async (userId) => {
      if (!userId) return;
      currentUserId = userId;
      socket.join(userId);

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      const now = new Date().toISOString();
      await dbRun(`UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?`, [now, userId]);

      // Broadcast user is online
      io.emit('user:presence', {
        userId,
        is_online: 1,
        last_seen: now
      });

      // Update any pending 'sent' messages addressed to this user to 'delivered'
      try {
        const pendingMsgs = await dbAll(
          `SELECT id, sender_id FROM messages WHERE receiver_id = ? AND status = 'sent'`,
          [userId]
        );

        if (pendingMsgs.length > 0) {
          await dbRun(
            `UPDATE messages SET status = 'delivered', delivered_at = ? WHERE receiver_id = ? AND status = 'sent'`,
            [now, userId]
          );

          // Group by sender and notify them of delivery (Double Tick)
          const senderMap = new Map();
          for (const msg of pendingMsgs) {
            if (!senderMap.has(msg.sender_id)) {
              senderMap.set(msg.sender_id, []);
            }
            senderMap.get(msg.sender_id).push(msg.id);
          }

          senderMap.forEach((msgIds, senderId) => {
            io.to(senderId).emit('messages:delivered_batch', {
              messageIds: msgIds,
              receiverId: userId,
              deliveredAt: now
            });
          });
        }
      } catch (err) {
        console.error('[Socket] Error updating delivered messages on login:', err);
      }
    };

    if (currentUserId) {
      handleUserOnline(currentUserId);
    }

    // Manual join event from client
    socket.on('user:join', (userId) => {
      handleUserOnline(userId);
    });

    // Send real-time chat message
    socket.on('message:send', async (data, ack) => {
      try {
        const { sender_id, receiver_id, content, message_type = 'text' } = data;

        if (!sender_id || !receiver_id || !content) {
          if (ack) ack({ error: 'Missing required message parameters' });
          return;
        }

        // Verify friendship status before allowing message
        const friendship = await dbGet(
          `SELECT * FROM friend_requests 
           WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
             AND status = 'accepted'`,
          [sender_id, receiver_id, receiver_id, sender_id]
        );

        if (!friendship) {
          if (ack) ack({ error: 'You must be accepted friends to chat with this person.' });
          return;
        }

        const isReceiverOnline = onlineUsers.has(receiver_id) && onlineUsers.get(receiver_id).size > 0;
        const now = new Date().toISOString();
        const messageId = uuidv4();
        const status = isReceiverOnline ? 'delivered' : 'sent';
        const deliveredAt = isReceiverOnline ? now : null;

        await dbRun(
          `INSERT INTO messages (id, sender_id, receiver_id, content, message_type, status, created_at, delivered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [messageId, sender_id, receiver_id, content.trim(), message_type, status, now, deliveredAt]
        );

        const newMsg = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);

        // Emit to receiver's room
        io.to(receiver_id).emit('message:receive', newMsg);

        // Ack back to sender
        if (ack) ack({ success: true, message: newMsg });

        // If delivered, notify sender with double tick
        if (isReceiverOnline) {
          io.to(sender_id).emit('message:status_update', {
            messageId,
            status: 'delivered',
            delivered_at: now
          });
        }
      } catch (err) {
        console.error('[Socket] message:send error:', err);
        if (ack) ack({ error: 'Failed to send message.' });
      }
    });

    // Read Receipt (Double Blue Tick)
    socket.on('messages:mark_read', async (data) => {
      try {
        const { readerId, friendId } = data;
        if (!readerId || !friendId) return;

        const now = new Date().toISOString();
        const result = await dbRun(
          `UPDATE messages 
           SET status = 'read', read_at = ? 
           WHERE sender_id = ? AND receiver_id = ? AND status != 'read'`,
          [now, friendId, readerId]
        );

        if (result.changes > 0) {
          // Notify the sender that reader saw their messages
          io.to(friendId).emit('messages:read_receipt', {
            readerId,
            friendId,
            readAt: now
          });
        }
      } catch (err) {
        console.error('[Socket] messages:mark_read error:', err);
      }
    });

    // Typing Indicators
    socket.on('typing:start', (data) => {
      const { senderId, receiverId, senderName } = data;
      if (receiverId) {
        io.to(receiverId).emit('typing:started', {
          senderId,
          senderName
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { senderId, receiverId } = data;
      if (receiverId) {
        io.to(receiverId).emit('typing:stopped', {
          senderId
        });
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id} (User: ${currentUserId || 'unknown'})`);
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          const now = new Date().toISOString();
          await dbRun(`UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?`, [now, currentUserId]);

          // Broadcast user went offline
          io.emit('user:presence', {
            userId: currentUserId,
            is_online: 0,
            last_seen: now
          });
        }
      }
    });
  });
};
