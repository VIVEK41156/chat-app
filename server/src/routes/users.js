import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun } from '../db.js';
import { getIO } from '../socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `avatar_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max avatar
});

const router = express.Router();

// Upload custom avatar image
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId || !file) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'userId and avatar image file are required.' });
    }

    const avatarUrl = `/uploads/${file.filename}`;
    await dbRun(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarUrl, userId]);

    const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    const io = getIO();
    if (io) {
      io.emit('user:profile_updated', {
        userId,
        avatar: avatarUrl,
        user: updatedUser
      });
    }

    return res.json({ message: 'Avatar updated successfully', avatarUrl, user: updatedUser });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

// List all registered users with relationship status relative to current_user_id
router.get('/', async (req, res) => {
  try {
    const { current_user_id, search } = req.query;
    let query = `SELECT id, username, name, avatar, email, status_message, is_online, last_seen, created_at FROM users WHERE 1=1`;
    const params = [];

    if (current_user_id) {
      query += ` AND id != ?`;
      params.push(current_user_id);
    }

    if (search) {
      query += ` AND (name LIKE ? OR username LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY name ASC`;
    const users = await dbAll(query, params);

    // If current_user_id is provided, attach relationship info
    if (current_user_id) {
      const relationships = await dbAll(
        `SELECT id, sender_id, receiver_id, status FROM friend_requests 
         WHERE sender_id = ? OR receiver_id = ?`,
        [current_user_id, current_user_id]
      );

      const relationMap = {};
      for (const rel of relationships) {
        const otherId = rel.sender_id === current_user_id ? rel.receiver_id : rel.sender_id;
        relationMap[otherId] = {
          requestId: rel.id,
          status: rel.status,
          isSender: rel.sender_id === current_user_id
        };
      }

      const usersWithStatus = users.map(u => {
        const rel = relationMap[u.id];
        let friendshipStatus = 'none';
        let requestId = null;

        if (rel) {
          requestId = rel.requestId;
          if (rel.status === 'accepted') {
            friendshipStatus = 'friends';
          } else if (rel.status === 'pending') {
            friendshipStatus = rel.isSender ? 'pending_sent' : 'pending_received';
          } else if (rel.status === 'rejected') {
            friendshipStatus = 'rejected';
          }
        }

        return {
          ...u,
          friendshipStatus,
          requestId
        };
      });

      return res.json({ users: usersWithStatus });
    }

    return res.json({ users });
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Get user specific summary (counters for refreshing)
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Pending incoming friend requests count
    const pendingReqCount = await dbGet(
      `SELECT COUNT(*) as count FROM friend_requests WHERE receiver_id = ? AND status = 'pending'`,
      [userId]
    );

    // Total unread messages count
    const unreadCount = await dbGet(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND status != 'read'`,
      [userId]
    );

    // Confirmed friends count
    const friendsCount = await dbGet(
      `SELECT COUNT(*) as count FROM friend_requests 
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
      [userId, userId]
    );

    return res.json({
      user,
      pendingRequestsCount: pendingReqCount?.count || 0,
      unreadMessagesCount: unreadCount?.count || 0,
      friendsCount: friendsCount?.count || 0
    });
  } catch (err) {
    console.error('Summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch user summary.' });
  }
});

export default router;
