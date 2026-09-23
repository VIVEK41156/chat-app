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

// Find and serve frontend client build in production
const possibleDistDirs = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'public')
];

const clientDistDir = possibleDistDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));

if (clientDistDir) {
  console.log(`[Static Frontend] Serving client build from: ${clientDistDir}`);
  app.use(express.static(clientDistDir, {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      }
    }
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    // If request was for a static asset (.js, .css, etc.) that does not exist, return 404 instead of index.html
    if (/\.(js|css|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
      return res.status(404).send('Asset not found');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
} else {
  console.warn('[Static Frontend] No client dist directory found in possible paths:', possibleDistDirs);
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>WhatsApp Web Loading...</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="background:#111b21;color:#e9edef;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
          <h2 style="color:#00a884;">WhatsApp Real-Time Server Active</h2>
          <p style="color:#8696a0;">Building and deploying frontend... Please refresh in a moment.</p>
          <button onclick="window.location.reload()" style="background:#00a884;color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:15px;">Refresh</button>
        </body>
      </html>
    `);
  });
}

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
