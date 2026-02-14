"""
Lighting Module
Handles scene lighting configuration
"""
import numpy as np


class Light:
    """Scene light source"""
    
    def __init__(self, position=None, color=None):
        self.position = np.array(
            position if position else [10.0, 15.0, 10.0],
            dtype=np.float32
        )
        self.color = np.array(
            color if color else [1.0, 1.0, 0.95],  # Warm white
            dtype=np.float32
        )
        self.intensity = 1.0
    
    def set_position(self, x, y, z):
        """Set light position"""
        self.position = np.array([x, y, z], dtype=np.float32)
    
    def set_color(self, r, g, b):
        """Set light color (0.0 to 1.0)"""
        self.color = np.array([r, g, b], dtype=np.float32)
    
    def get_effective_color(self):
        """Get color adjusted by intensity"""
        return self.color * self.intensity


class LightingSystem:
    """Manages multiple lights in the scene"""
    
    def __init__(self):
        # Main directional light (sun-like)
        self.main_light = Light(
            position=[10.0, 20.0, 10.0],
            color=[1.0, 0.98, 0.9]
        )
        
        # Ambient light level
        self.ambient_intensity = 0.3
        self.ambient_color = np.array([0.4, 0.4, 0.5], dtype=np.float32)
    
    def apply_to_shader(self, shader, camera_pos):
        """Apply lighting uniforms to shader"""
        shader.set_vec3("lightPos", self.main_light.position)
        shader.set_vec3("lightColor", self.main_light.get_effective_color())
        shader.set_vec3("viewPos", camera_pos)
