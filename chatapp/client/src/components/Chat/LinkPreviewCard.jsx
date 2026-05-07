export default function LinkPreviewCard({ preview }) {
  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  const handleClick = () => {
    if (preview.url) window.open(preview.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="link-preview-card" onClick={handleClick}>
      {preview.image && (
        <div className="link-preview-image">
          <img src={preview.image} alt="" onError={(e) => { e.target.style.display = "none"; }} />
        </div>
      )}
      <div className="link-preview-body">
        {preview.title && <div className="link-preview-title">{preview.title}</div>}
        {preview.description && (
          <div className="link-preview-desc">{preview.description.slice(0, 120)}</div>
        )}
        <div className="link-preview-url">{preview.url}</div>
      </div>
    </div>
  );
}
