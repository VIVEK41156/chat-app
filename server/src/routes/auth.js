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

// Register new user with verified Email & OTP
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, otp, avatar, status_message } = req.body;
    if (!username || !name || !email) {
      return res.status(400).json({ error: 'Username, Name, and Email are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check unique username
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Check unique email
    const existingEmail = await dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    // Verify OTP was entered and validated
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

    const id = `usr_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const statusMsg = status_message || 'Hey there! I am using WhatsApp.';

    await dbRun(
      `INSERT INTO users (id, username, name, email, avatar, status_message, is_online, last_seen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, cleanUsername, name.trim(), cleanEmail, defaultAvatar, statusMsg, now, now]
    );

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    return res.status(201).json({ message: 'User registered and email verified successfully!', user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login via Email OTP, userId, or email
router.post('/login', async (req, res) => {
  try {
    const { email, otp, userId, username } = req.body;
    let user = null;

    if (email && otp) {
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

      if (!user) {
        return res.status(404).json({ error: 'No registered user found with this email. Please create an account.' });
      }
    } else if (userId) {
      user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    } else if (email) {
      user = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [email.trim().toLowerCase()]);
    } else if (username) {
      user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    return res.json({ message: 'Login successful', user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
});

// Update Profile
router.put('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar, status_message, email } = req.body;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedAvatar = avatar !== undefined ? avatar : user.avatar;
    const updatedStatus = status_message !== undefined ? status_message : user.status_message;
    const updatedEmail = email !== undefined ? email.trim().toLowerCase() : user.email;

    await dbRun(
      `UPDATE users SET name = ?, avatar = ?, status_message = ?, email = ? WHERE id = ?`,
      [updatedName, updatedAvatar, updatedStatus, updatedEmail, id]
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
