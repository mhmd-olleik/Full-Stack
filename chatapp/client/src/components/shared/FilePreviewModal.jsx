import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import { FiX } from "react-icons/fi";

export default function FilePreviewModal({ file, onSend, onClose }) {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const isImage = file?.type?.startsWith("image/");
  const isVideo = file?.type?.startsWith("video/");

  useEffect(() => {
    if (file && (isImage || isVideo)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage, isVideo]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!file) return null;

  const handleSend = () => {
    onSend(file, caption.trim());
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="file-preview-overlay">
      <div className="file-preview-modal">
        {/* Header */}
        <div className="file-preview-header">
          <button className="icon-btn" onClick={onClose}>
            <FiX size={22} />
          </button>
          <span className="file-preview-filename">{file.name}</span>
        </div>

        {/* Preview Area */}
        <div className="file-preview-content">
          {isImage && previewUrl && (
            <img className="file-preview-img" src={previewUrl} alt="Preview" />
          )}
          {isVideo && previewUrl && (
            <video className="file-preview-video" src={previewUrl} controls />
          )}
          {!isImage && !isVideo && (
            <div className="file-preview-generic">
              <div className="file-preview-icon">📄</div>
              <div className="file-preview-name">{file.name}</div>
              <div className="file-preview-size">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}
        </div>

        {/* Caption + Send */}
        <div className="file-preview-footer">
          <input
            ref={inputRef}
            className="file-preview-caption"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={handleSend}>
            <IoSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
