"""
Scene Manager Module
Manages the 3D scene including room and furniture
"""
import numpy as np
import pyrr
from OpenGL.GL import *

from .shaders import ShaderProgram
from .camera import Camera
from .lighting import LightingSystem


class Scene:
    """Manages the 3D interior scene"""
    
    def __init__(self, width=1280, height=720):
        self.width = width
        self.height = height
        
        # Initialize OpenGL components
        self.shader = None
        self.camera = Camera()
        self.lighting = LightingSystem()
        
        # Scene objects
        self.room = None
        self.furniture = []
        
        # Projection matrix
        self.projection = None
        
    def initialize(self):
        """Initialize OpenGL and scene objects"""
        # Enable depth testing
        glEnable(GL_DEPTH_TEST)
        glDepthFunc(GL_LESS)
        
        # Enable face culling for performance
        glEnable(GL_CULL_FACE)
        glCullFace(GL_BACK)
        
        # Set clear color (sky blue background)
        glClearColor(0.6, 0.75, 0.85, 1.0)
        
        # Compile shaders
        self.shader = ShaderProgram()
        
        # Create projection matrix
        self._update_projection()
        
        # Create room and furniture
        self._setup_scene()
    
    def _update_projection(self):
        """Update the projection matrix"""
        aspect = self.width / self.height
        self.projection = pyrr.matrix44.create_perspective_projection_matrix(
            45.0,   # FOV
            aspect,
            0.1,    # Near plane
            100.0,  # Far plane
            dtype=np.float32
        )
    
    def _setup_scene(self):
        """Create room and place furniture"""
        from ..models.room import Room
        from ..models.furniture import (
            Sofa, CoffeeTable, Chair, DiningTable, 
            TVStand, Lamp, Plant, Rug
        )
        
        # Create room
        self.room = Room(width=12, height=4, depth=12)
        
        # Living room area
        self.furniture.append(Sofa(position=(0, 0, 2), rotation=0))
        self.furniture.append(CoffeeTable(position=(0, 0, 0.5)))
        self.furniture.append(TVStand(position=(0, 0, -5), rotation=0))
        self.furniture.append(Rug(position=(0, 0, 1), color=(0.5, 0.25, 0.3)))
        
        # Corner lamps
        self.furniture.append(Lamp(position=(-5, 0, -5)))
        self.furniture.append(Lamp(position=(5, 0, -5)))
        
        # Plants
        self.furniture.append(Plant(position=(-5.5, 0, 4)))
        self.furniture.append(Plant(position=(5.5, 0, 4)))
        
        # Dining area (left side)
        self.furniture.append(DiningTable(position=(-4, 0, -2)))
        self.furniture.append(Chair(position=(-4, 0, -1), rotation=180))
        self.furniture.append(Chair(position=(-4, 0, -3), rotation=0))
        self.furniture.append(Chair(position=(-3.2, 0, -2), rotation=90))
        self.furniture.append(Chair(position=(-4.8, 0, -2), rotation=-90))
    
    def resize(self, width, height):
        """Handle window resize"""
        self.width = width
        self.height = height
        glViewport(0, 0, width, height)
        self._update_projection()
    
    def render(self):
        """Render the scene"""
        # Clear buffers
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        # Use shader
        self.shader.use()
        
        # Set matrices
        self.shader.set_mat4("view", self.camera.get_view_matrix())
        self.shader.set_mat4("projection", self.projection)
        
        # Set lighting
        self.lighting.apply_to_shader(self.shader, self.camera.position)
        
        # Draw room
        identity = pyrr.matrix44.create_identity(dtype=np.float32)
        self.shader.set_mat4("model", identity)
        self.room.draw()
        
        # Draw furniture
        for item in self.furniture:
            item.draw(self.shader)
    
    def cleanup(self):
        """Clean up resources"""
        if self.room:
            self.room.cleanup()
        for item in self.furniture:
            item.cleanup()
        if self.shader:
            self.shader.cleanup()
