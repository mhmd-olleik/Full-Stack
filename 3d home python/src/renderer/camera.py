"""
3D Camera Module
Handles camera position, rotation, and view matrix calculations
"""
import numpy as np
import pyrr


class Camera:
    """3D Camera for scene navigation"""
    
    def __init__(self, position=None, target=None, up=None):
        self.position = np.array(position if position else [0.0, 5.0, 15.0], dtype=np.float32)
        self.target = np.array(target if target else [0.0, 0.0, 0.0], dtype=np.float32)
        self.up = np.array(up if up else [0.0, 1.0, 0.0], dtype=np.float32)
        
        # Camera rotation angles (in degrees)
        self.yaw = -90.0
        self.pitch = -20.0
        
        # Movement speed
        self.move_speed = 0.3
        self.rotation_speed = 2.0
        self.zoom_speed = 0.5
        
        # Distance from target for orbit mode
        self.distance = 15.0
        self.min_distance = 3.0
        self.max_distance = 50.0
        
        self._update_vectors()
    
    def _update_vectors(self):
        """Update camera direction vectors based on yaw and pitch"""
        # Calculate direction from angles
        yaw_rad = np.radians(self.yaw)
        pitch_rad = np.radians(self.pitch)
        
        direction = np.array([
            np.cos(yaw_rad) * np.cos(pitch_rad),
            np.sin(pitch_rad),
            np.sin(yaw_rad) * np.cos(pitch_rad)
        ], dtype=np.float32)
        
        self.front = direction / np.linalg.norm(direction)
        self.right = np.cross(self.front, self.up)
        self.right = self.right / np.linalg.norm(self.right)
        
        # Update position based on orbit around target
        self.position = self.target - self.front * self.distance
    
    def get_view_matrix(self):
        """Get the view matrix for rendering"""
        return pyrr.matrix44.create_look_at(
            self.position,
            self.target,
            self.up,
            dtype=np.float32
        )
    
    def rotate(self, delta_yaw, delta_pitch):
        """Rotate camera around target"""
        self.yaw += delta_yaw * self.rotation_speed
        self.pitch += delta_pitch * self.rotation_speed
        
        # Clamp pitch to prevent flipping
        self.pitch = np.clip(self.pitch, -89.0, 89.0)
        
        self._update_vectors()
    
    def zoom(self, delta):
        """Zoom in/out (change distance from target)"""
        self.distance -= delta * self.zoom_speed
        self.distance = np.clip(self.distance, self.min_distance, self.max_distance)
        self._update_vectors()
    
    def move_target(self, delta_x, delta_y, delta_z):
        """Move the camera target point"""
        self.target[0] += delta_x * self.move_speed
        self.target[1] += delta_y * self.move_speed
        self.target[2] += delta_z * self.move_speed
        self._update_vectors()
    
    def reset(self):
        """Reset camera to default position"""
        self.position = np.array([0.0, 5.0, 15.0], dtype=np.float32)
        self.target = np.array([0.0, 0.0, 0.0], dtype=np.float32)
        self.yaw = -90.0
        self.pitch = -20.0
        self.distance = 15.0
        self._update_vectors()
