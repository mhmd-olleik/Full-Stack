import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import toast from "react-hot-toast";
import { IoChevronBack } from "react-icons/io5";
import { FiEdit3 } from "react-icons/fi";
import { BsClipboard2Check } from "react-icons/bs";
import { MdFingerprint } from "react-icons/md";

export default function ProfileDrawer({ onClose }) {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", { name, about });
      updateUser(data);
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const copyChatId = () => {
    navigator.clipboard.writeText(user?.chatId || "");
    toast.success("Chat ID copied!");
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <button className="icon-btn" onClick={onClose}><IoChevronBack size={20} /></button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>My Profile</h2>
          <button className="icon-btn" onClick={() => setEditing(!editing)} title="Edit">
            <FiEdit3 size={16} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="profile-cover">
          <img
            className="profile-avatar-large"
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
            alt={user?.name}
          />
          {editing ? (
            <input id="profile-name-input" className="form-input" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ textAlign: "center", marginBottom: 8, background: "rgba(255,255,255,0.05)" }}
            />
          ) : (
            <div className="profile-name-large">{user?.name}</div>
          )}
          <div className="profile-email">{user?.email}</div>
        </div>

        {/* Chat ID Section */}
        <div className="profile-section">
          <div className="profile-section-title">
            <MdFingerprint size={14} />
            My Chat ID
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(0,230,118,0.04)", border: "1px solid var(--border-accent)",
            borderRadius: 12, padding: "14px 18px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.1em" }}>
                #{user?.chatId}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                Share this ID so others can add you
              </div>
            </div>
            <button className="chatid-copy-btn" onClick={copyChatId} style={{ padding: "8px 14px" }}>
              <BsClipboard2Check size={13} />
              Copy
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="profile-section">
          <div className="profile-section-title">About</div>
          {editing ? (
            <input id="profile-about-input" className="form-input" value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell something about yourself..."
            />
          ) : (
            <div className="profile-about">
              {user?.about || "Hey there! I am using ChatApp."}
            </div>
          )}
        </div>

        {/* Actions */}
        {editing && (
          <div style={{ padding: "16px 20px", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
            <button id="save-profile-btn" className="btn btn-primary" style={{ flex: 1 }}
              onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
