const Message = require("../models/Message");
const Chat = require("../models/Chat");
const cloudinary = require("../config/cloudinary");
const { sendPushToUsers } = require("./pushController");

// ── Helper: populate a full message ──────────────────────────
const populateMessage = (query) =>
  query
    .populate("sender", "name avatar email")
    .populate({ path: "chat", populate: { path: "users", select: "_id" } })
    .populate({ path: "replyTo", populate: { path: "sender", select: "name avatar" } })
    .populate("reactions.user", "name avatar");

// @route POST /api/messages
const sendMessage = async (req, res) => {
  const { content, chatId, fileUrl, fileType, fileName, replyTo, isVoiceNote, audioDuration, isForwarded, linkPreview } = req.body;
  if (!chatId) return res.status(400).json({ message: "chatId required" });
  if (!content && !fileUrl) return res.status(400).json({ message: "content or file required" });

  const msgData = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    fileUrl: fileUrl || "",
    fileType: fileType || "",
    fileName: fileName || "",
    readBy: [req.user._id],
  };

  // Optional fields
  if (replyTo) msgData.replyTo = replyTo;
  if (isVoiceNote) { msgData.isVoiceNote = true; msgData.audioDuration = audioDuration || 0; }
  if (isForwarded) msgData.isForwarded = true;
  if (linkPreview && linkPreview.url) msgData.linkPreview = linkPreview;

  const message = await Message.create(msgData);
  await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

  const fullMsg = await populateMessage(Message.findById(message._id));

  // 🔔 Send Web Push to all other chat members (works even when browser is closed)
  try {
    const otherUserIds = fullMsg.chat.users
      .map((u) => u._id)
      .filter((id) => id.toString() !== req.user._id.toString());

    if (otherUserIds.length > 0) {
      let preview = "New message";
      if (fullMsg.isVoiceNote) preview = "🎙️ Voice message";
      else if (fullMsg.content) preview = fullMsg.content.slice(0, 80);
      else if (fullMsg.fileUrl) preview = fullMsg.fileType === "image" ? "📷 Photo" : fullMsg.fileType === "video" ? "🎬 Video" : "📎 File";

      await sendPushToUsers(otherUserIds, {
        title: req.user.name,
        body: preview,
        icon: req.user.avatar || "/icon-192.png",
        badge: "/icon-192.png",
        tag: `chat-${chatId}`,
        data: { chatId },
      });
    }
  } catch (pushErr) {
    console.error("Push notification error:", pushErr.message);
  }

  res.status(201).json(fullMsg);
};

// @route GET /api/messages/:chatId
const getMessages = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user._id;

  const messages = await Message.find({
    chat: req.params.chatId,
    deletedFor: { $ne: userId },  // Hide messages deleted for this user
  })
    .populate("sender", "name avatar email")
    .populate("chat")
    .populate({ path: "replyTo", populate: { path: "sender", select: "name avatar" } })
    .populate("reactions.user", "name avatar")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  res.json(messages.reverse());
};

// @route PUT /api/messages/read/:chatId
const markAsRead = async (req, res) => {
  await Message.updateMany(
    { chat: req.params.chatId, readBy: { $ne: req.user._id } },
    { $push: { readBy: req.user._id } }
  );
  res.json({ message: "Marked as read" });
};

// @route GET /api/messages/unread-counts
// Returns { chatId: unreadCount } for the current user
const getUnreadCounts = async (req, res) => {
  const userId = req.user._id;
  const counts = await Message.aggregate([
    { $match: { sender: { $ne: userId }, readBy: { $ne: userId }, deletedFor: { $ne: userId }, deletedForEveryone: { $ne: true } } },
    { $group: { _id: "$chat", count: { $sum: 1 } } },
  ]);
  const result = {};
  counts.forEach(({ _id, count }) => { result[_id.toString()] = count; });
  res.json(result);
};

