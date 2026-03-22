"""
AIR WRITING & ERASER SYSTEM — HIGH PERFORMANCE
================================================
Draw and erase in the air using your webcam and hand gestures!

Optimized for maximum FPS with:
  - Threaded camera capture (decoupled from processing)
  - Optimized canvas blending
  - Efficient hand tracking pipeline

Controls:
  - Index finger up only  → DRAW mode
  - All fingers up (open palm) → ERASE mode
  - Click toolbar buttons to change color
  - C  → Clear canvas
  - S  → Save drawing
  - +/- → Change line thickness
  - [/] → Change eraser size
  - ESC → Exit

Dependencies: pip install opencv-python mediapipe numpy
"""

import cv2
import numpy as np
import mediapipe as mp
import time
import os
import urllib.request
import threading
from collections import deque

# ─── MediaPipe Tasks API ───────────────────────────────────────────
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
HandLandmarkerResult = mp.tasks.vision.HandLandmarkerResult
VisionRunningMode = mp.tasks.vision.RunningMode

# Landmark indices
INDEX_FINGER_TIP = 8
INDEX_FINGER_PIP = 6
MIDDLE_FINGER_TIP = 12
MIDDLE_FINGER_PIP = 10
RING_FINGER_TIP = 16
RING_FINGER_PIP = 14
PINKY_TIP = 20
PINKY_PIP = 18
THUMB_TIP = 4
THUMB_IP = 3
MIDDLE_FINGER_MCP = 9
WRIST = 0

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (0, 9), (9, 10), (10, 11), (11, 12),
    (0, 13), (13, 14), (14, 15), (15, 16),
    (0, 17), (17, 18), (18, 19), (19, 20),
    (5, 9), (9, 13), (13, 17),
]

# ─── Configuration ──────────────────────────────────────────────────
WINDOW_NAME = "AIR - WRITING"
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

# Colors (BGR)
COLORS = {
    "GREEN":  (0, 255, 0),
    "BLUE":   (255, 150, 0),
    "RED":    (0, 0, 255),
    "YELLOW": (0, 255, 255),
    "WHITE":  (255, 255, 255),
    "PURPLE": (255, 0, 150),
}
COLOR_NAMES = list(COLORS.keys())

TOOLBAR_HEIGHT = 50
BUTTON_MARGIN = 5
DEFAULT_LINE_THICKNESS = 5
DEFAULT_ERASER_SIZE = 60
MIN_LINE_THICKNESS = 2
MAX_LINE_THICKNESS = 30
MIN_ERASER_SIZE = 20
MAX_ERASER_SIZE = 150


def download_model():
    """Download the hand landmarker model if missing."""
    if not os.path.exists(MODEL_PATH):
        print("Downloading hand landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded!")
    else:
        print("Hand landmarker model found.")


# ─── Threaded Camera Capture ───────────────────────────────────────
class CameraCapture:
    """High-performance threaded camera capture with minimal latency."""

    def __init__(self, src=0, width=1280, height=720):
        self.cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)  # DirectShow for faster init on Windows

        # Set resolution — try requested, fallback gracefully
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)

        # Performance settings
        self.cap.set(cv2.CAP_PROP_FPS, 60)            # Request high FPS
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)       # Minimize buffer lag
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))  # MJPG for speed

        # Read actual size
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self.cap.get(cv2.CAP_PROP_FPS)

        print(f"Camera: {self.width}x{self.height} @ {actual_fps:.0f}fps (requested {width}x{height})")

        self.frame = None
        self.grabbed = False
        self.running = False
        self.lock = threading.Lock()

    def start(self):
        """Start the capture thread."""
        self.running = True
        self.grabbed, self.frame = self.cap.read()
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        return self

    def _capture_loop(self):
        """Continuously grab frames in a background thread."""
        while self.running:
            grabbed, frame = self.cap.read()
            with self.lock:
                self.grabbed = grabbed
                self.frame = frame

    def read(self):
        """Get the latest frame (non-blocking)."""
        with self.lock:
            return self.grabbed, self.frame.copy() if self.frame is not None else None

    def stop(self):
        self.running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=1)
        self.cap.release()

    def is_opened(self):
        return self.cap.isOpened()


