import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat, requestNotificationPermission } from "../../context/ChatContext";
import { subscribeToPushNotifications } from "../../services/pushUtils";
import ChatListItem from "./ChatListItem";
import GroupModal from "../shared/GroupModal";
import ProfileDrawer from "../shared/ProfileDrawer";
import AdminDashboard from "../Admin/AdminDashboard";
import AddByChatId from "../shared/AddByChatId";
import api from "../../services/api";
import toast from "react-hot-toast";
import { IoMdChatbubbles } from "react-icons/io";
import { BsPeopleFill, BsSearch, BsClipboard2Check } from "react-icons/bs";
import { HiOutlineRefresh, HiOutlineLogout } from "react-icons/hi";
import { MdAdminPanelSettings, MdFingerprint } from "react-icons/md";
import { RiChatNewLine } from "react-icons/ri";
import { FiBell, FiBellOff, FiCheck } from "react-icons/fi";

export default function Sidebar({ onChatSelect, activeChatId }) {
  const { user, logout, token } = useAuth();
  const { chats, fetchChats, openChat, loadingChats, notifPermission, setNotifPermission } = useChat();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddById, setShowAddById] = useState(false);
  const searchTimer = useRef(null);

  const handleEnableNotifs = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      toast.success("Notifications enabled!");
      await subscribeToPushNotifications(token);
    } else if (result === "denied") {
      toast.error("Notifications blocked. Enable in browser settings.");
    }
  };

  useEffect(() => {
    if (notifPermission === "granted" && token) {
      subscribeToPushNotifications(token);
    }
  }, [notifPermission, token]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users?search=${val}`);
        setSearchResults(data);
      } catch { toast.error("Search failed"); }
      finally { setSearching(false); }
    }, 400);
  };

  const handleUserClick = async (userId) => {
    try {
      const { data: chat } = await api.post("/chats", { userId });
      setSearch(""); setSearchResults([]);
      await openChat(chat);
      onChatSelect?.(chat);
    } catch { toast.error("Failed to open chat"); }
  };

  const handleChatClick = async (chat) => {
    await openChat(chat);
    onChatSelect?.(chat);
  };

  const handleChatOpened = async (chat) => {
    await openChat(chat);
    onChatSelect?.(chat);
  };

  // Skeleton loading items
  const renderSkeletons = () => (
    Array.from({ length: 6 }).map((_, i) => (
      <div className="skeleton-chat-item" key={`skel-${i}`}>
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton-lines">
          <div className="skeleton skeleton-line skeleton-line--short" />
          <div className="skeleton skeleton-line skeleton-line--long" />
        </div>
      </div>
    ))
  );

  return (
    <>
      <div className="sidebar">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <IoMdChatbubbles size={22} />
            </div>
            <span className="sidebar-brand-text">ChatApp</span>
          </div>
          <div className="sidebar-actions">
            {user?.isAdmin && (
              <button className="icon-btn" title="Admin Dashboard" id="open-admin-btn"
                onClick={() => setShowAdmin(true)}>
                <MdAdminPanelSettings size={20} />
              </button>
            )}
            <button className="icon-btn" title="Add by Chat ID" id="add-by-chatid-btn"
              onClick={() => setShowAddById(true)}>
              <RiChatNewLine size={18} />
            </button>
            <button className="icon-btn" title="New Group" onClick={() => setShowGroupModal(true)}>
              <BsPeopleFill size={17} />
            </button>
            <button className="icon-btn" title="Profile" onClick={() => setShowProfile(true)}>
              <img
                className="icon-btn-avatar"
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                alt="me"
              />
            </button>
            <button
              className="icon-btn"
              title="Refresh chats"
              onClick={() => { fetchChats(); toast("Refreshed!", { duration: 1500, icon: "🔄" }); }}
            >
              <HiOutlineRefresh size={18} />
            </button>
            <button className="icon-btn" title="Logout" onClick={logout}>
              <HiOutlineLogout size={18} />
            </button>
          </div>
        </div>

        {/* ── My Chat ID bar ───────────────────────────────────── */}
        <div className="chatid-bar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="chatid-bar-label">My Chat ID</span>
            <span className="chatid-bar-value">#{user?.chatId}</span>
          </div>
          <button
            className="chatid-copy-btn"
            onClick={() => { navigator.clipboard.writeText(user?.chatId || ""); toast.success("Chat ID copied!"); }}
          >
            <BsClipboard2Check size={12} />
            Copy
          </button>
        </div>

        {/* ── Notification Banner ──────────────────────────────── */}
        {notifPermission !== "unsupported" && (
          <div
            className={`notif-banner ${
              notifPermission === "granted" ? "notif-banner--granted" :
              notifPermission === "denied" ? "notif-banner--denied" : "notif-banner--default"
            }`}
            onClick={notifPermission !== "granted" ? handleEnableNotifs : undefined}
          >
            <span className="notif-banner-icon">
              {notifPermission === "granted" ? <FiCheck size={18} color="#00e676" /> :
               notifPermission === "denied" ? <FiBellOff size={18} color="#ef4444" /> :
               <FiBell size={18} color="#ffb400" />}
            </span>
            <div className="notif-banner-text">
              <div className="notif-banner-title" style={{
                color: notifPermission === "granted" ? "#00e676" :
                       notifPermission === "denied" ? "#ef4444" : "#ffb400"
              }}>
                {notifPermission === "granted" ? "Notifications Enabled" :
                 notifPermission === "denied" ? "Notifications Blocked" : "Enable Notifications"}
              </div>
              <div className="notif-banner-subtitle">
                {notifPermission === "granted" ? "You'll receive message alerts" :
                 notifPermission === "denied" ? "Allow in browser Settings → Site Settings" :
                 "Tap to get message alerts"}
              </div>
            </div>
            {notifPermission !== "granted" && (
              <span className="notif-banner-arrow" style={{
                color: notifPermission === "denied" ? "#ef4444" : "#ffb400"
              }}>
                {notifPermission === "denied" ? "Fix →" : "Enable →"}
              </span>
            )}
          </div>
        )}

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="search-box">
          <div className="search-input-wrap">
            <span className="search-icon"><BsSearch size={14} /></span>
            <input
              type="text"
              placeholder="Search by name or Chat ID..."
              value={search}
              onChange={handleSearch}
              id="search-users-input"
            />
          </div>
        </div>

        {/* ── Search Results ──────────────────────────────────── */}
        {(searchResults.length > 0 || searching) && search && (
          <div className="user-search-results" style={{ margin: "0 16px 8px" }}>
            {searching && (
              <div style={{ padding: 12, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                Searching...
              </div>
            )}
            {searchResults.map((u) => (
              <div key={u._id} className="user-result-item" onClick={() => handleUserClick(u._id)}>
                <img className="avatar" src={u.avatar} alt={u.name} style={{ width: 36, height: 36 }} />
                <div>
                  <div className="user-result-name">{u.name}</div>
                  <div className="user-result-email">
                    {u.chatId ? `#${u.chatId}` : u.email}
                  </div>
                </div>
              </div>
            ))}
            {!searching && searchResults.length === 0 && (
              <div style={{ padding: 12, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                No users found
              </div>
            )}
          </div>
        )}

        {/* ── Chat List ────────────────────────────────────────── */}
        <div className="chat-list">
          {loadingChats && renderSkeletons()}
          {!loadingChats && chats.length === 0 && (
            <div className="no-chats">
              <div className="no-chats-icon">💬</div>
              <h3>No conversations yet</h3>
              <p>Tap the + button to add someone by Chat ID and start chatting</p>
            </div>
          )}
          {chats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={activeChatId === chat._id}
              onClick={() => handleChatClick(chat)}
            />
          ))}
        </div>

        {/* ── Admin quick bar ─────────────────────────────────── */}
        {user?.isAdmin && (
          <div className="admin-bar" onClick={() => setShowAdmin(true)}>
            <MdAdminPanelSettings size={16} />
            <span>Open Admin Dashboard</span>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      {showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} onCreated={() => { fetchChats(); setShowGroupModal(false); }} />}
      {showProfile && <ProfileDrawer onClose={() => setShowProfile(false)} />}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      {showAddById && <AddByChatId onChatOpened={handleChatOpened} onClose={() => setShowAddById(false)} />}
    </>
  );
}
