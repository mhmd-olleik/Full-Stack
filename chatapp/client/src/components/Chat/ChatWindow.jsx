import { useEffect, useRef, useState, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import VoiceRecorder from "./VoiceRecorder";
import MessageSearch from "./MessageSearch";
import FilePreviewModal from "../shared/FilePreviewModal";
import ForwardModal from "../shared/ForwardModal";
import { formatDateSeparator } from "../Sidebar/ChatListItem";
import api from "../../services/api";
import toast from "react-hot-toast";
import { IoMdChatbubbles } from "react-icons/io";
import { BsEmojiSmile, BsPaperclip, BsMicFill } from "react-icons/bs";
import { IoSend } from "react-icons/io5";
import { FiX } from "react-icons/fi";

// ── URL detection regex ──────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s]+/;

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const {
    activeChat, messages, loadingMessages, sendMessage,
    emitTyping, emitStopTyping, typingUsers,
    replyingTo, setReplyingTo,
    forwardingMessage, setForwardingMessage,
  } = useChat();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // File preview modal
  const [showSearch, setShowSearch] = useState(false);
  const [highlightMsgId, setHighlightMsgId] = useState(null);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  // ── Send text message (with optional link preview) ─────────
  const handleSend = async () => {
    if ((!text.trim()) || !activeChat) return;
    emitStopTyping(activeChat._id);

    const messageText = text.trim();
    setText("");
    textareaRef.current?.focus();

    // Check for URL and fetch link preview
    const urlMatch = messageText.match(URL_REGEX);
    let linkPreview = null;
    if (urlMatch) {
      try {
        const { data } = await api.post("/messages/link-preview", { url: urlMatch[0] });
        if (data.title || data.image) linkPreview = data;
      } catch { /* silent fail */ }
    }

    await sendMessage(messageText, "", "", "", linkPreview ? { linkPreview } : {});
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!activeChat) return;
    emitTyping(activeChat._id);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitStopTyping(activeChat._id), 1500);
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // ── File selection → open preview modal ────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File must be under 25MB"); return; }
    setPreviewFile(file);
    e.target.value = "";
  };

  // ── Send file from preview modal ──────────────────────────
  const handleFileSend = async (file, caption) => {
    if (!activeChat) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let fileType = data.fileType;
      if (file.type?.startsWith("image/")) fileType = "image";
      else if (file.type?.startsWith("video/")) fileType = "video";
      else if (file.type?.startsWith("audio/")) fileType = "audio";

      await sendMessage(caption || "", data.url, fileType, file.name);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setPreviewFile(null);
    }
  };

  // ── Send voice message ────────────────────────────────────
  const handleVoiceSend = async (audioBlob, duration) => {
    if (!activeChat) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");
      const { data } = await api.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await sendMessage("", data.url, "audio", "Voice message", {
        isVoiceNote: true,
        audioDuration: duration,
      });
    } catch {
      toast.error("Voice message failed");
    } finally {
      setUploading(false);
      setShowVoiceRecorder(false);
    }
  };

  // ── Jump to message (for search) ──────────────────────────
  const handleJumpToMessage = useCallback((msgId) => {
    setHighlightMsgId(msgId);
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightMsgId(null), 2000);
    }
  }, []);

  // Group messages by date for separators
  const messageGroups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateStr = msg.createdAt ? formatDateSeparator(msg.createdAt) : null;
    if (dateStr && dateStr !== lastDate) {
      messageGroups.push({ type: "separator", label: dateStr });
      lastDate = dateStr;
    }
    messageGroups.push({ type: "message", data: msg });
  });

  const isTyping = activeChat && typingUsers[activeChat._id];
  const hasText = text.trim().length > 0;

  if (!activeChat) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
          <div className="no-chat-icon">
            <IoMdChatbubbles size={48} />
          </div>
          <h2>Welcome to ChatApp</h2>
          <p>Select a conversation or search for someone to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window" style={{ position: "relative" }}>
      <ChatHeader onBack={onBack} onSearchOpen={() => setShowSearch(true)} />

      {/* 🔍 Message Search Bar */}
      {showSearch && (
        <MessageSearch
          chatId={activeChat._id}
          onClose={() => setShowSearch(false)}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      <div className="messages-area" id="messages-area">
        {loadingMessages && (
          <div className="messages-loading"><div className="spinner" /></div>
        )}

        {!loadingMessages && messageGroups.map((item, i) =>
          item.type === "separator" ? (
            <div className="date-separator" key={`sep-${i}`}>
              <span>{item.label}</span>
            </div>
          ) : (
            <MessageBubble
              key={item.data._id || i}
              message={item.data}
              showSenderName={activeChat.isGroupChat}
              onImageClick={(url) => setLightboxImg(url)}
              highlightId={highlightMsgId}
            />
          )
        )}

        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ↩️ Reply Bar */}
      {replyingTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <div className="reply-bar-name">{replyingTo.sender?.name || "User"}</div>
            <div className="reply-bar-text">
              {replyingTo.isVoiceNote ? "🎙️ Voice message" :
               replyingTo.fileUrl ? (replyingTo.fileType === "image" ? "📷 Photo" : "📎 File") :
               replyingTo.content?.slice(0, 80) || ""}
            </div>
          </div>
          <button className="reply-bar-close" onClick={() => setReplyingTo(null)}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploading && (
        <div className="upload-preview">
          <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          <span>Uploading...</span>
        </div>
      )}

      {/* Click-outside overlay for emoji picker */}
      {showEmoji && (
        <div className="emoji-overlay" onClick={() => setShowEmoji(false)} />
      )}

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="emoji-picker-container">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            width={300}
            height={380}
          />
        </div>
      )}

      {/* Input Bar / Voice Recorder */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        <div className="message-input-bar">
          <div className="input-actions">
            <button className="icon-btn" onClick={() => setShowEmoji((p) => !p)} title="Emoji">
              <BsEmojiSmile size={20} />
            </button>
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
              <BsPaperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.zip,.rar,.txt,.xls,.xlsx,.ppt,.pptx"
              style={{ display: "none" }}
              onChange={handleFileChange}
              id="file-upload-input"
            />
          </div>

          <div className="message-input-wrap">
            <textarea
              ref={textareaRef}
              className="message-textarea"
              placeholder="Type a message..."
              value={text}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              rows={1}
              id="message-input"
            />
          </div>

          {hasText ? (
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={uploading}
              id="send-message-btn"
            >
              <IoSend size={20} />
            </button>
          ) : (
            <button
              className="send-btn mic-btn"
              onClick={() => setShowVoiceRecorder(true)}
              title="Voice message"
              id="voice-message-btn"
            >
              <BsMicFill size={20} />
            </button>
          )}
        </div>
      )}

      {/* 🖼️ File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onSend={handleFileSend}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* ↗️ Forward Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <img className="lightbox-img" src={lightboxImg} alt="Preview" />
        </div>
      )}
    </div>
  );
}
