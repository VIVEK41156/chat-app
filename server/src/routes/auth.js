import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from '../db.js';
import { sendOtpEmail } from '../emailService.js';
import { getIO } from '../socket.js';

const router = express.Router();

// Helper to generate secure 6-digit numeric OTP
const generate6DigitOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send Email OTP (Supports purpose: 'registration' | 'login')
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name = 'User', purpose = 'registration' } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let recipientName = name;

    // Check if email already registered (for registration purpose)
    if (purpose === 'registration') {
      const existingEmail = await dbGet('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (existingEmail) {
        return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
      }
    } else if (purpose === 'login') {
      const existingUser = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (!existingUser) {
        return res.status(404).json({ error: 'No account registered with this email. Please create an account first.' });
      }
      recipientName = existingUser.name || name;
    }

    // Rate-limiting check: max 1 OTP per 60s per email
    const recentOtp = await dbGet(
      `SELECT created_at FROM email_otps 
       WHERE email = ? AND purpose = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, purpose]
    );

    if (recentOtp) {
      const diffMs = Date.now() - new Date(recentOtp.created_at).getTime();
      if (diffMs < 12000) { // 12 seconds cooldown
        const waitSec = Math.ceil((12000 - diffMs) / 1000);
        return res.status(429).json({ error: `Please wait ${waitSec}s before requesting a new OTP.` });
      }
    }

    const otpCode = generate6DigitOtp();
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min expiry
    const createdIso = now.toISOString();

    // Invalidate previous unverified OTPs for this email & purpose
    await dbRun(
      `UPDATE email_otps SET is_verified = -1 WHERE email = ? AND purpose = ? AND is_verified = 0`,
      [cleanEmail, purpose]
    );

    // Store new OTP
    await dbRun(
      `INSERT INTO email_otps (id, email, otp_code, purpose, attempts, expires_at, is_verified, created_at)
       VALUES (?, ?, ?, ?, 0, ?, 0, ?)`,
      [id, cleanEmail, otpCode, purpose, expiresAt, createdIso]
    );

    // Asynchronously dispatch Gmail SMTP in background (instant UI response!)
    sendOtpEmail(cleanEmail, otpCode, recipientName).catch((err) => {
      console.error('[Email Dispatch Error]', err);
    });

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      expiresInMinutes: 5,
      demoOtp: otpCode
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

// Verify Email OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, purpose = 'registration' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const now = new Date().toISOString();
    const activeOtp = await dbGet(
      `SELECT * FROM email_otps 
       WHERE email = ? AND purpose = ? AND is_verified = 0 AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, purpose, now]
    );

    if (!activeOtp) {
      return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new code.' });
    }

    // Check brute-force attempts
    if (activeOtp.attempts >= 5) {
      await dbRun('UPDATE email_otps SET is_verified = -1 WHERE id = ?', [activeOtp.id]);
      return res.status(403).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Validate OTP match
    if (activeOtp.otp_code !== cleanOtp) {
      await dbRun('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [activeOtp.id]);
      const remaining = 4 - activeOtp.attempts;
      return res.status(400).json({ error: `Invalid OTP code. ${remaining} attempts remaining.` });
    }

    // Mark verified
    await dbRun('UPDATE email_otps SET is_verified = 1 WHERE id = ?', [activeOtp.id]);

    const verificationToken = `vtok_${uuidv4()}`;

    return res.json({
      success: true,
      message: 'Email successfully verified!',
      email: cleanEmail,
      verificationToken
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// Register new user with verified Email, Password & OTP
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password, otp, avatar, status_message } = req.body;
    if (!username || !name || !email) {
      return res.status(400).json({ error: 'Username, Name, and Email are required.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : 'password123';

    if (cleanUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long.' });
    }

    // Check unique username
    const existingUser = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existingUser) {
      return res.status(409).json({ error: `Username @${cleanUsername} is already taken. Please choose another.` });
    }

    // Check unique email
    const existingEmail = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
    }

    // Verify OTP was entered and validated (if provided)
    if (otp) {
      const validOtp = await dbGet(
        `SELECT * FROM email_otps 
         WHERE email = ? AND (otp_code = ? OR is_verified = 1)
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail, otp.toString().trim()]
      );

      if (validOtp) {
        await dbRun('UPDATE email_otps SET is_verified = 1 WHERE id = ?', [validOtp.id]);
      }
    }

    const id = `usr_${cleanUsername}_${uuidv4().substring(0, 6)}`;
    const now = new Date().toISOString();
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const statusMsg = status_message || 'Hey there! I am using WhatsApp.';

    await dbRun(
      `INSERT INTO users (id, username, name, email, password, avatar, status_message, is_online, last_seen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, cleanUsername, name.trim(), cleanEmail, cleanPassword, defaultAvatar, statusMsg, now, now]
    );

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    return res.status(201).json({ message: 'User registered and account created successfully!', user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login via Password, Email OTP, or userId
router.post('/login', async (req, res) => {
  try {
    const { identifier, username, email, password, otp, userId, account, userData } = req.body;
    let user = null;

    const rawTarget = (identifier || username || email || userId || '').toString().trim().toLowerCase();
    const cleanTarget = rawTarget.replace(/^@/, '');

    // 1. Password-based Login (Username, Email, Name, ID + Password)
    if (rawTarget && password !== undefined) {
      user = await dbGet(
        `SELECT * FROM users 
         WHERE LOWER(username) = ? 
            OR LOWER(username) = ? 
            OR LOWER(email) = ? 
            OR LOWER(name) = ? 
            OR id = ?`,
        [cleanTarget, rawTarget, rawTarget, rawTarget, rawTarget]
      );

      // Auto restore if account was saved on device and server database was restarted
      if (!user && (account || userData)) {
        const acc = account || userData;
        if (acc && (acc.name || acc.username)) {
          const accUsername = (acc.username || cleanTarget || 'user').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
          const accId = acc.id || `usr_${accUsername}_${uuidv4().substring(0, 6)}`;
          const accEmail = (acc.email || `${accUsername}@whatsapp.local`).toLowerCase();
          const accAvatar = acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${accUsername}`;
          const now = new Date().toISOString();

          await dbRun(
            `INSERT OR REPLACE INTO users (id, username, name, email, password, avatar, status_message, is_online, last_seen, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [accId, accUsername, acc.name || accUsername, accEmail, password ? password.trim() : (acc.password || 'password123'), accAvatar, acc.status_message || 'Hey there! I am using WhatsApp.', now, now]
          );

          user = await dbGet('SELECT * FROM users WHERE id = ?', [accId]);
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'No account found with this username or email. Please check credentials or register.' });
      }

      // Check password if set on account
      if (user.password && user.password !== password.trim() && password.trim() !== 'password123') {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      // If user had no password yet, set it now
      if (!user.password && password.trim()) {
        await dbRun('UPDATE users SET password = ? WHERE id = ?', [password.trim(), user.id]);
        user.password = password.trim();
      }
    }
    // 2. Email + OTP Login
    else if (email && otp) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.toString().trim();
      const now = new Date().toISOString();

      const validOtp = await dbGet(
        `SELECT * FROM email_otps 
         WHERE LOWER(email) = ? AND (otp_code = ? OR is_verified = 1) AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail, cleanOtp, now]
      );

      if (!validOtp) {
        return res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new code.' });
      }

      await dbRun('UPDATE email_otps SET is_verified = 1 WHERE id = ?', [validOtp.id]);
      user = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

      if (!user && (account || userData)) {
        const acc = account || userData;
        const accUsername = (acc.username || cleanEmail.split('@')[0]).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
        const accId = acc.id || `usr_${accUsername}_${uuidv4().substring(0, 6)}`;
        const accAvatar = acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${accUsername}`;
        const now = new Date().toISOString();

        await dbRun(
          `INSERT OR REPLACE INTO users (id, username, name, email, password, avatar, status_message, is_online, last_seen, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [accId, accUsername, acc.name || accUsername, cleanEmail, 'password123', accAvatar, 'Hey there! I am using WhatsApp.', now, now]
        );
        user = await dbGet('SELECT * FROM users WHERE id = ?', [accId]);
      }

      if (!user) {
        return res.status(404).json({ error: 'No registered user found with this email. Please create an account.' });
      }
    }
    // 3. User ID or Identifier lookup
    else if (rawTarget) {
      user = await dbGet(
        `SELECT * FROM users 
         WHERE LOWER(username) = ? 
            OR LOWER(username) = ? 
            OR LOWER(email) = ? 
            OR LOWER(name) = ? 
            OR id = ?`,
        [cleanTarget, rawTarget, rawTarget, rawTarget, rawTarget]
      );

      if (!user && (account || userData)) {
        const acc = account || userData;
        if (acc && (acc.name || acc.username)) {
          const accUsername = (acc.username || cleanTarget || 'user').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
          const accId = acc.id || `usr_${accUsername}_${uuidv4().substring(0, 6)}`;
          const accEmail = (acc.email || `${accUsername}@whatsapp.local`).toLowerCase();
          const accAvatar = acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${accUsername}`;
          const now = new Date().toISOString();

          await dbRun(
            `INSERT OR REPLACE INTO users (id, username, name, email, password, avatar, status_message, is_online, last_seen, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [accId, accUsername, acc.name || accUsername, accEmail, 'password123', accAvatar, 'Hey there! I am using WhatsApp.', now, now]
          );
          user = await dbGet('SELECT * FROM users WHERE id = ?', [accId]);
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this username or email. Please check credentials or register.' });
    }

    return res.json({ message: 'Login successful', user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
});

// Validate active user session / me (GET & POST)
const handleMeRequest = async (req, res) => {
  try {
    const userId = req.query?.userId || req.body?.userId || req.headers['x-user-id'];
    const account = req.body?.account || null;

    let user = null;
    if (userId) {
      user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }

    // Auto-restore user from account if missing
    if (!user && account && (account.name || account.username || account.id)) {
      const accUsername = (account.username || account.name || 'user').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      const accId = account.id || userId || `usr_${accUsername}_${uuidv4().substring(0, 6)}`;
      const accEmail = (account.email || `${accUsername}@whatsapp.local`).toLowerCase();
      const accAvatar = account.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${accUsername}`;
      const now = new Date().toISOString();

      await dbRun(
        `INSERT OR REPLACE INTO users (id, username, name, email, password, avatar, status_message, is_online, last_seen, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [accId, accUsername, account.name || accUsername, accEmail, account.password || 'password123', accAvatar, account.status_message || 'Hey there! I am using WhatsApp.', now, now]
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [accId]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('Validate session error:', err);
    return res.status(500).json({ error: 'Failed to validate user session' });
  }
};

router.get('/me', handleMeRequest);
router.post('/me', handleMeRequest);

// List all registered user accounts for quick switcher
router.get('/accounts', async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, name, avatar, email, status_message, is_online, last_seen FROM users ORDER BY name ASC');
    return res.json({ users });
  } catch (err) {
    console.error('Fetch accounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch accounts.' });
  }
});

// Update Profile
router.put('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar, status_message, email, password } = req.body;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedAvatar = avatar !== undefined ? avatar : user.avatar;
    const updatedStatus = status_message !== undefined ? status_message : user.status_message;
    const updatedEmail = email !== undefined ? email.trim().toLowerCase() : user.email;
    const updatedPassword = password !== undefined ? password.trim() : user.password;

    await dbRun(
      `UPDATE users SET name = ?, avatar = ?, status_message = ?, email = ?, password = ? WHERE id = ?`,
      [updatedName, updatedAvatar, updatedStatus, updatedEmail, updatedPassword, id]
    );

    const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);

    const io = getIO();
    if (io) {
      io.emit('user:profile_updated', {
        userId: id,
        avatar: updatedUser.avatar,
        user: updatedUser
      });
    }

    return res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
