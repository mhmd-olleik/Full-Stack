const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, default: "" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fileUrl: { type: String, default: "" },
    fileType: { type: String, enum: ["image", "video", "document", "audio", ""], default: "" },
    fileName: { type: String, default: "" },

    // 🎙️ Voice message
    isVoiceNote: { type: Boolean, default: false },
    audioDuration: { type: Number, default: 0 },

    // ↩️ Reply to message
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },

    // 😍 Reactions
    reactions: [{
      emoji: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    }],

    // 🗑️ Delete
    deletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ↗️ Forwarded
    isForwarded: { type: Boolean, default: false },

    // 🔗 Link preview
    linkPreview: {
      url: { type: String, default: "" },
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      image: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Index for message search
messageSchema.index({ content: "text" });

module.exports = mongoose.model("Message", messageSchema);
