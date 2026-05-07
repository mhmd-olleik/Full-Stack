import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { getChatName, getChatAvatar } from "../Sidebar/ChatListItem";
import { BsPeopleFill, BsSearch } from "react-icons/bs";
import { FiX } from "react-icons/fi";
import { IoSend } from "react-icons/io5";

export default function ForwardModal({ message, onClose }) {
  const { user } = useAuth();
  const { chats, forwardMessage } = useChat();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(null);

  const filtered = chats.filter((c) => {
    if (!search.trim()) return true;
    const name = getChatName(c, user._id);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async (chatId) => {
    setSending(chatId);
    await forwardMessage(message._id, chatId);
    setSending(null);
    onClose();
  };

  // Preview of forwarded content
  const previewText = message.isVoiceNote
    ? "🎙️ Voice message"
    : message.fileUrl
      ? message.fileType === "image" ? "📷 Photo" : message.fileType === "video" ? "🎬 Video" : `📎 ${message.fileName || "File"}`
      : message.content?.slice(0, 100) || "";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal forward-modal">
        {/* Header */}
        <div className="forward-modal-header">
          <h3>Forward message</h3>
          <button className="icon-btn" onClick={onClose}><FiX size={20} /></button>
        </div>

        {/* Message Preview */}
        <div className="forward-preview">
          <div className="forward-preview-label">↗️ Forwarding:</div>
          <div className="forward-preview-text">{previewText}</div>
        </div>

        {/* Search */}
        <div className="forward-search">
          <div className="search-input-wrap">
            <span className="search-icon"><BsSearch size={14} /></span>
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="forward-chat-list">
          {filtered.map((chat) => {
            const name = getChatName(chat, user._id);
            const avatar = getChatAvatar(chat, user._id);
            const isSending = sending === chat._id;

            return (
              <div key={chat._id} className="forward-chat-item">
                <div className="avatar-wrap" style={{ flexShrink: 0 }}>
                  {chat.isGroupChat ? (
                    <div className="avatar-group" style={{ width: 40, height: 40 }}>
                      <BsPeopleFill size={18} />
                    </div>
                  ) : (
                    <img className="avatar" src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} style={{ width: 40, height: 40 }} />
                  )}
                </div>
                <div className="forward-chat-name">{name}</div>
                <button
                  className="forward-send-btn"
                  onClick={() => handleForward(chat._id)}
                  disabled={isSending}
                >
                  {isSending ? (
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  ) : (
                    <IoSend size={16} />
                  )}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
              No chats found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
