import { useRef, useState, useEffect } from "react";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "🔥", "😢", "🙏"];

export default function MessageContextMenu({ x, y, message, isOwn, onClose, onReply, onReact, onForward, onDelete, onCopy }) {
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x, newY = y;
      if (rect.right > window.innerWidth) newX = window.innerWidth - rect.width - 8;
      if (rect.bottom > window.innerHeight) newY = window.innerHeight - rect.height - 8;
      if (newX < 8) newX = 8;
      if (newY < 8) newY = 8;
      setPos({ x: newX, y: newY });
    }
  }, [x, y]);

  const isDeleted = message.deletedForEveryone;
  const hasContent = message.content && message.content.trim();

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div className="context-menu" ref={menuRef} style={{ left: pos.x, top: pos.y }}>
        {/* Quick Reaction Bar */}
        {!isDeleted && (
          <div className="context-menu-reactions">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="context-menu-reaction-btn"
                onClick={() => { onReact(emoji); onClose(); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Menu Actions */}
        <div className="context-menu-actions">
          {!isDeleted && (
            <button className="context-menu-item" onClick={() => { onReply(); onClose(); }}>
              <span className="context-menu-icon">↩️</span>
              <span>Reply</span>
            </button>
          )}

          {hasContent && !isDeleted && (
            <button className="context-menu-item" onClick={() => { onCopy(); onClose(); }}>
              <span className="context-menu-icon">📋</span>
              <span>Copy</span>
            </button>
          )}

          {!isDeleted && (
            <button className="context-menu-item" onClick={() => { onForward(); onClose(); }}>
              <span className="context-menu-icon">↗️</span>
              <span>Forward</span>
            </button>
          )}

          <button className="context-menu-item" onClick={() => { onDelete(false); onClose(); }}>
            <span className="context-menu-icon">🗑️</span>
            <span>Delete for me</span>
          </button>

          {isOwn && !isDeleted && (
            <button className="context-menu-item context-menu-item--danger" onClick={() => { onDelete(true); onClose(); }}>
              <span className="context-menu-icon">⛔</span>
              <span>Delete for everyone</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
