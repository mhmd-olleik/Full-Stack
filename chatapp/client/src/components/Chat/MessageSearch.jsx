import { useState, useRef, useEffect } from "react";
import { BsSearch } from "react-icons/bs";
import { FiX, FiChevronUp, FiChevronDown } from "react-icons/fi";
import api from "../../services/api";

export default function MessageSearch({ chatId, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/search/${chatId}?q=${encodeURIComponent(val)}`);
        setResults(data);
        setActiveIndex(data.length - 1); // Start at most recent match
        if (data.length > 0) onJumpToMessage?.(data[data.length - 1]._id);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const navigateUp = () => {
    if (results.length === 0) return;
    const newIdx = activeIndex > 0 ? activeIndex - 1 : results.length - 1;
    setActiveIndex(newIdx);
    onJumpToMessage?.(results[newIdx]._id);
  };

  const navigateDown = () => {
    if (results.length === 0) return;
    const newIdx = activeIndex < results.length - 1 ? activeIndex + 1 : 0;
    setActiveIndex(newIdx);
    onJumpToMessage?.(results[newIdx]._id);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) navigateUp();
      else navigateDown();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="message-search-bar">
      <div className="message-search-input-wrap">
        <BsSearch size={14} className="message-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search in conversation..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <span className="message-search-count">
            {loading ? "..." : results.length > 0 ? `${activeIndex + 1}/${results.length}` : "0"}
          </span>
        )}
      </div>

      <div className="message-search-nav">
        <button className="icon-btn" onClick={navigateUp} disabled={results.length === 0} title="Previous">
          <FiChevronUp size={18} />
        </button>
        <button className="icon-btn" onClick={navigateDown} disabled={results.length === 0} title="Next">
          <FiChevronDown size={18} />
        </button>
      </div>

      <button className="icon-btn" onClick={onClose} title="Close search">
        <FiX size={18} />
      </button>
    </div>
  );
}
