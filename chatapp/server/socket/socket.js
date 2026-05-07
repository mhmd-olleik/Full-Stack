const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── In-memory set of online user IDs ──
const onlineUsers = new Set();

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select("-__v");
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Add to online set
    onlineUsers.add(userId);

    // Update user online status in DB
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // ✅ Send the FULL list of online users to the newly connected user
    socket.emit("online-users-list", Array.from(onlineUsers));

    // ✅ Tell everyone else this user just came online
    socket.broadcast.emit("user-online", { userId });

    // Join personal room
    socket.join(userId);

    // Join a chat room
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`📥 ${socket.user.name} joined chat: ${chatId}`);
    });

    // Leave a chat room
    socket.on("leave-chat", (chatId) => {
      socket.leave(chatId);
    });

    // Typing indicator
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("typing", { chatId, userId, userName: socket.user.name });
    });

    socket.on("stop-typing", ({ chatId }) => {
      socket.to(chatId).emit("stop-typing", { chatId, userId });
    });

    // New message — broadcast to everyone in the chat room except sender
    socket.on("new-message", (message) => {
      const chatId = message.chat._id || message.chat;
      socket.to(chatId).emit("message-received", message);
    });

    // Message read receipt
    socket.on("message-read", ({ chatId, userId: readerId }) => {
      socket.to(chatId).emit("message-read", { chatId, readerId });
    });

    // ═══════════════════════════════════════════════════════════
    // 😍 Reaction — broadcast to chat room
    // ═══════════════════════════════════════════════════════════
    socket.on("message-reaction", (data) => {
      // data: { chatId, messageId, reactions (full array) }
      socket.to(data.chatId).emit("message-reaction", data);
    });

    // ═══════════════════════════════════════════════════════════
    // 🗑️ Message deleted for everyone — broadcast to chat room
    // ═══════════════════════════════════════════════════════════
    socket.on("message-deleted", (data) => {
      // data: { chatId, messageId, deletedForEveryone }
      socket.to(data.chatId).emit("message-deleted", data);
    });

    // ═══════════════════════════════════════════════════════════
    // ↗️ Message forwarded — broadcast to target chat room
    // ═══════════════════════════════════════════════════════════
    socket.on("message-forwarded", (message) => {
      const chatId = message.chat._id || message.chat;
      socket.to(chatId).emit("message-received", message);
    });

    // Disconnect
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      const now = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now });
      socket.broadcast.emit("user-offline", { userId, lastSeen: now });
      console.log(`❌ User disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = setupSocket;
