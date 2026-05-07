require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const setupSocket = require("./socket/socket");
const privacyMiddleware = require("./middleware/privacy");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
setupSocket(io);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 🔒 Privacy — strip real IPs, block geolocation, set security headers
app.use(privacyMiddleware);

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/users",    require("./routes/user"));
app.use("/api/chats",    require("./routes/chat"));
app.use("/api/messages", require("./routes/message"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/push",     require("./routes/push"));   // 🔔 Web Push

// Health check
app.get("/", (req, res) => res.json({ status: "ChatApp API running 🚀", privacy: "IP/Location never stored" }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

