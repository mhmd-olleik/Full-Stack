const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
  sendMessage,
  getMessages,
  markAsRead,
  uploadFile,
  getUnreadCounts,
  reactToMessage,
  deleteMessage,
  forwardMessage,
  searchMessages,
  fetchLinkPreview,
} = require("../controllers/messageController");

const upload = multer({ dest: "uploads/" });

// ── Static routes FIRST (before :chatId param) ──────────────
router.get("/unread-counts", protect, getUnreadCounts);
router.post("/upload", protect, upload.single("file"), uploadFile);
router.post("/forward", protect, forwardMessage);
router.post("/link-preview", protect, fetchLinkPreview);

// ── Parameterized routes ────────────────────────────────────
router.post("/", protect, sendMessage);
router.get("/search/:chatId", protect, searchMessages);
router.get("/:chatId", protect, getMessages);
router.put("/read/:chatId", protect, markAsRead);
router.post("/:messageId/react", protect, reactToMessage);
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;
