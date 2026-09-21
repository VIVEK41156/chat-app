import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun } from '../db.js';
import { getIO, getOnlineUsers } from '../socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const router = express.Router();

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const detectMessageType = (mimetype, filename) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

export const areFriends = async (userA, userB) => {
  const friendship = await dbGet(
    `SELECT * FROM friend_requests 
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND status = 'accepted'`,
    [userA, userB, userB, userA]
  );
  return friendship;
};

// Fetch message history (filters out expired disappearing messages)
router.get('/:userId/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    const friendship = await areFriends(userId, friendId);
    if (!friendship) {
      return res.status(403).json({
        error: 'You can only view or exchange messages with accepted friends. Please send or accept a friend request first.'
      });
    }

    const now = new Date().toISOString();
    // Delete any expired messages from DB
    await dbRun(
      `DELETE FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND expires_at IS NOT NULL AND expires_at <= ?`,
      [userId, friendId, friendId, userId, now]
    );

    const messages = await dbAll(
      `SELECT id, sender_id, receiver_id, content, message_type, file_url, file_name, file_size, status, created_at, delivered_at, read_at, expires_at 
       FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at ASC`,
      [userId, friendId, friendId, userId, now]
    );

    return res.json({ messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// Clear Chat (Deletes all messages between two users)
router.post('/clear', async (req, res) => {
  try {
    const { user_id, friend_id } = req.body;
    if (!user_id || !friend_id) {
      return res.status(400).json({ error: 'user_id and friend_id are required.' });
    }

    const result = await dbRun(
      `DELETE FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [user_id, friend_id, friend_id, user_id]
    );

    const io = getIO();
    if (io) {
      io.to(user_id).emit('messages:cleared', { friendId: friend_id });
      io.to(friend_id).emit('messages:cleared', { friendId: user_id });
    }

    return res.json({ message: 'Chat cleared successfully', deletedCount: result.changes });
  } catch (err) {
    console.error('Clear chat error:', err);
    return res.status(500).json({ error: 'Failed to clear chat.' });
  }
});

// Mark messages as read
router.post('/read', async (req, res) => {
  try {
    const { reader_id, friend_id } = req.body;
    if (!reader_id || !friend_id) {
      return res.status(400).json({ error: 'reader_id and friend_id are required.' });
    }

    const now = new Date().toISOString();
    const result = await dbRun(
      `UPDATE messages 
       SET status = 'read', read_at = ? 
       WHERE sender_id = ? AND receiver_id = ? AND status != 'read'`,
      [now, friend_id, reader_id]
    );

    if (result.changes > 0) {
      const io = getIO();
      if (io) {
        io.to(friend_id).emit('messages:read_receipt', {
          readerId: reader_id,
          friendId: friend_id,
          readAt: now
        });
      }
    }

    return res.json({ message: 'Messages marked as read', count: result.changes });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

// Send regular text message
router.post('/send', async (req, res) => {
  try {
    const { sender_id, receiver_id, content, message_type = 'text', file_url = null, file_name = null, file_size = null } = req.body;

    if (!sender_id || !receiver_id || (!content && !file_url)) {
      return res.status(400).json({ error: 'sender_id, receiver_id, and content or file are required.' });
    }

    const friendship = await areFriends(sender_id, receiver_id);
    if (!friendship) {
      return res.status(403).json({
        error: 'Cannot send message: you must be accepted friends first.'
      });
    }

    const onlineMap = getOnlineUsers();
    const isReceiverOnline = onlineMap.has(receiver_id);

    const now = new Date();
    const nowIso = now.toISOString();
    const messageId = uuidv4();
    const initialStatus = isReceiverOnline ? 'delivered' : 'sent';
    const deliveredAt = isReceiverOnline ? nowIso : null;

    // Disappearing timer computation
    let expiresAt = null;
    const timer = friendship.disappearing_timer || 0;
    if (timer > 0) {
      expiresAt = new Date(now.getTime() + timer * 1000).toISOString();
    }

    await dbRun(
      `INSERT INTO messages (id, sender_id, receiver_id, content, message_type, file_url, file_name, file_size, status, created_at, delivered_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, sender_id, receiver_id, (content || '').trim(), message_type, file_url, file_name, file_size, initialStatus, nowIso, deliveredAt, expiresAt]
    );

    const newMsg = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);

    const io = getIO();
    if (io) {
      io.to(receiver_id).emit('message:receive', newMsg);
      if (isReceiverOnline) {
        io.to(sender_id).emit('message:status_update', {
          messageId,
          status: 'delivered',
          delivered_at: nowIso
        });
      }
    }

    return res.status(201).json({ message: 'Message sent successfully', data: newMsg });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Upload Attachment
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { sender_id, receiver_id, content = '', custom_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!sender_id || !receiver_id) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'sender_id and receiver_id are required.' });
    }

    const friendship = await areFriends(sender_id, receiver_id);
    if (!friendship) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({
        error: 'Cannot send attachment: you must be accepted friends first.'
      });
    }

    const messageType = custom_type || detectMessageType(file.mimetype, file.originalname);
    const fileUrl = `/uploads/${file.filename}`;
    const fileName = file.originalname;
    const fileSize = formatBytes(file.size);

    const onlineMap = getOnlineUsers();
    const isReceiverOnline = onlineMap.has(receiver_id);

    const now = new Date();
    const nowIso = now.toISOString();
    const messageId = uuidv4();
    const initialStatus = isReceiverOnline ? 'delivered' : 'sent';
    const deliveredAt = isReceiverOnline ? nowIso : null;

    let expiresAt = null;
    const timer = friendship.disappearing_timer || 0;
    if (timer > 0) {
      expiresAt = new Date(now.getTime() + timer * 1000).toISOString();
    }

    await dbRun(
      `INSERT INTO messages (id, sender_id, receiver_id, content, message_type, file_url, file_name, file_size, status, created_at, delivered_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, sender_id, receiver_id, content.trim(), messageType, fileUrl, fileName, fileSize, initialStatus, nowIso, deliveredAt, expiresAt]
    );

    const newMsg = await dbGet('SELECT * FROM messages WHERE id = ?', [messageId]);

    const io = getIO();
    if (io) {
      io.to(receiver_id).emit('message:receive', newMsg);
      if (isReceiverOnline) {
        io.to(sender_id).emit('message:status_update', {
          messageId,
          status: 'delivered',
          delivered_at: nowIso
        });
      }
    }

    return res.status(201).json({ message: 'File sent successfully', data: newMsg });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to upload and send file.' });
  }
});

export default router;
