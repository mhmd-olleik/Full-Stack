import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { MdFingerprint } from "react-icons/md";
import { FiX } from "react-icons/fi";
import { IoChatbubbleEllipses } from "react-icons/io5";

/**
 * AddByChatId — lets a user find someone by their 7-digit Chat ID
 * and start a conversation, just like WhatsApp phone numbers.
 */
export default function AddByChatId({ onChatOpened, onClose }) {
  const [chatId, setChatId] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState(false);

  const handleSearch = async () => {
    const id = chatId.replace("#", "").trim();
    if (!id || id.length < 6) { toast.error("Enter a valid 7-digit Chat ID"); return; }
    setSearching(true);
    setFoundUser(null);
    try {
      const { data } = await api.get(`/users/find/${id}`);
      setFoundUser(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "User not found");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!foundUser) return;
    setOpening(true);
    try {
      const { data: chat } = await api.post("/chats", { userId: foundUser._id });
      toast.success(`Chat opened with ${foundUser.name}!`);
      onChatOpened?.(chat);
      onClose?.();
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <MdFingerprint size={22} style={{ color: "var(--accent)" }} />
            Add by Chat ID
          </h2>
          <button className="modal-close" onClick={onClose}><FiX size={18} /></button>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
          Ask the person to share their <strong style={{ color: "var(--accent)" }}>Chat ID</strong> with you,
          then enter it below to start chatting.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            id="chatid-input"
            className="form-input"
            placeholder="Enter 7-digit Chat ID"
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value.replace(/[^0-9]/g, "").slice(0, 7));
              setFoundUser(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={7}
            style={{ flex: 1, letterSpacing: "0.1em", fontSize: 18, fontWeight: 700 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={searching || chatId.length < 6}
            style={{ flexShrink: 0, padding: "10px 18px" }}
          >
            {searching ? "..." : "Find"}
          </button>
        </div>

        {/* Found User Card */}
        {foundUser && (
          <div className="found-user-card">
            <img className="found-user-avatar" src={foundUser.avatar} alt={foundUser.name} />
            <div style={{ flex: 1 }}>
              <div className="found-user-name">{foundUser.name}</div>
              <div className="found-user-chatid">Chat ID: #{foundUser.chatId}</div>
              <div className="found-user-about">{foundUser.about}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {foundUser && (
            <button
              id="start-chat-btn"
              className="btn btn-primary"
              onClick={handleStartChat}
              disabled={opening}
            >
              <IoChatbubbleEllipses size={16} />
              {opening ? "Opening..." : `Chat with ${foundUser.name}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