// @route POST /api/messages/upload
const uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "chatapp",
    });
    // Determine file type
    let fileType = result.resource_type; // "image", "video", "raw"
    if (fileType === "raw") fileType = "document";
    // Check if it's audio
    if (req.file.mimetype && req.file.mimetype.startsWith("audio")) fileType = "audio";

    res.json({
      url: result.secure_url,
      fileType,
      duration: result.duration || 0, // Cloudinary returns duration for audio/video
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 😍 REACTIONS
// @route POST /api/messages/:messageId/react
// ═══════════════════════════════════════════════════════════════
const reactToMessage = async (req, res) => {
  const { emoji } = req.body;
  const { messageId } = req.params;
  if (!emoji) return res.status(400).json({ message: "emoji required" });

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  // Check if user already reacted with this emoji — toggle off
  const existingIndex = message.reactions.findIndex(
    (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
  );

  if (existingIndex !== -1) {
    message.reactions.splice(existingIndex, 1); // Remove reaction
  } else {
    // Remove any existing reaction by this user (one reaction per user)
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );
    message.reactions.push({ emoji, user: req.user._id });
  }

  await message.save();

  const fullMsg = await populateMessage(Message.findById(messageId));
  res.json(fullMsg);
};

// ═══════════════════════════════════════════════════════════════
// 🗑️ DELETE MESSAGE
// @route DELETE /api/messages/:messageId
// Body: { deleteForEveryone: true/false }
// ═══════════════════════════════════════════════════════════════
const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { deleteForEveryone } = req.body;

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  if (deleteForEveryone) {
    // Only sender can delete for everyone
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the sender can delete for everyone" });
    }
    // Must be within 1 hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < hourAgo) {
      return res.status(400).json({ message: "Can only delete for everyone within 1 hour" });
    }
    message.deletedForEveryone = true;
    message.content = "";
    message.fileUrl = "";
    message.fileName = "";
    message.linkPreview = undefined;
    await message.save();

    res.json({ messageId, deletedForEveryone: true, chatId: message.chat.toString() });
  } else {
    // Delete for me only
    if (!message.deletedFor.includes(req.user._id)) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }
    res.json({ messageId, deletedForMe: true });
  }
};

// ═══════════════════════════════════════════════════════════════
// ↗️ FORWARD MESSAGE
// @route POST /api/messages/forward
// Body: { messageId, targetChatId }
// ═══════════════════════════════════════════════════════════════
const forwardMessage = async (req, res) => {
  const { messageId, targetChatId } = req.body;
  if (!messageId || !targetChatId) return res.status(400).json({ message: "messageId and targetChatId required" });

  const original = await Message.findById(messageId);
  if (!original) return res.status(404).json({ message: "Message not found" });

  const forwarded = await Message.create({
    sender: req.user._id,
    content: original.content,
    chat: targetChatId,
    fileUrl: original.fileUrl,
    fileType: original.fileType,
    fileName: original.fileName,
    isVoiceNote: original.isVoiceNote,
    audioDuration: original.audioDuration,
    linkPreview: original.linkPreview,
    isForwarded: true,
    readBy: [req.user._id],
  });

  await Chat.findByIdAndUpdate(targetChatId, { latestMessage: forwarded._id });

  const fullMsg = await populateMessage(Message.findById(forwarded._id));
  res.status(201).json(fullMsg);
};

// ═══════════════════════════════════════════════════════════════
// 🔍 SEARCH MESSAGES
// @route GET /api/messages/search/:chatId?q=searchText
// ═══════════════════════════════════════════════════════════════
const searchMessages = async (req, res) => {
  const { q } = req.query;
  const { chatId } = req.params;
  if (!q || !q.trim()) return res.json([]);

  const messages = await Message.find({
    chat: chatId,
    content: { $regex: q, $options: "i" },
    deletedForEveryone: { $ne: true },
    deletedFor: { $ne: req.user._id },
  })
    .populate("sender", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(messages.reverse());
};

// ═══════════════════════════════════════════════════════════════
// 🔗 LINK PREVIEW
// @route POST /api/messages/link-preview
// Body: { url }
// ═══════════════════════════════════════════════════════════════
const fetchLinkPreview = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "url required" });

  try {
    const { getLinkPreview } = await import("link-preview-js");
    const data = await getLinkPreview(url, {
      timeout: 5000,
      headers: { "user-agent": "Mozilla/5.0 (compatible; ChatApp/1.0)" },
    });

    res.json({
      url: data.url || url,
      title: data.title || "",
      description: data.description || "",
      image: (data.images && data.images[0]) || data.image || "",
    });
  } catch (err) {
    // Return empty preview on failure — don't block sending
    res.json({ url, title: "", description: "", image: "" });
  }
};

module.exports = {
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
};
