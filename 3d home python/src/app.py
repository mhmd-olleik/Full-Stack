"""
Main Application Module
Combines 3D rendering with gesture control
"""
import pygame
from pygame.locals import *
from OpenGL.GL import *
import cv2
import numpy as np
import time
import threading


class HomeDesignApp:
    """Main application for 3D Home Interior Design with Gesture Control"""
    
    def __init__(self, width=1280, height=720):
        self.width = width
        self.height = height
        self.running = True
        
        # Components
        self.scene = None
        self.hand_tracker = None
        self.gesture_classifier = None
        self.gesture_controller = None
        
        # Camera capture
        self.cap = None
        self.camera_width = 320
        self.camera_height = 240
        self.camera_frame = None
        self.camera_lock = threading.Lock()
        
        # Timing
        self.clock = None
        self.last_time = 0
        self.fps = 0
        
        # UI state
        self.show_camera = True
        self.current_action = ""
        self.action_display_time = 0
    
    def initialize(self):
        """Initialize all components"""
        # Initialize Pygame and OpenGL
        pygame.init()
        pygame.display.set_caption("3D Home Interior Design - Hand Gesture Control")
        
        # Set OpenGL attributes - use simpler settings for compatibility
        pygame.display.gl_set_attribute(pygame.GL_DEPTH_SIZE, 24)
        
        # Create window
        self.screen = pygame.display.set_mode(
            (self.width, self.height),
            DOUBLEBUF | OPENGL | RESIZABLE
        )
        
        # Initialize scene
        from .renderer.scene import Scene
        self.scene = Scene(self.width, self.height)
        self.scene.initialize()
        
        # Initialize gesture recognition
        from .gesture.hand_tracker import HandTracker
        from .gesture.gesture_classifier import GestureClassifier, GestureController
        
        self.hand_tracker = HandTracker()
        self.gesture_classifier = GestureClassifier()
        self.gesture_controller = GestureController()
        
        # Initialize camera
        self.cap = cv2.VideoCapture(0)
        if self.cap.isOpened():
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.camera_width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.camera_height)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        # Initialize clock
        self.clock = pygame.time.Clock()
        self.last_time = time.time()
        
        print("=" * 50)
        print("  3D Home Interior Design - Motion Control")
        print("=" * 50)
        print("\nControls:")
        print("  Hand Motion (move your hand):")
        print("    👈 Move Left   -> Rotate Left")
        print("    👉 Move Right  -> Rotate Right")
        print("    👆 Move Up     -> Tilt Up")
        print("    👇 Move Down   -> Tilt Down")
        print("    🖐️ Spread fingers -> Zoom Out")
        print("    🤏 Close fingers  -> Zoom In")
        print("    ✊ Fist        -> Stop/Hold")
        print("\n  Keyboard:")
        print("    W/A/S/D       -> Move Camera Target")
        print("    Arrow Keys    -> Rotate Camera")
        print("    Q/E           -> Zoom Out/In")
        print("    R             -> Reset Camera")
        print("    C             -> Toggle Camera View")
        print("    ESC           -> Exit")
        print("=" * 50)
    
    def handle_events(self):
        """Handle Pygame events"""
        for event in pygame.event.get():
            if event.type == QUIT:
                self.running = False
            
            elif event.type == VIDEORESIZE:
                self.width, self.height = event.w, event.h
                self.screen = pygame.display.set_mode(
                    (self.width, self.height),
                    DOUBLEBUF | OPENGL | RESIZABLE
                )
                self.scene.resize(self.width, self.height)
            
            elif event.type == KEYDOWN:
                self._handle_keydown(event.key)
    
    def _handle_keydown(self, key):
        """Handle keyboard input"""
        camera = self.scene.camera
        
        if key == K_ESCAPE:
            self.running = False
        elif key == K_r:
            camera.reset()
        elif key == K_c:
            self.show_camera = not self.show_camera
            if not self.show_camera:
                cv2.destroyWindow("Gesture Camera")
        
        # Camera movement
        elif key == K_w:
            camera.move_target(0, 0, -1)
        elif key == K_s:
            camera.move_target(0, 0, 1)
        elif key == K_a:
            camera.move_target(-1, 0, 0)
        elif key == K_d:
            camera.move_target(1, 0, 0)
        
        # Camera rotation
        elif key == K_LEFT:
            camera.rotate(-5, 0)
        elif key == K_RIGHT:
            camera.rotate(5, 0)
        elif key == K_UP:
            camera.rotate(0, 3)
        elif key == K_DOWN:
            camera.rotate(0, -3)
        
        # Zoom
        elif key == K_q:
            camera.zoom(-2)
        elif key == K_e:
            camera.zoom(2)
    
    def handle_keyboard_held(self):
        """Handle held keyboard keys for smooth movement"""
        keys = pygame.key.get_pressed()
        camera = self.scene.camera
        
        # Smooth rotation with arrow keys
        if keys[K_LEFT]:
            camera.rotate(-1, 0)
        if keys[K_RIGHT]:
            camera.rotate(1, 0)
        if keys[K_UP]:
            camera.rotate(0, 0.5)
        if keys[K_DOWN]:
            camera.rotate(0, -0.5)
    
    def process_gestures(self):
        """Process hand gestures from camera"""
        if not self.cap or not self.cap.isOpened():
            return None
        
        ret, frame = self.cap.read()
        if not ret:
            return None
        
        # Flip horizontally for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Process hand tracking
        frame, landmarks, handedness = self.hand_tracker.process_frame(frame)
        
        # Classify gesture
        gesture, confidence = self.gesture_classifier.classify(
            self.hand_tracker, landmarks
        )
        
        # Apply gesture to camera
        if landmarks:
            delta = self.gesture_classifier.get_movement_delta(
                self.hand_tracker, landmarks
            )
            action = self.gesture_controller.apply_gesture(
                gesture, confidence, self.scene.camera, delta
            )
            
            if action:
                self.current_action = action
                self.action_display_time = time.time()
        
        # Draw gesture info on frame
        self._draw_gesture_info(frame, gesture, confidence)
        
        return frame
    
    def _draw_gesture_info(self, frame, gesture, confidence):
        """Draw gesture information on camera frame"""
        # Draw gesture name
        gesture_name = gesture.name.replace('_', ' ')
        cv2.putText(frame, f"Gesture: {gesture_name}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Draw confidence bar
        bar_width = int(confidence * 100)
        cv2.rectangle(frame, (10, 35), (10 + bar_width, 45), (0, 255, 0), -1)
        cv2.rectangle(frame, (10, 35), (110, 45), (255, 255, 255), 1)
        
        # Draw current action
        if self.current_action:
            cv2.putText(frame, f"Action: {self.current_action}", (10, 65),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)
    
    def update(self):
        """Update application state"""
        current_time = time.time()
        delta_time = current_time - self.last_time
        self.last_time = current_time
        
        # Update FPS
        if delta_time > 0:
            self.fps = 1.0 / delta_time
        
        # Update auto-rotation
        self.gesture_controller.update_auto_rotate(self.scene.camera, delta_time)
        
        # Clear action display after timeout
        if current_time - self.action_display_time > 1.0:
            self.current_action = ""
    
    def render(self):
        """Render the application"""
        # Render 3D scene
        self.scene.render()
        
        # Process gestures and show camera in separate window
        camera_frame = self.process_gestures()
        if camera_frame is not None and self.show_camera:
            cv2.imshow("Gesture Camera", camera_frame)
            cv2.waitKey(1)
        
        # Update display
        pygame.display.flip()
    
    def run(self):
        """Main application loop"""
        try:
            self.initialize()
            
            while self.running:
                self.handle_events()
                self.handle_keyboard_held()
                self.update()
                self.render()
                
                # Cap framerate
                self.clock.tick(60)
        
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        print("\nShutting down...")
        
        if self.cap:
            self.cap.release()
        
        if self.hand_tracker:
            self.hand_tracker.cleanup()
        
        if self.scene:
            self.scene.cleanup()
        
        cv2.destroyAllWindows()
        pygame.quit()
        
        print("Goodbye!")
