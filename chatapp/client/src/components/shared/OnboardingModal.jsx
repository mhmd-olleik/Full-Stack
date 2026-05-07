import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { BsClipboard2Check } from "react-icons/bs";

export default function OnboardingModal() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name?.includes("@") ? "" : user?.name || "");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your name (at least 2 characters)");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", {
        name: name.trim(),
        about: about.trim() || "Hey there! I am using ChatApp.",
        onboardingDone: true,
      });
      updateUser({ ...data, onboardingDone: true });
      toast.success("Welcome to ChatApp! 🎉");
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <span className="onboarding-icon">👋</span>
        <h2 className="onboarding-title">Welcome to ChatApp!</h2>
        <p className="onboarding-subtitle">
          Set your display name so others can find you.<br />
          Your unique <strong style={{ color: "var(--accent)" }}>Chat ID</strong> is ready —
          share it to receive messages.
        </p>

        {/* Chat ID Display */}
        <div className="onboarding-chatid-box">
          <div style={{ textAlign: "left" }}>
            <div className="onboarding-chatid-label">Your Chat ID</div>
            <div className="onboarding-chatid-value">#{user?.chatId}</div>
          </div>
          <button
            className="chatid-copy-btn"
            style={{ padding: "8px 14px" }}
            onClick={() => {
              navigator.clipboard.writeText(user?.chatId || "");
              toast.success("Chat ID copied!");
            }}
          >
            <BsClipboard2Check size={13} />
            Copy
          </button>
        </div>

        {/* Name Input */}
        <div className="onboarding-form-group">
          <label className="onboarding-label">Display Name *</label>
          <input
            id="onboarding-name-input"
            className="form-input"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            maxLength={40}
          />
        </div>

        {/* About Input */}
        <div className="onboarding-form-group" style={{ marginBottom: 32 }}>
          <label className="onboarding-label">About (optional)</label>
          <input
            id="onboarding-about-input"
            className="form-input"
            placeholder="Hey there! I am using ChatApp."
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={80}
          />
        </div>

        <button
          id="onboarding-save-btn"
          className="btn btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: 16, borderRadius: 14 }}
          onClick={handleSave}
          disabled={saving || name.trim().length < 2}
        >
          {saving ? "Saving..." : "Let's go! 🚀"}
        </button>
      </div>
    </div>
  );
}
