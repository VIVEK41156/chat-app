import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, dbAll, dbRun } from './db.js';
import { initSocket, getIO } from './socket.js';
import { initEmailTransporter } from './emailService.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';
import statusRoutes from './routes/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static upload file serving
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/status', statusRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Real-Time Chat Engine'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDB();
    initEmailTransporter();
    initSocket(server);

    // Automated periodic disappearing messages purge (every 3 seconds)
    setInterval(async () => {
      try {
        const now = new Date().toISOString();
        const expired = await dbAll(
          'SELECT id, sender_id, receiver_id FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?',
          [now]
        );
        if (expired && expired.length > 0) {
          await dbRun('DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?', [now]);
          const io = getIO();
          if (io) {
            for (const msg of expired) {
              io.to(msg.sender_id).emit('message:expired', { messageId: msg.id, friendId: msg.receiver_id });
              io.to(msg.receiver_id).emit('message:expired', { messageId: msg.id, friendId: msg.sender_id });
            }
          }
        }
      } catch (err) {
        console.error('Error in disappearing message purge:', err);
      }
    }, 3000);

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Real-Time WhatsApp Chat Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO listening on ws://localhost:${PORT}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start chat server:', err);
    process.exit(1);
  }
};

startServer();
