# 💬 ChatApp — WhatsApp-like Real-time Chat

A full-stack, production-ready chat application with **Google Login**, **real-time messaging**, **group chats**, and **file sharing** — deployed **100% for free**.

## ✨ Features

- 🔐 **Google OAuth Login** — one-click sign-in
- ⚡ **Real-time messaging** via Socket.IO
- 👥 **Group chats** — create, add/remove members
- 🟢 **Online/offline status** — live indicators
- ✍️ **Typing indicators** — "user is typing..."
- ✓✓ **Read receipts** — blue double ticks
- 📷 **Image & file sharing** via Cloudinary
- 😊 **Emoji picker**
- 🔔 **Toast notifications**
- 📱 **Fully responsive** — mobile + desktop

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (free) |
| Real-time | Socket.IO |
| Auth | Google OAuth 2.0 + JWT |
| Media | Cloudinary (free) |
| Hosting | Render.com (free) |

---

## 🚀 Quick Setup

### Step 1 — Google OAuth Setup (FREE)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add Authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://your-chatapp-client.onrender.com` (production)
6. Add Authorized redirect URIs:
   - `http://localhost:5173`
   - `https://your-chatapp-client.onrender.com`
7. Copy your **Client ID** — you'll need it

### Step 2 — MongoDB Atlas Setup (FREE)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database)
2. Create a free account → **Build a Database** → **M0 Free**
3. Create a database user (save username + password)
4. Under **Network Access** → Add IP Address → `0.0.0.0/0` (allow all)
5. Under **Clusters** → Connect → **Connect your application**
6. Copy the connection string — replace `<password>` with your password
7. Your MONGO_URI looks like: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority`

### Step 3 — Cloudinary Setup (FREE, optional)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. From Dashboard, copy: **Cloud Name**, **API Key**, **API Secret**

### Step 4 — Local Development

```bash
# Clone / navigate to project
cd chatapp

# ── Backend ──────────────────────────
cd server
npm install

# Create .env file
cp .env.example .env
# Fill in your values in .env

npm run dev        # Starts on http://localhost:5000

# ── Frontend (new terminal) ──────────
cd ../client
npm install

# Create .env file
cp .env.example .env
# Fill VITE_GOOGLE_CLIENT_ID in .env

npm run dev        # Starts on http://localhost:5173
```

### Server `.env` file:
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=any_random_long_string_here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
PORT=5000
```

### Client `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## ☁️ Deploy to Render.com (FREE)

### Step 1 — Push to GitHub
```bash
cd chatapp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/chatapp.git
git push -u origin main
```

### Step 2 — Deploy Backend

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add Environment Variables (from your `.env`):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CLIENT_URL` = `https://chatapp-client.onrender.com` *(your frontend URL)*
5. Click **Create Web Service**
6. Copy your backend URL: `https://chatapp-server.onrender.com`

### Step 3 — Deploy Frontend

1. Go to **New** → **Static Site**
2. Connect same GitHub repository
3. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL` = `https://chatapp-server.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://chatapp-server.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = your Google Client ID
5. Click **Create Static Site**

### Step 4 — Update Google OAuth
Go back to Google Cloud Console → your OAuth Client → add your Render.com frontend URL to **Authorized JavaScript origins**.

---

## 📁 Project Structure

```
chatapp/
├── server/                  # Backend
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   └── cloudinary.js    # File upload config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── messageController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js          # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Chat.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── message.js
│   │   └── user.js
│   ├── socket/
│   │   └── socket.js        # Real-time events
│   ├── .env.example
│   ├── package.json
│   └── server.js            # Entry point
│
├── client/                  # Frontend
│   ├── public/
│   │   └── _redirects       # Render SPA routing
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   └── LoginPage.jsx
│   │   │   ├── Chat/
│   │   │   │   ├── ChatHeader.jsx
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   └── MessageBubble.jsx
│   │   │   ├── Sidebar/
│   │   │   │   ├── ChatListItem.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── shared/
│   │   │       ├── GroupModal.jsx
│   │   │       └── ProfileDrawer.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ChatContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── render.yaml              # Render Blueprint
├── .gitignore
└── README.md
```

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 Free (512MB) | **$0** |
| Render Backend | Free Web Service | **$0** |
| Render Frontend | Free Static Site | **$0** |
| Cloudinary | Free (25GB) | **$0** |
| Google OAuth | Free | **$0** |
| **Total** | | **$0/month** |

> ⚠️ **Note**: Render free tier web services sleep after 15 min of inactivity (first request takes ~30s to wake up). Upgrade to $7/mo for always-on.

---

## 🧪 Test Locally

1. Open `http://localhost:5173` in **two different browsers** (or incognito)
2. Sign in with a different Google account on each
3. Search for the other user → click → start chatting
4. See typing indicators, read receipts, online status in real-time!
