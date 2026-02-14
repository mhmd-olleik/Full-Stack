"""
Gesture Classifier Module - MOTION BASED
Controls 3D scene using hand movement direction
"""
from enum import Enum, auto
import time
import numpy as np


class Gesture(Enum):
    """Available gesture types - Motion Based"""
    NONE = auto()
    MOVE_LEFT = auto()       # 👈 Move hand left - Rotate left
    MOVE_RIGHT = auto()      # 👉 Move hand right - Rotate right
    MOVE_UP = auto()         # 👆 Move hand up - Tilt up
    MOVE_DOWN = auto()       # 👇 Move hand down - Tilt down
    PINCH_IN = auto()        # 🤏 Fingers close together - Zoom in
    PINCH_OUT = auto()       # 🖐️ Fingers spread - Zoom out
    FIST = auto()            # ✊ Fist - Stop/Reset


class MotionTracker:
    """Tracks hand motion for gesture control"""
    
    def __init__(self):
        # Position history for motion detection
        self.position_history = []
        self.history_size = 10
        
        # Motion thresholds
        self.motion_threshold = 0.015  # Minimum motion to register
        self.speed_threshold = 0.02    # Minimum speed
        
        # Current state
        self.current_gesture = Gesture.NONE
        self.gesture_start_time = 0
        
        # Hand spread tracking (for zoom)
        self.prev_spread = 0
        
    def update(self, hand_center, finger_spread):
        """
        Update motion tracker with new hand position
        Returns: (Gesture, strength)
        """
        if hand_center is None:
            self.position_history = []
            return Gesture.NONE, 0.0
        
        # Add to history
        self.position_history.append({
            'pos': hand_center,
            'spread': finger_spread,
            'time': time.time()
        })
        
        if len(self.position_history) > self.history_size:
            self.position_history.pop(0)
        
        if len(self.position_history) < 3:
            return Gesture.NONE, 0.0
        
        # Calculate motion
        gesture, strength = self._detect_motion()
        
        return gesture, strength
    
    def _detect_motion(self):
        """Detect motion direction from position history"""
        if len(self.position_history) < 3:
            return Gesture.NONE, 0.0
        
        # Get start and end positions
        start = self.position_history[0]
        end = self.position_history[-1]
        
        dx = end['pos'][0] - start['pos'][0]
        dy = end['pos'][1] - start['pos'][1]
        
        # Calculate motion magnitude
        magnitude = np.sqrt(dx*dx + dy*dy)
        
        # Check spread change for zoom
        spread_change = end['spread'] - start['spread']
        
        # Determine gesture
        if abs(spread_change) > 0.05:
            if spread_change > 0:
                return Gesture.PINCH_OUT, min(1.0, abs(spread_change) * 5)
            else:
                return Gesture.PINCH_IN, min(1.0, abs(spread_change) * 5)
        
        if magnitude < self.motion_threshold:
            return Gesture.NONE, 0.0
        
        # Determine direction
        strength = min(1.0, magnitude * 10)
        
        if abs(dx) > abs(dy):
            # Horizontal motion
            if dx > self.motion_threshold:
                return Gesture.MOVE_RIGHT, strength
            elif dx < -self.motion_threshold:
                return Gesture.MOVE_LEFT, strength
        else:
            # Vertical motion
            if dy > self.motion_threshold:
                return Gesture.MOVE_DOWN, strength  # Y is inverted
            elif dy < -self.motion_threshold:
                return Gesture.MOVE_UP, strength
        
        return Gesture.NONE, 0.0


class GestureClassifier:
    """Classifies gestures using hand motion"""
    
    def __init__(self):
        self.motion_tracker = MotionTracker()
        self.last_hand_center = None
        self.is_tracking = False
        
    def classify(self, hand_tracker, landmarks):
        """
        Classify gesture based on hand motion
        Returns: (Gesture, confidence)
        """
        if not landmarks:
            self.motion_tracker.position_history = []
            self.is_tracking = False
            return Gesture.NONE, 0.0
        
        # Get hand center
        hand_center = hand_tracker.get_hand_center(landmarks)
        
        # Get finger spread (for zoom)
        finger_spread = self._get_finger_spread(landmarks)
        
        # Check for fist (closed hand - stops motion)
        finger_count = hand_tracker.count_extended_fingers(landmarks)
        if finger_count <= 1:
            return Gesture.FIST, 0.8
        
        # Update motion tracker
        gesture, strength = self.motion_tracker.update(hand_center, finger_spread)
        
        self.is_tracking = True
        return gesture, strength
    
    def _get_finger_spread(self, landmarks):
        """Calculate how spread out the fingers are"""
        if not landmarks:
            return 0
        
        lm = landmarks.landmark
        
        # Distance between thumb tip and pinky tip
        thumb = lm[4]
        pinky = lm[20]
        
        dx = thumb.x - pinky.x
        dy = thumb.y - pinky.y
        
        return np.sqrt(dx*dx + dy*dy)
    
    def get_movement_delta(self, hand_tracker, landmarks):
        """Get raw movement delta for direct control"""
        if not landmarks:
            self.last_hand_center = None
            return (0, 0)
        
        current = hand_tracker.get_hand_center(landmarks)
        
        if self.last_hand_center is None:
            self.last_hand_center = current
            return (0, 0)
        
        dx = current[0] - self.last_hand_center[0]
        dy = current[1] - self.last_hand_center[1]
        
        self.last_hand_center = current
        
        return (dx, dy)


class GestureController:
    """Maps motion gestures to camera actions"""
    
    def __init__(self):
        self.auto_rotate = False
        self.rotation_speed = 1.0
        self.last_action_time = 0
        self.action_cooldown = 0.05  # Fast response
        
    def apply_gesture(self, gesture, strength, camera, delta=(0, 0)):
        """
        Apply gesture to camera control
        Returns: action description string
        """
        current_time = time.time()
        
        if current_time - self.last_action_time < self.action_cooldown:
            return ""
        
        if strength < 0.1:
            return ""
        
        action = ""
        speed = strength * 2.0  # Scale strength to speed
        
        if gesture == Gesture.MOVE_LEFT:
            camera.rotate(-speed * 3, 0)
            action = "← Rotate Left"
            
        elif gesture == Gesture.MOVE_RIGHT:
            camera.rotate(speed * 3, 0)
            action = "→ Rotate Right"
            
        elif gesture == Gesture.MOVE_UP:
            camera.rotate(0, speed * 2)
            action = "↑ Tilt Up"
            
        elif gesture == Gesture.MOVE_DOWN:
            camera.rotate(0, -speed * 2)
            action = "↓ Tilt Down"
            
        elif gesture == Gesture.PINCH_IN:
            camera.zoom(speed)
            action = "🔍 Zoom In"
            
        elif gesture == Gesture.PINCH_OUT:
            camera.zoom(-speed)
            action = "🔍 Zoom Out"
            
        elif gesture == Gesture.FIST:
            # Fist resets or stops
            action = "✊ Hold"
        
        if action:
            self.last_action_time = current_time
        
        return action
    
    def update_auto_rotate(self, camera, delta_time):
        """Update auto-rotation if enabled"""
        if self.auto_rotate:
            camera.rotate(self.rotation_speed * delta_time * 30, 0)
