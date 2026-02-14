"""
Hand Tracker Module
Uses MediaPipe to detect and track hand landmarks from camera feed
EASIER VERSION - Lower thresholds for better detection
"""
import cv2
import mediapipe as mp
import numpy as np


class HandTracker:
    """Tracks hand landmarks using MediaPipe - Easy Mode"""
    
    def __init__(self, max_hands=1, detection_confidence=0.5, tracking_confidence=0.5):
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.mp_styles = mp.solutions.drawing_styles
        
        # EASIER: Lower confidence thresholds for better detection
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_confidence,  # Lower = easier detection
            min_tracking_confidence=tracking_confidence,     # Lower = more stable
            model_complexity=0  # Simpler model = faster
        )
        
        # Landmark indices for fingertips
        self.FINGERTIPS = [4, 8, 12, 16, 20]  # Thumb, Index, Middle, Ring, Pinky
        self.FINGER_PIPS = [3, 6, 10, 14, 18]  # PIP joints (for bend detection)
        self.FINGER_MCPS = [2, 5, 9, 13, 17]   # MCP joints
        
        # Smoothing for stability
        self.prev_finger_states = [False] * 5
        self.state_history = []
        self.history_size = 3  # Average over 3 frames
        
    def process_frame(self, frame):
        """
        Process a frame and return hand landmarks
        Returns: (processed_frame, hand_landmarks, handedness)
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.hands.process(rgb_frame)
        
        landmarks = None
        handedness = None
        
        if results.multi_hand_landmarks:
            # Get first hand
            landmarks = results.multi_hand_landmarks[0]
            
            # Draw landmarks on frame with bigger circles
            self.mp_draw.draw_landmarks(
                frame,
                landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_styles.get_default_hand_landmarks_style(),
                self.mp_styles.get_default_hand_connections_style()
            )
            
            if results.multi_handedness:
                handedness = results.multi_handedness[0].classification[0].label
        
        # Draw status
        status = "Hand Detected!" if landmarks else "Show your hand..."
        color = (0, 255, 0) if landmarks else (0, 0, 255)
        cv2.putText(frame, status, (10, frame.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        return frame, landmarks, handedness
    
    def get_landmark_positions(self, landmarks, frame_shape):
        """
        Convert MediaPipe landmarks to pixel coordinates
        Returns: list of (x, y) tuples for each landmark
        """
        if not landmarks:
            return None
        
        h, w = frame_shape[:2]
        positions = []
        
        for lm in landmarks.landmark:
            x = int(lm.x * w)
            y = int(lm.y * h)
            positions.append((x, y))
        
        return positions
    
    def get_finger_states(self, landmarks):
        """
        Determine which fingers are extended - EASIER VERSION
        Uses more lenient detection with smoothing
        Returns: list of 5 booleans [Thumb, Index, Middle, Ring, Pinky]
        """
        if not landmarks:
            return [False] * 5
        
        lm = landmarks.landmark
        states = []
        
        # Thumb - use simpler detection (compare tip to IP joint)
        thumb_tip = lm[4]
        thumb_ip = lm[3]
        thumb_mcp = lm[2]
        wrist = lm[0]
        
        # Check if hand is facing camera (palm or back)
        palm_facing = lm[5].z < lm[17].z
        
        # Thumb: compare horizontal distance
        if lm[0].x < lm[9].x:  # Right hand
            thumb_extended = thumb_tip.x < thumb_mcp.x
        else:  # Left hand
            thumb_extended = thumb_tip.x > thumb_mcp.x
        states.append(thumb_extended)
        
        # Other fingers - MORE LENIENT: compare tip to MCP (not PIP)
        # This makes it easier because finger doesn't need to be fully extended
        for i, (tip, pip, mcp) in enumerate(zip(
            self.FINGERTIPS[1:], 
            self.FINGER_PIPS[1:],
            self.FINGER_MCPS[1:]
        )):
            # Finger is extended if tip is above MCP (more lenient)
            # Adding small tolerance for easier detection
            tolerance = 0.02  # 2% tolerance
            extended = lm[tip].y < lm[mcp].y + tolerance
            states.append(extended)
        
        # Apply smoothing - average with previous states
        self.state_history.append(states)
        if len(self.state_history) > self.history_size:
            self.state_history.pop(0)
        
        # Smooth: finger is extended if extended in majority of frames
        smoothed_states = []
        for i in range(5):
            count = sum(1 for frame_states in self.state_history if frame_states[i])
            smoothed_states.append(count >= len(self.state_history) // 2 + 1)
        
        return smoothed_states
    
    def count_extended_fingers(self, landmarks):
        """Count number of extended fingers"""
        states = self.get_finger_states(landmarks)
        return sum(states)
    
    def get_hand_center(self, landmarks):
        """Get the center position of the palm"""
        if not landmarks:
            return None
        
        # Use wrist and middle finger MCP for center calculation
        lm = landmarks.landmark
        center_x = (lm[0].x + lm[9].x) / 2
        center_y = (lm[0].y + lm[9].y) / 2
        
        return (center_x, center_y)
    
    def cleanup(self):
        """Release resources"""
        self.hands.close()
