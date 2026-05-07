const mongoose = require("mongoose");

// Generate a unique 7-digit numeric Chat ID
function generateChatId() {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    googleId: { type: String, unique: true, sparse: true },
    avatar: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.email}`;
      },
    },
    about: { type: String, default: "Hey there! I am using ChatApp." },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    // 🆔 Unique Chat ID — like a phone number, shared to start chats
    chatId: {
      type: String,
      unique: true,
      default: generateChatId,
    },
    // Whether user has completed onboarding (set their display name)
    onboardingDone: { type: Boolean, default: false },
    // NOTE: No IP, GPS, location, or MAC fields — privacy by design
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
