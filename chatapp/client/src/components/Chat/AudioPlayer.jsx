import { useRef, useState, useEffect, useCallback } from "react";
import { BsPlayFill, BsPauseFill } from "react-icons/bs";

export default function AudioPlayer({ src, duration: initialDuration, isVoice = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`audio-player ${isVoice ? "audio-player--voice" : ""}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button className="audio-player-btn" onClick={togglePlay}>
        {playing ? <BsPauseFill size={20} /> : <BsPlayFill size={20} />}
      </button>

      <div className="audio-player-track" onClick={handleSeek}>
        {isVoice ? (
          /* Voice waveform bars */
          <div className="audio-waveform">
            {Array.from({ length: 28 }).map((_, i) => {
              const h = 8 + Math.sin(i * 0.7) * 10 + Math.random() * 6;
              const filled = (i / 28) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`audio-waveform-bar ${filled ? "filled" : ""}`}
                  style={{ height: h }}
                />
              );
            })}
          </div>
        ) : (
          /* Standard progress bar */
          <div className="audio-progress-bg">
            <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <span className="audio-player-time">
        {playing ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
}
