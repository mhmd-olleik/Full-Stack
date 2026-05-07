import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import "./AdminDashboard.css";

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ "--accent-color": color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

// ── Mini Bar Chart ────────────────────────────────────────────
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="chart-empty">No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div className="bar-col" key={d._id}>
          <div className="bar-fill" style={{ height: `${(d.count / max) * 100}%` }} />
          <div className="bar-label">{d._id.slice(5)}</div>
          <div className="bar-count">{d.count}</div>
        </div>
      ))}
    </div>
  );
};

// ── Main Admin Dashboard ──────────────────────────────────────
export default function AdminDashboard({ onClose }) {
  const [tab, setTab] = useState("stats"); // stats | users | chats | privacy
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [chats, setChats] = useState([]);
  const [totalChats, setTotalChats] = useState(0);
  const [chatPage, setChatPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Fetch Stats
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch (e) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Users
  const fetchUsers = useCallback(async (page = 1, search = "") => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?page=${page}&limit=10&search=${search}`);
      setUsers(data.users);
      setTotalUsers(data.total);
      setUserPages(data.pages);
      setUserPage(data.page);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Chats
  const fetchChats = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/chats?page=${page}&limit=10`);
      setChats(data.chats);
      setTotalChats(data.total);
      setChatPage(data.page);
    } catch {
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "stats") fetchStats();
    if (tab === "users") fetchUsers(1, "");
    if (tab === "chats") fetchChats(1);
  }, [tab]);

  // ── User Actions
  const handleBan = async (userId, isBanned) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/ban`);
      toast.success(data.message);
      fetchUsers(userPage, userSearch);
    } catch { toast.error("Action failed"); }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/makeAdmin`);
      toast.success(data.message);
      fetchUsers(userPage, userSearch);
    } catch { toast.error("Action failed"); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("User deleted");
      fetchUsers(userPage, userSearch);
      fetchStats();
    } catch { toast.error("Delete failed"); }
  };

  const handleUserSearch = (e) => {
    setUserSearch(e.target.value);
    fetchUsers(1, e.target.value);
  };

  // ── Render
  return (
    <div className="admin-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-panel">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-brand">
            <span className="admin-icon">🛡️</span>
            <div>
              <div className="admin-title">Admin Dashboard</div>
              <div className="admin-subtitle">ChatApp Control Panel</div>
            </div>
          </div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {[
            { id: "stats",   icon: "📊", label: "Statistics" },
            { id: "users",   icon: "👥", label: "Users" },
            { id: "chats",   icon: "💬", label: "Chats" },
            { id: "privacy", icon: "🔒", label: "Privacy" },
          ].map((t) => (
            <button
              key={t.id}
              id={`admin-tab-${t.id}`}
              className={`admin-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="admin-content">
          {loading && (
            <div className="admin-loading"><div className="spinner" /></div>
          )}

          {/* ── STATS TAB ── */}
          {tab === "stats" && !loading && stats && (
            <div className="admin-stats">
              <div className="stat-grid">
                <StatCard icon="👤" label="Total Users"    value={stats.totalUsers}    color="#00e676" />
                <StatCard icon="🟢" label="Online Now"     value={stats.onlineUsers}   color="#00b8d4" />
                <StatCard icon="💬" label="Total Chats"    value={stats.totalChats}    color="#f59e0b" />
                <StatCard icon="👥" label="Group Chats"    value={stats.groupChats}    color="#a78bfa" />
                <StatCard icon="✉️"  label="Total Messages" value={stats.totalMessages} color="#60a5fa" />
                <StatCard icon="🆕" label="New Today"      value={stats.newUsersToday} color="#34d399" />
                <StatCard icon="🚫" label="Banned Users"   value={stats.bannedUsers}   color="#f87171" />
              </div>

              <div className="chart-section">
                <div className="chart-title">📈 Messages — Last 7 Days</div>
                <BarChart data={stats.messagesPerDay} />
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === "users" && !loading && (
            <div className="admin-users">
              <div className="admin-search-bar">
                <span>🔍</span>
                <input
                  id="admin-user-search"
                  className="admin-search-input"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={handleUserSearch}
                />
                <span className="admin-total-badge">{totalUsers} users</span>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className={u.isBanned ? "banned-row" : ""}>
                        <td>
                          <div className="user-cell">
                            <img src={u.avatar} alt={u.name} className="admin-avatar" />
                            <div>
                              <div className="user-name-cell">{u.name}</div>
                              {u.isAdmin && <span className="admin-badge">Admin</span>}
                              {u.isBanned && <span className="banned-badge">Banned</span>}
                            </div>
                          </div>
                        </td>
                        <td className="email-cell">{u.email}</td>
                        <td>
                          <span className={`status-pill ${u.isOnline ? "online" : "offline"}`}>
                            {u.isOnline ? "🟢 Online" : "⚫ Offline"}
                          </span>
                        </td>
                        <td className="date-cell">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className={`action-btn ${u.isBanned ? "unban" : "ban"}`}
                              onClick={() => handleBan(u._id, u.isBanned)}
                              title={u.isBanned ? "Unban" : "Ban"}
                            >
                              {u.isBanned ? "✅ Unban" : "🚫 Ban"}
                            </button>
                            <button
                              className={`action-btn ${u.isAdmin ? "demote" : "promote"}`}
                              onClick={() => handleMakeAdmin(u._id)}
                              title={u.isAdmin ? "Remove Admin" : "Make Admin"}
                            >
                              {u.isAdmin ? "👤 Demote" : "🛡️ Admin"}
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDelete(u._id)}
                              title="Delete user"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="5" className="no-results">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {userPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="pagination-btn"
                    disabled={userPage <= 1}
                    onClick={() => fetchUsers(userPage - 1, userSearch)}
                  >← Prev</button>
                  <span className="pagination-info">Page {userPage} / {userPages}</span>
                  <button
                    className="pagination-btn"
                    disabled={userPage >= userPages}
                    onClick={() => fetchUsers(userPage + 1, userSearch)}
                  >Next →</button>
                </div>
              )}
            </div>
          )}

          {/* ── CHATS TAB ── */}
          {tab === "chats" && !loading && (
            <div className="admin-users">
              <div className="admin-search-bar">
                <span>💬</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  All conversations
                </span>
                <span className="admin-total-badge">{totalChats} chats</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Members</th>
                      <th>Last Message</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chats.map((c) => (
                      <tr key={c._id}>
                        <td className="user-name-cell">
                          {c.isGroupChat ? `👥 ${c.chatName}` : `💬 Private`}
                        </td>
                        <td>
                          <span className={`status-pill ${c.isGroupChat ? "online" : "offline"}`}>
                            {c.isGroupChat ? "Group" : "Direct"}
                          </span>
                        </td>
                        <td className="email-cell">{c.users?.length ?? 0} members</td>
                        <td className="email-cell" style={{ maxWidth: 200 }}>
                          {c.latestMessage?.content
                            ? c.latestMessage.content.slice(0, 40) + (c.latestMessage.content.length > 40 ? "…" : "")
                            : c.latestMessage?.fileUrl ? "📎 File" : "—"}
                        </td>
                        <td className="date-cell">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {chats.length === 0 && (
                      <tr><td colSpan="5" className="no-results">No chats yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalChats > 10 && (
                <div className="admin-pagination">
                  <button className="pagination-btn" disabled={chatPage <= 1} onClick={() => fetchChats(chatPage - 1)}>← Prev</button>
                  <span className="pagination-info">Page {chatPage}</span>
                  <button className="pagination-btn" onClick={() => fetchChats(chatPage + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}

          {/* ── PRIVACY TAB ── */}
          {tab === "privacy" && (
            <div className="privacy-tab">
              <div className="privacy-hero">
                <div className="privacy-shield">🔒</div>
                <h2>Privacy by Design</h2>
                <p>ChatApp never collects or stores sensitive location data</p>
              </div>

              <div className="privacy-grid">
                {[
                  { icon: "📍", title: "No GPS / Location", status: "blocked", desc: "The app never requests browser geolocation permission. No coordinates are stored." },
                  { icon: "🌐", title: "IP Address Anonymized", status: "blocked", desc: "Real IPs are stripped server-side by privacy middleware before any processing." },
                  { icon: "🖥️", title: "MAC Address — N/A", status: "safe", desc: "Websites cannot access MAC addresses. This is hardware-level info that stays local." },
                  { icon: "🍪", title: "No Tracking Cookies", status: "safe", desc: "Only JWT stored in localStorage for auth. No analytics or ad tracking cookies." },
                  { icon: "📡", title: "VPN Recommended", status: "tip", desc: "For maximum privacy, users should connect via VPN (e.g. ProtonVPN free) before using the app." },
                  { icon: "🛡️", title: "Security Headers", status: "safe", desc: "Referrer-Policy: no-referrer, Permissions-Policy blocks camera/microphone/geolocation." },
                  { icon: "☁️", title: "Server Outside Lebanon", status: "tip", desc: "Deploy on Render.com (US servers) so the server IP is international — not Lebanese." },
                  { icon: "🔑", title: "End-to-End via HTTPS", status: "safe", desc: "All API calls and Socket.IO use HTTPS/WSS in production on Render.com." },
                ].map((item) => (
                  <div className="privacy-card" key={item.title}>
                    <div className="privacy-card-top">
                      <span className="privacy-card-icon">{item.icon}</span>
                      <span className={`privacy-status ${item.status}`}>
                        {item.status === "blocked" ? "✅ Blocked" : item.status === "safe" ? "✅ Safe" : "💡 Tip"}
                      </span>
                    </div>
                    <div className="privacy-card-title">{item.title}</div>
                    <div className="privacy-card-desc">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="vpn-banner">
                <div className="vpn-banner-icon">🛡️</div>
                <div>
                  <div className="vpn-banner-title">Recommended Free VPNs for Users in Lebanon</div>
                  <div className="vpn-banner-desc">
                    Tell your users to use one of these free VPNs before opening the app to mask their real location:
                  </div>
                  <div className="vpn-list">
                    {[
                      { name: "ProtonVPN", url: "https://protonvpn.com", note: "Free tier — No logs, Swiss privacy" },
                      { name: "Windscribe",url: "https://windscribe.com", note: "Free 10GB/mo — Strong privacy" },
                      { name: "Cloudflare WARP", url: "https://1.1.1.1", note: "Free app — Hides IP from ISP" },
                    ].map((v) => (
                      <a key={v.name} href={v.url} target="_blank" rel="noreferrer" className="vpn-item">
                        <span className="vpn-name">{v.name}</span>
                        <span className="vpn-note">{v.note}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
