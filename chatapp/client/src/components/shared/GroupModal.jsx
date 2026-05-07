import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { BsPeopleFill } from "react-icons/bs";
import { FiX } from "react-icons/fi";

export default function GroupModal({ onClose, onCreated }) {
  const [groupName, setGroupName] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users?search=${searchQ}`);
        setResults(data.filter((u) => !selected.find((s) => s._id === u._id)));
      } catch { toast.error("Search failed"); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ, selected]);

  const addUser = (u) => {
    setSelected((prev) => [...prev, u]);
    setSearchQ("");
    setResults([]);
  };

  const removeUser = (id) => setSelected((prev) => prev.filter((u) => u._id !== id));

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    if (selected.length < 2) { toast.error("Add at least 2 people"); return; }
    setCreating(true);
    try {
      await api.post("/chats/group", {
        name: groupName,
        users: selected.map((u) => u._id),
      });
      toast.success(`Group "${groupName}" created! 🎉`);
      onCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">
            <BsPeopleFill size={20} style={{ color: "var(--accent)" }} />
            New Group Chat
          </h2>
          <button className="modal-close" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Group Name</label>
          <input
            id="group-name-input"
            className="form-input"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Add Members (min 2)</label>

          {selected.length > 0 && (
            <div className="selected-users">
              {selected.map((u) => (
                <div className="selected-user-chip" key={u._id}>
                  <img src={u.avatar} alt={u.name} />
                  <span>{u.name}</span>
                  <button className="chip-remove" onClick={() => removeUser(u._id)}>
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            id="group-member-search"
            className="form-input"
            placeholder="Search users..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />

          {(results.length > 0 || loading) && (
            <div className="user-search-results">
              {loading && <div style={{ padding: 10, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>Searching...</div>}
              {results.map((u) => (
                <div key={u._id} className="user-result-item" onClick={() => addUser(u)}>
                  <img className="avatar" src={u.avatar} alt={u.name} style={{ width: 36, height: 36 }} />
                  <div>
                    <div className="user-result-name">{u.name}</div>
                    <div className="user-result-email">{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            id="create-group-btn"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selected.length < 2}
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
