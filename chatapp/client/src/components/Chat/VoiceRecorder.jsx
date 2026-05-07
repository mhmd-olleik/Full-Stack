import { useState, useRef, useCallback } from "react";
import { BsMicFill, BsStopFill, BsTrash } from "react-icons/bs";
import { IoSend } from "react-icons/io5";

export default function VoiceRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      setAudioBlob(null);
      setDuration(0);
    }
  }, [audioBlob, duration, onSend]);

  const handleDiscard = useCallback(() => {
    if (recording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setAudioBlob(null);
    setDuration(0);
    onCancel();
  }, [recording, onCancel]);

  return (
    <div className="voice-recorder">
      {!recording && !audioBlob && (
        <button className="voice-recorder-start" onClick={startRecording} title="Start recording">
          <BsMicFill size={22} />
        </button>
      )}

      {recording && (
        <div className="voice-recorder-active">
          <button className="voice-recorder-discard" onClick={handleDiscard} title="Cancel">
            <BsTrash size={18} />
          </button>
          <div className="voice-recorder-indicator">
            <div className="voice-recorder-pulse" />
            <span className="voice-recorder-time">{formatTime(duration)}</span>
          </div>
          <button className="voice-recorder-stop" onClick={stopRecording} title="Stop recording">
            <BsStopFill size={22} />
          </button>
        </div>
      )}

      {!recording && audioBlob && (
        <div className="voice-recorder-preview">
          <button className="voice-recorder-discard" onClick={handleDiscard} title="Discard">
            <BsTrash size={18} />
          </button>
          <div className="voice-recorder-indicator">
            <span className="voice-recorder-time">{formatTime(duration)}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Voice message ready</span>
          </div>
          <button className="voice-recorder-send" onClick={handleSend} title="Send voice message">
            <IoSend size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
