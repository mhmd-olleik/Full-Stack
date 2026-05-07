import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { BsPeopleFill } from "react-icons/bs";

export function getChatName(chat, currentUserId) {
  if (chat.isGroupChat) return chat.chatName;
  const other = chat.users?.find((u) => u._id !== currentUserId);
  return other?.name || "Unknown";
}

export function getChatAvatar(chat, currentUserId) {
  if (chat.isGroupChat) return null;
  const other = chat.users?.find((u) => u._id !== currentUserId);
  return other?.avatar || null;
}

export function getOtherUser(chat, currentUserId) {
  return chat.users?.find((u) => u._id !== currentUserId);
}

export function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
}

export function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function ChatListItem({ chat, isActive, onClick }) {
  const { user } = useAuth();
  const { onlineUsers, typingUsers, unreadCounts } = useChat();

  const name = getChatName(chat, user._id);
  const avatar = getChatAvatar(chat, user._id);
  const otherUser = getOtherUser(chat, user._id);
  const isOnline = !chat.isGroupChat && otherUser && onlineUsers.has(otherUser._id?.toString());
  const isTyping = typingUsers[chat._id];
  const latest = chat.latestMessage;
  const unread = isActive ? 0 : (unreadCounts?.[chat._id] || 0);

  const previewText = () => {
    if (isTyping) return "typing...";
    if (!latest) return "No messages yet";
    if (latest.deletedForEveryone) return "🚫 This message was deleted";
    if (latest.isVoiceNote) return "🎙️ Voice message";
    if (latest.fileUrl) {
      if (latest.fileType === "image") return "📷 Photo";
      if (latest.fileType === "video") return "🎬 Video";
      if (latest.fileType === "audio") return "🔊 Audio";
      return "📎 File";
    }
    if (latest.isForwarded) {
      const prefix = latest.sender?._id === user._id ? "You: " : "";
      return prefix + "↗️ " + (latest.content || "Forwarded");
    }
    const prefix = latest.sender?._id === user._id ? "You: " : "";
    return prefix + (latest.content || "");
  };

  const time = latest?.createdAt ? formatMsgTime(latest.createdAt) : "";

  return (
    <div
      className={`chat-item ${isActive ? "active" : ""} ${unread > 0 ? "has-unread" : ""}`}
      onClick={onClick}
      id={`chat-item-${chat._id}`}
    >
      <div className="avatar-wrap">
        {chat.isGroupChat ? (
          <div className="avatar-group">
            <BsPeopleFill size={22} />
          </div>
        ) : (
          <img className="avatar" src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} />
        )}
        {!chat.isGroupChat && (
          <div className={isOnline ? "online-dot" : "offline-dot"} />
        )}
      </div>

      <div className="chat-item-body">
        <div className="chat-item-top">
          <span className="chat-item-name">{name}</span>
          <span className="chat-item-time">{time}</span>
        </div>
        <div className="chat-item-bottom">
          <span
            className="chat-item-preview"
            style={isTyping ? { color: "var(--accent)", fontStyle: "normal" } : {}}
          >
            {previewText()}
          </span>
          {unread > 0 && (
            <span className="unread-badge" aria-label={`${unread} unread messages`}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