# ─── Draw Landmarks ────────────────────────────────────────────────
def draw_hand_landmarks(frame, landmarks, w, h):
    """Draw hand skeleton with colored fingertips."""
    pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

    # Connections (thin lines for speed)
    for s, e in HAND_CONNECTIONS:
        if s < len(pts) and e < len(pts):
            cv2.line(frame, pts[s], pts[e], (0, 200, 0), 2, cv2.LINE_AA)

    # Landmark dots
    for i, (px, py) in enumerate(pts):
        if i in (4, 8, 12, 16, 20):  # Fingertips
            cv2.circle(frame, (px, py), 6, (0, 0, 255), -1)
            cv2.circle(frame, (px, py), 6, (255, 255, 255), 1)
        else:
            cv2.circle(frame, (px, py), 3, (0, 255, 0), -1)


# ─── Main Application ──────────────────────────────────────────────
class AirWritingApp:
    def __init__(self):
        self.canvas = None
        self.prev_x, self.prev_y = 0, 0
        self.drawing = False

        self.current_color_idx = 0
        self.line_thickness = DEFAULT_LINE_THICKNESS
        self.eraser_size = DEFAULT_ERASER_SIZE
        self.mode = "DRAW"

        self.buttons = []

        # Smoothing with weighted average
        self.smooth_x, self.smooth_y = 0, 0
        self.alpha = 0.6  # Higher = more responsive, lower = smoother

        # FPS tracking (rolling average for stable display)
        self.fps_times = deque(maxlen=30)
        self.fps = 0

        # Hand detection result (from async callback)
        self.latest_result = None
        self.result_lock = threading.Lock()

    def result_callback(self, result, output_image, timestamp_ms):
        with self.result_lock:
            self.latest_result = result

    def get_result(self):
        with self.result_lock:
            return self.latest_result

    def get_color(self):
        return COLORS[COLOR_NAMES[self.current_color_idx]]

    def get_color_name(self):
        return COLOR_NAMES[self.current_color_idx]

    def build_buttons(self, fw):
        self.buttons = []
        x = BUTTON_MARGIN

        # Mode
        w = 100
        self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, "MODE", None))
        x += w + BUTTON_MARGIN + 5

        # Colors
        for cn in COLOR_NAMES:
            w = 80
            self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, cn, "COLOR"))
            x += w + BUTTON_MARGIN

        x += 10
        # Line
        w = 100
        self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, "LINE", None))
        x += w + BUTTON_MARGIN
        # Eraser
        w = 120
        self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, "ERASER", None))
        x += w + BUTTON_MARGIN
        # Clear
        w = 80
        self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, "CLEAR", "CLEAR"))
        x += w + BUTTON_MARGIN
        # Save
        w = 80
        self.buttons.append((x, BUTTON_MARGIN, x + w, TOOLBAR_HEIGHT - BUTTON_MARGIN, "SAVE", "SAVE"))
        x += w + BUTTON_MARGIN
        # ESC
        w = 80
        self.buttons.append((fw - w - BUTTON_MARGIN, BUTTON_MARGIN,
                              fw - BUTTON_MARGIN, TOOLBAR_HEIGHT - BUTTON_MARGIN, "ESC:Exit", None))

    def draw_toolbar(self, frame):
        fw = frame.shape[1]
        # Semi-transparent dark bar
        frame[0:TOOLBAR_HEIGHT, :] = (frame[0:TOOLBAR_HEIGHT, :].astype(np.int16) * 15 // 100 + 30 * 85 // 100).clip(0, 255).astype(np.uint8)
        cv2.line(frame, (0, TOOLBAR_HEIGHT), (fw, TOOLBAR_HEIGHT), (80, 80, 80), 1)

        for (x1, y1, x2, y2, label, action) in self.buttons:
            if label == "MODE":
                c = (0, 200, 100) if self.mode == "DRAW" else (0, 100, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), c, -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 255), 1)
                cv2.putText(frame, self.mode, (x1 + 15, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            elif action == "COLOR":
                bgr = COLORS[label]
                sel = (label == self.get_color_name())
                if sel:
                    cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), (255, 255, 255), 2)
                cv2.rectangle(frame, (x1, y1), (x2, y2), bgr, -1)
                if not sel:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (100, 100, 100), 1)
                tc = (0, 0, 0) if label in ("YELLOW", "GREEN", "WHITE") else (255, 255, 255)
                cv2.putText(frame, label, (x1 + 5, y2 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, tc, 1)
            elif label == "LINE":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (60, 60, 60), -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (150, 150, 150), 1)
                cv2.putText(frame, f"LINE: {self.line_thickness}", (x1 + 8, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            elif label == "ERASER":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (60, 60, 60), -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (150, 150, 150), 1)
                cv2.putText(frame, f"ERASER: {self.eraser_size}", (x1 + 8, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            elif action == "CLEAR":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 180), -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 255), 1)
                cv2.putText(frame, "CLEAR", (x1 + 10, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            elif action == "SAVE":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (180, 120, 0), -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 255), 1)
                cv2.putText(frame, "SAVE", (x1 + 15, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            elif label == "ESC:Exit":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (50, 50, 50), -1)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (100, 100, 100), 1)
                cv2.putText(frame, "ESC:Exit", (x1 + 5, y2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

    def handle_click(self, x, y):
        for (x1, y1, x2, y2, label, action) in self.buttons:
            if x1 <= x <= x2 and y1 <= y <= y2:
                if label == "MODE":
                    self.mode = "ERASE" if self.mode == "DRAW" else "DRAW"
                elif action == "COLOR":
                    self.current_color_idx = COLOR_NAMES.index(label)
                    self.mode = "DRAW"
                elif action == "CLEAR":
                    self.canvas = np.zeros_like(self.canvas)
                elif action == "SAVE":
                    self.save_drawing()
                return

    def save_drawing(self):
        d = os.path.dirname(os.path.abspath(__file__))
        fn = os.path.join(d, f"drawing_{time.strftime('%Y%m%d_%H%M%S')}.png")
        cv2.imwrite(fn, self.canvas)
        print(f"Saved: {fn}")

    def count_fingers(self, lms, handed):
        up = 0
        # Thumb
        if handed == "Right":
            if lms[THUMB_TIP].x < lms[THUMB_IP].x:
                up += 1
        else:
            if lms[THUMB_TIP].x > lms[THUMB_IP].x:
                up += 1
        # Fingers
        for t, p in [(INDEX_FINGER_TIP, INDEX_FINGER_PIP),
                      (MIDDLE_FINGER_TIP, MIDDLE_FINGER_PIP),
                      (RING_FINGER_TIP, RING_FINGER_PIP),
                      (PINKY_TIP, PINKY_PIP)]:
            if lms[t].y < lms[p].y:
                up += 1
        return up

    def is_index_only(self, lms):
        if lms[INDEX_FINGER_TIP].y >= lms[INDEX_FINGER_PIP].y:
            return False
        for t, p in [(MIDDLE_FINGER_TIP, MIDDLE_FINGER_PIP),
                      (RING_FINGER_TIP, RING_FINGER_PIP),
                      (PINKY_TIP, PINKY_PIP)]:
            if lms[t].y < lms[p].y:
                return False
        return True

    def smooth(self, x, y):
        self.smooth_x = int(self.alpha * x + (1 - self.alpha) * self.smooth_x)
        self.smooth_y = int(self.alpha * y + (1 - self.alpha) * self.smooth_y)
        return self.smooth_x, self.smooth_y

    def run(self):
        download_model()

        # Start threaded camera
        cam = CameraCapture(src=0, width=1280, height=720)
        if not cam.is_opened():
            print("Error: Could not open webcam!")
            return
        cam.start()

        # Get actual frame dimensions
        ret, frame = cam.read()
        if not ret or frame is None:
            print("Error: Could not read from webcam!")
            cam.stop()
            return

        h, w = frame.shape[:2]
        self.canvas = np.zeros((h, w, 3), dtype=np.uint8)
        self.build_buttons(w)

        # Pre-allocate buffers
        mask = np.zeros((h, w), dtype=np.uint8)
        gray = np.zeros((h, w), dtype=np.uint8)

        def on_mouse(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                self.handle_click(x, y)

        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WINDOW_NAME, w, h)
        cv2.setMouseCallback(WINDOW_NAME, on_mouse)

        # MediaPipe HandLandmarker (LIVE_STREAM for async, non-blocking)
        options = HandLandmarkerOptions(
            base_options=BaseOptions(
                model_asset_path=MODEL_PATH,
                delegate=BaseOptions.Delegate.CPU,
            ),
            running_mode=VisionRunningMode.LIVE_STREAM,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            result_callback=self.result_callback,
        )

        print("\n" + "=" * 55)
        print("  AIR WRITING & ERASER SYSTEM  [HIGH PERFORMANCE]")
        print("=" * 55)
        print(f"  Camera: {w}x{h}")
        print("  ☝  Index finger → DRAW")
        print("  🖐  Open palm    → ERASE")
        print("  ✊  Fist         → Pen lifted")
        print("-" * 55)
        print("  C=Clear  S=Save  +/-=Line  [/]=Eraser  ESC=Exit")
        print("=" * 55 + "\n")

        with HandLandmarker.create_from_options(options) as landmarker:
            ts = 0

            while True:
                ret, frame = cam.read()
                if not ret or frame is None:
                    continue

                # Mirror
                frame = cv2.flip(frame, 1)
                fh, fw = frame.shape[:2]

                # Send to MediaPipe (async — won't block)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                ts += 33
                landmarker.detect_async(mp_img, ts)

                # Process latest detection
                result = self.get_result()
                if result and result.hand_landmarks:
                    for hi, hlms in enumerate(result.hand_landmarks):
                        draw_hand_landmarks(frame, hlms, fw, fh)

                        handed = "Right"
                        if result.handedness and hi < len(result.handedness):
                            handed = result.handedness[hi][0].category_name

                        ix = int(hlms[INDEX_FINGER_TIP].x * fw)
                        iy = int(hlms[INDEX_FINGER_TIP].y * fh)
                        sx, sy = self.smooth(ix, iy)

                        fingers = self.count_fingers(hlms, handed)
                        idx_only = self.is_index_only(hlms)

                        if idx_only and self.mode == "DRAW":
                            cv2.circle(frame, (sx, sy), self.line_thickness + 3,
                                       self.get_color(), 2)
                            if self.drawing:
                                cv2.line(self.canvas,
                                         (self.prev_x, self.prev_y), (sx, sy),
                                         self.get_color(), self.line_thickness,
                                         cv2.LINE_AA)
                            self.drawing = True
                            self.prev_x, self.prev_y = sx, sy

                        elif fingers >= 4:
                            self.mode = "ERASE"
                            self.drawing = False
                            px = int(hlms[MIDDLE_FINGER_MCP].x * fw)
                            py = int(hlms[MIDDLE_FINGER_MCP].y * fh)
                            cv2.circle(frame, (px, py), self.eraser_size, (255, 255, 255), 2)
                            cv2.circle(self.canvas, (px, py), self.eraser_size, (0, 0, 0), -1)

                        elif fingers <= 1 and not idx_only:
                            self.drawing = False
                            if self.mode == "ERASE":
                                self.mode = "DRAW"
                        else:
                            self.drawing = False
                else:
                    self.drawing = False

                # ─── Fast canvas overlay ────────────────────────
                cv2.cvtColor(self.canvas, cv2.COLOR_BGR2GRAY, dst=gray)
                cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY, dst=mask)

                # Only blend where there's drawing (fast with numpy boolean indexing)
                draw_pixels = mask > 0
                if np.any(draw_pixels):
                    # Expand mask to 3 channels
                    m3 = np.stack([draw_pixels] * 3, axis=-1)
                    # 70% drawing + 30% webcam where there's ink
                    blended = (self.canvas.astype(np.uint16) * 7 + frame.astype(np.uint16) * 3) // 10
                    np.copyto(frame, blended.astype(np.uint8), where=m3)

                output = frame

                # Toolbar
                self.draw_toolbar(output)

                # FPS (rolling average)
                now = time.perf_counter()
                self.fps_times.append(now)
                if len(self.fps_times) > 1:
                    self.fps = (len(self.fps_times) - 1) / (self.fps_times[-1] - self.fps_times[0] + 1e-9)
                cv2.putText(output, f"FPS: {int(self.fps)}", (fw - 130, fh - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                # Mode indicator
                mc = (0, 255, 100) if self.mode == "DRAW" else (0, 100, 255)
                cv2.putText(output, f"Mode: {self.mode}", (10, fh - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, mc, 2)

                # Resolution indicator
                cv2.putText(output, f"{fw}x{fh}", (fw - 130, fh - 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)

                cv2.imshow(WINDOW_NAME, output)

                # Keys
                key = cv2.waitKey(1)
                if key == 27:
                    break
                elif key != -1:
                    k = key & 0xFF
                    if k in (ord('c'), ord('C')):
                        self.canvas = np.zeros_like(self.canvas)
                        print("Canvas cleared!")
                    elif k in (ord('s'), ord('S')):
                        self.save_drawing()
                    elif k in (ord('+'), ord('=')):
                        self.line_thickness = min(self.line_thickness + 1, MAX_LINE_THICKNESS)
                    elif k == ord('-'):
                        self.line_thickness = max(self.line_thickness - 1, MIN_LINE_THICKNESS)
                    elif k == ord(']'):
                        self.eraser_size = min(self.eraser_size + 5, MAX_ERASER_SIZE)
                    elif k == ord('['):
                        self.eraser_size = max(self.eraser_size - 5, MIN_ERASER_SIZE)

        cam.stop()
        cv2.destroyAllWindows()
        print("\nAir Writing closed. Goodbye!")


if __name__ == "__main__":
    app = AirWritingApp()
    app.run()
