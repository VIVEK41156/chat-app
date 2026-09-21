import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
    const safeName = `status_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const router = express.Router();

// Helper to determine media type
const detectMediaType = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'video';
  return 'image';
};

// Post a new status (Photo / Video / Text)
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { user_id, caption = '', text = '', bg_color = '#00a884', media_type } = req.body;
    const file = req.file;

    if (!user_id) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'user_id is required.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [user_id]);
    if (!user) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'User not found.' });
    }

    const statusId = uuidv4();
    const now = new Date();
    const createdIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    let finalMediaUrl = null;
    let finalMediaType = media_type || 'text';
    let finalCaption = caption || text || '';

    if (file) {
      finalMediaUrl = `/uploads/${file.filename}`;
      finalMediaType = detectMediaType(file.mimetype);
    }

    await dbRun(
      `INSERT INTO statuses (id, user_id, media_url, media_type, caption, bg_color, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [statusId, user_id, finalMediaUrl, finalMediaType, finalCaption, bg_color, createdIso, expiresIso]
    );

    const newStatus = await dbGet('SELECT * FROM statuses WHERE id = ?', [statusId]);

    const io = getIO();
    if (io) {
      io.emit('status:created', {
        status: newStatus,
        user: { id: user.id, name: user.name, username: user.username, avatar: user.avatar }
      });
    }

    return res.status(201).json({ message: 'Status posted successfully', status: newStatus });
  } catch (err) {
    console.error('Upload status error:', err);
    return res.status(500).json({ error: 'Failed to post status.' });
  }
});

// Fetch status feed for a user (includes my statuses + friends statuses)
router.get('/feed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date().toISOString();

    // 1. Get confirmed friends IDs
    const friendships = await dbAll(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
      [userId, userId]
    );

    const friendIds = friendships.map((f) => (f.sender_id === userId ? f.receiver_id : f.sender_id));
    const allRelevantIds = [userId, ...friendIds];

    // 2. Fetch active statuses (not expired)
    const placeholders = allRelevantIds.map(() => '?').join(',');
    const statuses = await dbAll(
      `SELECT s.*, u.name, u.username, u.avatar
       FROM statuses s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id IN (${placeholders}) AND s.expires_at > ?
       ORDER BY s.created_at ASC`,
      [...allRelevantIds, now]
    );

    // 3. Attach views data
    const myStatuses = [];
    const friendsStatusMap = new Map();

    for (const st of statuses) {
      // Check total view count
      const viewCountRow = await dbGet(
        `SELECT COUNT(*) as count FROM status_views WHERE status_id = ?`,
        [st.id]
      );
      // Check if current user viewed this
      const hasViewedRow = await dbGet(
        `SELECT id FROM status_views WHERE status_id = ? AND viewer_id = ?`,
        [st.id, userId]
      );

      const statusItem = {
        ...st,
        viewCount: viewCountRow?.count || 0,
        hasViewed: Boolean(hasViewedRow || st.user_id === userId)
      };

      if (st.user_id === userId) {
        myStatuses.push(statusItem);
      } else {
        if (!friendsStatusMap.has(st.user_id)) {
          friendsStatusMap.set(st.user_id, {
            userId: st.user_id,
            name: st.name,
            username: st.username,
            avatar: st.avatar,
            statuses: [],
            hasUnseen: false,
            lastUpdated: st.created_at
          });
        }
        const userGroup = friendsStatusMap.get(st.user_id);
        userGroup.statuses.push(statusItem);
        if (!statusItem.hasViewed) {
          userGroup.hasUnseen = true;
        }
        userGroup.lastUpdated = st.created_at;
      }
    }

    const friendsStatuses = Array.from(friendsStatusMap.values());
    // Sort friends by unseen first, then newest
    friendsStatuses.sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });

    return res.json({
      myStatuses,
      friendsStatuses
    });
  } catch (err) {
    console.error('Fetch status feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch status feed.' });
  }
});

// Record a view for a status
router.post('/view', async (req, res) => {
  try {
    const { status_id, viewer_id } = req.body;

    if (!status_id || !viewer_id) {
      return res.status(400).json({ error: 'status_id and viewer_id are required.' });
    }

    const status = await dbGet('SELECT * FROM statuses WHERE id = ?', [status_id]);
    if (!status) {
      return res.status(404).json({ error: 'Status not found.' });
    }

    const viewer = await dbGet('SELECT id, name, username, avatar FROM users WHERE id = ?', [viewer_id]);

    // Don't record view if viewing own status
    if (status.user_id !== viewer_id) {
      const now = new Date().toISOString();
      const viewId = uuidv4();

      try {
        await dbRun(
          `INSERT OR IGNORE INTO status_views (id, status_id, viewer_id, viewed_at)
           VALUES (?, ?, ?, ?)`,
          [viewId, status_id, viewer_id, now]
        );

        const io = getIO();
        if (io) {
          // Notify the status owner in real-time
          io.to(status.user_id).emit('status:view_updated', {
            statusId: status_id,
            viewer
          });
        }
      } catch (e) {}
    }

    const totalViews = await dbGet('SELECT COUNT(*) as count FROM status_views WHERE status_id = ?', [status_id]);

    return res.json({ success: true, viewCount: totalViews?.count || 0 });
  } catch (err) {
    console.error('Status view error:', err);
    return res.status(500).json({ error: 'Failed to record view.' });
  }
});

// Get viewers list for status owner
router.get('/:statusId/views', async (req, res) => {
  try {
    const { statusId } = req.params;

    const viewers = await dbAll(
      `SELECT sv.viewed_at, u.id, u.name, u.username, u.avatar
       FROM status_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.status_id = ?
       ORDER BY sv.viewed_at DESC`,
      [statusId]
    );

    return res.json({ viewers });
  } catch (err) {
    console.error('Fetch status viewers error:', err);
    return res.status(500).json({ error: 'Failed to fetch status viewers.' });
  }
});

// Delete status
router.delete('/:statusId', async (req, res) => {
  try {
    const { statusId } = req.params;
    await dbRun('DELETE FROM statuses WHERE id = ?', [statusId]);
    return res.json({ message: 'Status deleted successfully' });
  } catch (err) {
    console.error('Delete status error:', err);
    return res.status(500).json({ error: 'Failed to delete status.' });
  }
});

export default router;
