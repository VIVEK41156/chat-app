# 🟢 WhatsApp Real-Time Web & Mobile Application

A full-stack, real-time WhatsApp clone built with React (Vite, Tailwind CSS, Lucide Icons) and Node.js (Express, Socket.IO, SQLite, Nodemailer). 

Features **Email OTP verification (Gmail SMTP)**, **Custom Profile Pictures**, **24h WhatsApp Status/Stories with Live Views Tracker (👁️)**, **Customizable Chat Wallpapers**, **Disappearing Messages**, **Rich Attachments**, and **Mobile-Responsive WhatsApp Layout**.

---

## 📱 Mobile-First & Desktop Dual Experience
- **Mobile Smartphone View (< 640px)**:
  - Responsive single-window WhatsApp view with top header & WhatsApp Mobile bottom navigation bar (**Chats**, **Status**, **Friends**, **Requests**).
  - Tapping a conversation opens full-screen **ChatArea** with a smooth **Back Arrow (←)** to return to chats.
- **Desktop View (>= 640px)**:
  - Classic dual-pane WhatsApp Web layout (Sidebar on left, Conversation on right).
  - Built-in **Dual Simulator** mode to test 2 simultaneous users chatting and typing side-by-side in real time!

---

## 🌟 Core Feature Highlights

### 1. 🔐 Strong Email OTP Verification (Gmail SMTP)
- User registration is protected by 6-digit OTP codes sent via Gmail SMTP (`vivekparri41156@gmail.com`).
- 5-minute code expiration, brute-force protection, and verification before account activation.

### 2. 📷 Custom Profile Pictures
- Upload custom avatars directly from your local computer or phone.
- Instant real-time broadcast to all friends upon changing avatar.

### 3. ⭕ WhatsApp 24-Hour Status / Stories with Views Tracker
- **Status Feed**: "My Status" + Friends' updates with unread story rings.
- **Text & Media Stories**: Create text statuses with vibrant color palettes or upload photos/videos.
- **24-Hour Expiry**: Stored in SQLite with automatic 24-hour expiration.
- **Live Story Viewer**: Segmented timer progress bars, pause-on-hold, next/prev tap zones.
- **Eye Icon View Counter (👁️)**: Displays live view count. Status owners can open a bottom sheet to see exactly which friends viewed their status and at what time.

### 4. 💬 1-on-1 Real-Time Chat & Message Ticks
- **Message Delivery Status**:
  - Single Gray (`✓`): Message stored in SQLite DB.
  - Double Gray (`✓✓`): Delivered to online recipient.
  - Double Blue (`✓✓`): Recipient opened and read message.
- **Live Typing Indicator**: Real-time bidirectional typing indicator (`... is typing`) with auto debounce.
- **Online Presence**: Real-time green dot and "Last seen today at HH:mm".

### 5. 📎 Rich Media & Attachments
- Photos & Images with lightbox viewer.
- Videos with inline playback.
- Audio messages and Document downloads.

### 6. 🎨 Chat Wallpapers & Privacy
- Customizable chat background wallpapers: WhatsApp Doodle Dark, WhatsApp Classic Light, Emerald Forest, Midnight Navy, Royal Purple, Charcoal, or Custom Image URLs.
- **Disappearing Messages**: Set timer (30s demo, 1m, 24h, 7d, 90d) with periodic background purge.
- **Clear Chat**: Delete chat history from the database in 1 click.

---

## 🚀 Deployment Guide (Live on Vercel & Free Backend)

### Option A: 1-Click Frontend Deployment on Vercel
1. Push this repository to your GitHub account (already prepared with `vercel.json`).
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** ➔ Import this repository.
3. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://your-backend-service.onrender.com` (or your live backend URL)
4. Click **Deploy**!

---

### Option B: Free Continuous WebSocket Backend (Render / Railway / Fly.io)
Because Socket.IO requires persistent WebSockets for live instant messaging over long distances:
1. Go to [Render](https://render.com) or [Railway](https://railway.app).
2. Click **"New Web Service"** and select this repository.
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `PORT` = `5000`
   - `EMAIL_USER` = `vivekparri41156@gmail.com`
   - `EMAIL_PASS` = `kjxhoonggvdhdfyu`
   - `CLIENT_URL` = `https://your-app.vercel.app`
5. Deploy and copy your backend URL into your Vercel frontend `VITE_API_URL`.

---

## 💻 Local Development

### 1. Install & Start Both Frontend + Backend
```bash
# Install dependencies
npm run install-all

# Start everything
node start-all.js
```

- **Frontend App**: http://localhost:3000
- **Backend API**: http://localhost:5000
