import { useState, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { BsCheck2, BsCheck2All, BsFileEarmark } from "react-icons/bs";
import MessageContextMenu from "./MessageContextMenu";
import AudioPlayer from "./AudioPlayer";
import LinkPreviewCard from "./LinkPreviewCard";
import toast from "react-hot-toast";

export default function MessageBubble({ message, showSenderName = false, onImageClick, highlightId }) {
  const { user } = useAuth();
  const { setReplyingTo, setForwardingMessage, reactToMessage, deleteMessage } = useChat();
  const isOwn = message.sender?._id === user._id || message.sender === user._id;
  const isRead = message.readBy?.length > 1;
  const [contextMenu, setContextMenu] = useState(null);
  const longPressTimer = useRef(null);
  const bubbleRef = useRef(null);

  const timeStr = message.createdAt
    ? format(typeof message.createdAt === "string" ? parseISO(message.createdAt) : message.createdAt, "HH:mm")
    : "";

  // ── Context menu handlers ──────────────────────────────────
  const openMenu = useCallback((x, y) => {
    setContextMenu({ x, y });
  }, []);

  const handleContextMenu = (e) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      openMenu(touch.clientX, touch.clientY);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleReply = () => setReplyingTo(message);
  const handleForward = () => setForwardingMessage(message);
  const handleReact = (emoji) => reactToMessage(message._id, emoji);
  const handleDelete = (forEveryone) => deleteMessage(message._id, forEveryone);
  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    }
  };

  // ── Deleted message ────────────────────────────────────────
  if (message.deletedForEveryone) {
    return (
      <div className={`message-wrap ${isOwn ? "outgoing" : "incoming"}`}>
        <div className="bubble bubble--deleted">
          <span className="deleted-message-text">🚫 This message was deleted</span>
          <div className="bubble-footer">
            <span className="bubble-time">{timeStr}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Group reactions by emoji ───────────────────────────────
  const reactionGroups = {};
  (message.reactions || []).forEach((r) => {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
    reactionGroups[r.emoji].push(r.user);
  });

  const isHighlighted = highlightId && message._id === highlightId;

  return (
    <div
      className={`message-wrap ${isOwn ? "outgoing" : "incoming"} ${isHighlighted ? "message-highlight" : ""}`}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      ref={bubbleRef}
      id={`msg-${message._id}`}
    >
      {showSenderName && !isOwn && (
        <div className="message-sender-name">{message.sender?.name}</div>
      )}

      {/* ↗️ Forwarded label */}
      {message.isForwarded && (
        <div className="forwarded-label">↗️ Forwarded</div>
      )}

      <div className="bubble">
        {/* ↩️ Reply preview */}
        {message.replyTo && (
          <div className="reply-preview" onClick={() => {
            const el = document.getElementById(`msg-${message.replyTo._id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}>
            <div className="reply-preview-name">{message.replyTo.sender?.name || "User"}</div>
            <div className="reply-preview-text">
              {message.replyTo.isVoiceNote ? "🎙️ Voice message" :
               message.replyTo.fileUrl ? (message.replyTo.fileType === "image" ? "📷 Photo" : "📎 File") :
               message.replyTo.content?.slice(0, 100) || ""}
            </div>
          </div>
        )}

        {/* 🖼️ Image */}
        {message.fileUrl && message.fileType === "image" && (
          <img
            className="bubble-image"
            src={message.fileUrl}
            alt="shared"
            onClick={() => onImageClick?.(message.fileUrl)}
          />
        )}

        {/* 🎬 Video */}
        {message.fileUrl && message.fileType === "video" && (
          <div className="bubble-video-wrap">
            <video
              className="bubble-video"
              src={message.fileUrl}
              controls
              preload="metadata"
              playsInline
            />
          </div>
        )}

        {/* 🎙️ Voice Message */}
        {message.fileUrl && message.isVoiceNote && (
          <AudioPlayer
            src={message.fileUrl}
            duration={message.audioDuration}
            isVoice={true}
          />
        )}

        {/* 🔊 Audio file (not voice note) */}
        {message.fileUrl && message.fileType === "audio" && !message.isVoiceNote && (
          <div className="bubble-audio-wrap">
            <div className="bubble-audio-name">{message.fileName || "Audio"}</div>
            <AudioPlayer
              src={message.fileUrl}
              duration={message.audioDuration}
              isVoice={false}
            />
          </div>
        )}

        {/* 📄 Document / other file */}
        {message.fileUrl && message.fileType === "document" && (
          <a className="bubble-file" href={message.fileUrl} target="_blank" rel="noreferrer">
            <BsFileEarmark className="bubble-file-icon" />
            <span>{message.fileName || "File"}</span>
          </a>
        )}

        {/* 🔗 Link Preview */}
        {message.linkPreview && message.linkPreview.url && (
          <LinkPreviewCard preview={message.linkPreview} />
        )}

        {/* 💬 Text */}
        {message.content && <span className="bubble-text">{message.content}</span>}

        {/* Footer */}
        <div className="bubble-footer">
          <span className="bubble-time">{timeStr}</span>
          {isOwn && (
            <span className={`read-tick ${isRead ? "read" : ""}`}>
              {isRead ? <BsCheck2All size={16} /> : <BsCheck2 size={16} />}
            </span>
          )}
        </div>
      </div>

      {/* 😍 Reactions */}
      {Object.keys(reactionGroups).length > 0 && (
        <div className="reactions-container">
          {Object.entries(reactionGroups).map(([emoji, users]) => {
            const myReaction = users.some((u) => (u._id || u) === user._id);
            return (
              <button
                key={emoji}
                className={`reaction-pill ${myReaction ? "reaction-pill--mine" : ""}`}
                onClick={() => reactToMessage(message._id, emoji)}
                title={users.map((u) => u.name || "User").join(", ")}
              >
                <span>{emoji}</span>
                <span className="reaction-count">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={message}
          isOwn={isOwn}
          onClose={() => setContextMenu(null)}
          onReply={handleReply}
          onReact={handleReact}
          onForward={handleForward}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}
