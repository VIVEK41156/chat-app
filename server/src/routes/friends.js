import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from '../db.js';
import { getIO, getOnlineUsers } from '../socket.js';

const router = express.Router();

// Get confirmed friends list with last message & unread badge count
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch accepted friendships
    const friendships = await dbAll(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
      [userId, userId]
    );

    const friends = [];

    for (const f of friendships) {
      const friendId = f.sender_id === userId ? f.receiver_id : f.sender_id;
      const friendUser = await dbGet(
        `SELECT id, username, name, avatar, status_message, is_online, last_seen FROM users WHERE id = ?`,
        [friendId]
      );

      if (!friendUser) continue;

      // Get last message between the two
      const lastMsg = await dbGet(
        `SELECT id, sender_id, receiver_id, content, message_type, status, created_at 
         FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [userId, friendId, friendId, userId]
      );

      // Get unread count from this friend
      const unread = await dbGet(
        `SELECT COUNT(*) as count FROM messages 
         WHERE sender_id = ? AND receiver_id = ? AND status != 'read'`,
        [friendId, userId]
      );

      // Online status check from active socket pool
      const onlineMap = getOnlineUsers();
      const isActuallyOnline = onlineMap.has(friendId) || Boolean(friendUser.is_online);

      friends.push({
        ...friendUser,
        is_online: isActuallyOnline ? 1 : 0,
        friendshipId: f.id,
        friendsSince: f.updated_at,
        disappearingTimer: f.disappearing_timer || 0,
        lastMessage: lastMsg || null,
        unreadCount: unread?.count || 0
      });
    }

    // Sort by last message timestamp or name
    friends.sort((a, b) => {
      const timeA = a.lastMessage?.created_at || a.friendsSince || '';
      const timeB = b.lastMessage?.created_at || b.friendsSince || '';
      return timeB.localeCompare(timeA);
    });

    return res.json({ friends });
  } catch (err) {
    console.error('Fetch friends list error:', err);
    return res.status(500).json({ error: 'Failed to fetch friends list.' });
  }
});

// Get pending friend requests (incoming & outgoing)
router.get('/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Incoming requests (people who want to add this user)
    const incoming = await dbAll(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
              u.username, u.name, u.avatar, u.status_message, u.is_online, u.last_seen
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    // Outgoing requests (people this user requested)
    const outgoing = await dbAll(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
              u.username, u.name, u.avatar, u.status_message, u.is_online, u.last_seen
       FROM friend_requests fr
       JOIN users u ON u.id = fr.receiver_id
       WHERE fr.sender_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    return res.json({ incoming, outgoing });
  } catch (err) {
    console.error('Fetch friend requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch friend requests.' });
  }
});

// Send a friend request
router.post('/request', async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.body;

    if (!sender_id || !receiver_id) {
      return res.status(400).json({ error: 'sender_id and receiver_id are required.' });
    }

    if (sender_id === receiver_id) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }

    const sender = await dbGet('SELECT * FROM users WHERE id = ?', [sender_id]);
    const receiver = await dbGet('SELECT * FROM users WHERE id = ?', [receiver_id]);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver user not found.' });
    }

    // Check existing relationship
    const existing = await dbGet(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends with this person.' });
      }
      if (existing.status === 'pending') {
        if (existing.sender_id === sender_id) {
          return res.status(400).json({ error: 'Friend request already sent and pending.' });
        } else {
          // If the other person had sent a request, auto-accept it!
          await dbRun(`UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE id = ?`, [now, existing.id]);
          
          const io = getIO();
          if (io) {
            io.to(sender_id).emit('friend:request_accepted', {
              requestId: existing.id,
              friend: receiver
            });
            io.to(receiver_id).emit('friend:request_accepted', {
              requestId: existing.id,
              friend: sender
            });
          }

          return res.json({ message: 'Mutual friend request! You are now friends.', status: 'accepted', requestId: existing.id });
        }
      }
      if (existing.status === 'rejected') {
        // Allow re-sending if previously rejected
        await dbRun(
          `UPDATE friend_requests SET sender_id = ?, receiver_id = ?, status = 'pending', updated_at = ? WHERE id = ?`,
          [sender_id, receiver_id, now, existing.id]
        );

        const io = getIO();
        if (io) {
          io.to(receiver_id).emit('friend:request_received', {
            id: existing.id,
            sender_id,
            receiver_id,
            status: 'pending',
            created_at: now,
            username: sender.username,
            name: sender.name,
            avatar: sender.avatar
          });
        }

        return res.status(201).json({ message: 'Friend request sent successfully.', requestId: existing.id });
      }
    }

    // Create new request
    const requestId = uuidv4();
    await dbRun(
      `INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [requestId, sender_id, receiver_id, now, now]
    );

    // Socket notification
    const io = getIO();
    if (io) {
      io.to(receiver_id).emit('friend:request_received', {
        id: requestId,
        sender_id,
        receiver_id,
        status: 'pending',
        created_at: now,
        username: sender.username,
        name: sender.name,
        avatar: sender.avatar,
        status_message: sender.status_message
      });
    }

    return res.status(201).json({ message: 'Friend request sent successfully.', requestId });
  } catch (err) {
    console.error('Send friend request error:', err);
    return res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

// Respond to friend request (accept / reject)
router.post('/respond', async (req, res) => {
  try {
    const { request_id, user_id, action } = req.body; // action: 'accept' or 'reject'

    if (!request_id || !user_id || !action) {
      return res.status(400).json({ error: 'request_id, user_id, and action are required.' });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'accept' or 'reject'." });
    }

    const request = await dbGet('SELECT * FROM friend_requests WHERE id = ?', [request_id]);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }

    // Must be the receiver responding to the request
    if (request.receiver_id !== user_id) {
      return res.status(403).json({ error: 'Only the recipient of this request can accept or reject it.' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const now = new Date().toISOString();

    await dbRun(
      `UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?`,
      [newStatus, now, request_id]
    );

    const sender = await dbGet('SELECT id, username, name, avatar, status_message, is_online, last_seen FROM users WHERE id = ?', [request.sender_id]);
    const receiver = await dbGet('SELECT id, username, name, avatar, status_message, is_online, last_seen FROM users WHERE id = ?', [request.receiver_id]);

    const io = getIO();
    if (io) {
      if (newStatus === 'accepted') {
        io.to(request.sender_id).emit('friend:request_accepted', {
          requestId: request_id,
          friend: receiver
        });
        io.to(request.receiver_id).emit('friend:request_accepted', {
          requestId: request_id,
          friend: sender
        });
      } else {
        io.to(request.sender_id).emit('friend:request_rejected', {
          requestId: request_id,
          receiverId: request.receiver_id
        });
      }
    }

    return res.json({
      message: `Friend request ${newStatus} successfully.`,
      status: newStatus,
      requestId: request_id
    });
  } catch (err) {
    console.error('Respond friend request error:', err);
    return res.status(500).json({ error: 'Failed to respond to friend request.' });
  }
});

// Update Disappearing Messages Timer for friendship
router.post('/disappearing-timer', async (req, res) => {
  try {
    const { user_id, friend_id, timer } = req.body;
    const timerSeconds = parseInt(timer, 10) || 0;

    const friendship = await dbGet(
      `SELECT * FROM friend_requests 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'accepted'`,
      [user_id, friend_id, friend_id, user_id]
    );

    if (!friendship) {
      return res.status(404).json({ error: 'Active friendship not found.' });
    }

    await dbRun(
      `UPDATE friend_requests SET disappearing_timer = ? WHERE id = ?`,
      [timerSeconds, friendship.id]
    );

    const io = getIO();
    if (io) {
      io.to(user_id).emit('friend:timer_updated', {
        friendId: friend_id,
        timer: timerSeconds
      });
      io.to(friend_id).emit('friend:timer_updated', {
        friendId: user_id,
        timer: timerSeconds
      });
    }

    return res.json({
      message: timerSeconds === 0 ? 'Disappearing messages turned off' : `Disappearing messages set to ${timerSeconds} seconds`,
      timer: timerSeconds
    });
  } catch (err) {
    console.error('Disappearing timer error:', err);
    return res.status(500).json({ error: 'Failed to update disappearing messages timer.' });
  }
});

export default router;
