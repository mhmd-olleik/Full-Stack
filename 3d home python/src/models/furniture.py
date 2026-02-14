"""
Furniture Module
3D furniture models for interior design
"""
import numpy as np
from OpenGL.GL import *
import pyrr


class FurnitureItem:
    """Base class for furniture items"""
    
    def __init__(self, position=(0, 0, 0), rotation=0, scale=1.0):
        self.position = np.array(position, dtype=np.float32)
        self.rotation = rotation  # Y-axis rotation in degrees
        self.scale = scale
        self.vao = None
        self.vbo = None
        self.vertex_count = 0
    
    def get_model_matrix(self):
        """Get the transformation matrix for this furniture"""
        # Translation
        translation = pyrr.matrix44.create_from_translation(self.position)
        
        # Rotation around Y axis
        rotation = pyrr.matrix44.create_from_y_rotation(np.radians(self.rotation))
        
        # Scale
        scale = pyrr.matrix44.create_from_scale([self.scale, self.scale, self.scale])
        
        # Combine: Translation * Rotation * Scale
        return pyrr.matrix44.multiply(pyrr.matrix44.multiply(scale, rotation), translation)
    
    def _setup_buffers(self, vertices):
        """Setup OpenGL buffers"""
        self.vertex_count = len(vertices) // 9
        
        self.vao = glGenVertexArrays(1)
        self.vbo = glGenBuffers(1)
        
        glBindVertexArray(self.vao)
        glBindBuffer(GL_ARRAY_BUFFER, self.vbo)
        
        vertices_array = np.array(vertices, dtype=np.float32)
        glBufferData(GL_ARRAY_BUFFER, vertices_array.nbytes, vertices_array, GL_STATIC_DRAW)
        
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(0))
        glEnableVertexAttribArray(0)
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(12))
        glEnableVertexAttribArray(1)
        glVertexAttribPointer(2, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(24))
        glEnableVertexAttribArray(2)
        
        glBindBuffer(GL_ARRAY_BUFFER, 0)
        glBindVertexArray(0)
    
    def draw(self, shader):
        """Draw the furniture item"""
        if self.vao:
            shader.set_mat4("model", self.get_model_matrix())
            glBindVertexArray(self.vao)
            glDrawArrays(GL_TRIANGLES, 0, self.vertex_count)
            glBindVertexArray(0)
    
    def cleanup(self):
        if self.vbo:
            glDeleteBuffers(1, [self.vbo])
        if self.vao:
            glDeleteVertexArrays(1, [self.vao])


def _add_box(vertices, x, y, z, w, h, d, color):
    """Add a box to vertices list at given position"""
    r, g, b = color
    x1, x2 = x - w/2, x + w/2
    y1, y2 = y, y + h
    z1, z2 = z - d/2, z + d/2
    
    # Front
    vertices.extend([x1,y1,z2, 0,0,1, r,g,b, x2,y1,z2, 0,0,1, r,g,b, x2,y2,z2, 0,0,1, r,g,b])
    vertices.extend([x2,y2,z2, 0,0,1, r,g,b, x1,y2,z2, 0,0,1, r,g,b, x1,y1,z2, 0,0,1, r,g,b])
    # Back
    vertices.extend([x2,y1,z1, 0,0,-1, r,g,b, x1,y1,z1, 0,0,-1, r,g,b, x1,y2,z1, 0,0,-1, r,g,b])
    vertices.extend([x1,y2,z1, 0,0,-1, r,g,b, x2,y2,z1, 0,0,-1, r,g,b, x2,y1,z1, 0,0,-1, r,g,b])
    # Top
    vertices.extend([x1,y2,z2, 0,1,0, r,g,b, x2,y2,z2, 0,1,0, r,g,b, x2,y2,z1, 0,1,0, r,g,b])
    vertices.extend([x2,y2,z1, 0,1,0, r,g,b, x1,y2,z1, 0,1,0, r,g,b, x1,y2,z2, 0,1,0, r,g,b])
    # Bottom
    vertices.extend([x1,y1,z1, 0,-1,0, r,g,b, x2,y1,z1, 0,-1,0, r,g,b, x2,y1,z2, 0,-1,0, r,g,b])
    vertices.extend([x2,y1,z2, 0,-1,0, r,g,b, x1,y1,z2, 0,-1,0, r,g,b, x1,y1,z1, 0,-1,0, r,g,b])
    # Right
    vertices.extend([x2,y1,z2, 1,0,0, r,g,b, x2,y1,z1, 1,0,0, r,g,b, x2,y2,z1, 1,0,0, r,g,b])
    vertices.extend([x2,y2,z1, 1,0,0, r,g,b, x2,y2,z2, 1,0,0, r,g,b, x2,y1,z2, 1,0,0, r,g,b])
    # Left
    vertices.extend([x1,y1,z1, -1,0,0, r,g,b, x1,y1,z2, -1,0,0, r,g,b, x1,y2,z2, -1,0,0, r,g,b])
    vertices.extend([x1,y2,z2, -1,0,0, r,g,b, x1,y2,z1, -1,0,0, r,g,b, x1,y1,z1, -1,0,0, r,g,b])


class Sofa(FurnitureItem):
    """A modern sofa"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        main_color = (0.3, 0.35, 0.55)  # Dark blue
        cushion_color = (0.35, 0.4, 0.6)  # Lighter blue
        
        # Base/seat
        _add_box(vertices, 0, 0, 0, 3.0, 0.4, 1.0, main_color)
        
        # Seat cushions
        _add_box(vertices, 0, 0.4, 0.05, 2.8, 0.25, 0.85, cushion_color)
        
        # Backrest
        _add_box(vertices, 0, 0.65, -0.4, 3.0, 0.7, 0.2, main_color)
        
        # Left armrest
        _add_box(vertices, -1.4, 0.4, 0, 0.2, 0.4, 1.0, main_color)
        
        # Right armrest
        _add_box(vertices, 1.4, 0.4, 0, 0.2, 0.4, 1.0, main_color)
        
        # Legs
        leg_color = (0.2, 0.15, 0.1)
        for x, z in [(-1.2, 0.35), (1.2, 0.35), (-1.2, -0.35), (1.2, -0.35)]:
            _add_box(vertices, x, -0.1, z, 0.08, 0.1, 0.08, leg_color)
        
        self._setup_buffers(vertices)


class CoffeeTable(FurnitureItem):
    """A coffee table"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        top_color = (0.45, 0.35, 0.25)  # Wood brown
        leg_color = (0.25, 0.2, 0.15)   # Dark wood
        
        # Table top
        _add_box(vertices, 0, 0.4, 0, 1.5, 0.08, 0.8, top_color)
        
        # Shelf
        _add_box(vertices, 0, 0.15, 0, 1.3, 0.05, 0.6, top_color)
        
        # Legs
        for x, z in [(-0.6, 0.3), (0.6, 0.3), (-0.6, -0.3), (0.6, -0.3)]:
            _add_box(vertices, x, 0, z, 0.06, 0.4, 0.06, leg_color)
        
        self._setup_buffers(vertices)


class Chair(FurnitureItem):
    """A dining/desk chair"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        seat_color = (0.6, 0.45, 0.35)   # Light wood
        leg_color = (0.3, 0.25, 0.2)     # Dark wood
        
        # Seat
        _add_box(vertices, 0, 0.45, 0, 0.5, 0.05, 0.5, seat_color)
        
        # Backrest
        _add_box(vertices, 0, 0.75, -0.22, 0.45, 0.5, 0.05, seat_color)
        
        # Legs
        for x, z in [(-0.2, 0.2), (0.2, 0.2), (-0.2, -0.2), (0.2, -0.2)]:
            _add_box(vertices, x, 0, z, 0.04, 0.45, 0.04, leg_color)
        
        # Back support legs
        for x in [-0.2, 0.2]:
            _add_box(vertices, x, 0.45, -0.22, 0.04, 0.55, 0.04, leg_color)
        
        self._setup_buffers(vertices)


class DiningTable(FurnitureItem):
    """A dining table"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        top_color = (0.55, 0.4, 0.3)   # Wood
        leg_color = (0.35, 0.25, 0.2)  # Dark wood
        
        # Table top
        _add_box(vertices, 0, 0.75, 0, 2.0, 0.06, 1.0, top_color)
        
        # Legs
        for x, z in [(-0.85, 0.4), (0.85, 0.4), (-0.85, -0.4), (0.85, -0.4)]:
            _add_box(vertices, x, 0, z, 0.08, 0.75, 0.08, leg_color)
        
        self._setup_buffers(vertices)


class TVStand(FurnitureItem):
    """A TV stand with TV"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        stand_color = (0.2, 0.2, 0.22)   # Dark gray
        tv_color = (0.05, 0.05, 0.05)     # Black
        screen_color = (0.1, 0.12, 0.15)  # Dark screen
        
        # Stand base
        _add_box(vertices, 0, 0, 0, 2.0, 0.5, 0.5, stand_color)
        
        # Stand top
        _add_box(vertices, 0, 0.5, 0, 2.2, 0.03, 0.55, stand_color)
        
        # TV frame
        _add_box(vertices, 0, 0.85, -0.15, 1.8, 1.0, 0.08, tv_color)
        
        # TV screen
        _add_box(vertices, 0, 0.85, -0.1, 1.7, 0.9, 0.02, screen_color)
        
        # TV stand/base
        _add_box(vertices, 0, 0.53, 0, 0.4, 0.1, 0.2, tv_color)
        
        self._setup_buffers(vertices)


class Lamp(FurnitureItem):
    """A floor lamp"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        base_color = (0.15, 0.15, 0.15)   # Dark metal
        pole_color = (0.7, 0.65, 0.5)      # Brass
        shade_color = (0.95, 0.9, 0.8)     # Cream
        
        # Base
        _add_box(vertices, 0, 0, 0, 0.35, 0.03, 0.35, base_color)
        
        # Pole
        _add_box(vertices, 0, 0.03, 0, 0.04, 1.5, 0.04, pole_color)
        
        # Lamp shade (simplified cone as stacked boxes)
        for i in range(5):
            h = 0.06
            y = 1.5 + i * h
            w = 0.15 + i * 0.05
            _add_box(vertices, 0, y, 0, w, h, w, shade_color)
        
        self._setup_buffers(vertices)


class Bed(FurnitureItem):
    """A bed with headboard"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        frame_color = (0.45, 0.35, 0.28)    # Wood
        mattress_color = (0.95, 0.95, 0.95)  # White
        pillow_color = (0.9, 0.9, 0.92)      # Off-white
        headboard_color = (0.4, 0.32, 0.25)  # Dark wood
        
        # Bed frame
        _add_box(vertices, 0, 0.15, 0, 2.2, 0.3, 2.5, frame_color)
        
        # Mattress
        _add_box(vertices, 0, 0.45, 0.1, 2.0, 0.25, 2.2, mattress_color)
        
        # Pillows
        _add_box(vertices, -0.5, 0.7, -0.85, 0.6, 0.15, 0.4, pillow_color)
        _add_box(vertices, 0.5, 0.7, -0.85, 0.6, 0.15, 0.4, pillow_color)
        
        # Headboard
        _add_box(vertices, 0, 0.7, -1.2, 2.2, 0.9, 0.1, headboard_color)
        
        # Legs
        leg_color = (0.25, 0.2, 0.15)
        for x, z in [(-1.0, 1.1), (1.0, 1.1), (-1.0, -1.1), (1.0, -1.1)]:
            _add_box(vertices, x, 0, z, 0.08, 0.15, 0.08, leg_color)
        
        self._setup_buffers(vertices)


class Plant(FurnitureItem):
    """A decorative plant in pot"""
    
    def __init__(self, position=(0, 0, 0), rotation=0):
        super().__init__(position, rotation)
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        pot_color = (0.6, 0.35, 0.25)    # Terracotta
        soil_color = (0.25, 0.18, 0.12)  # Dark brown
        leaf_color = (0.2, 0.5, 0.25)    # Green
        
        # Pot
        _add_box(vertices, 0, 0, 0, 0.4, 0.35, 0.4, pot_color)
        
        # Soil
        _add_box(vertices, 0, 0.32, 0, 0.35, 0.05, 0.35, soil_color)
        
        # Leaves (simplified as boxes)
        for angle, h in [(0, 0.4), (45, 0.5), (90, 0.45), (135, 0.55), 
                         (180, 0.42), (225, 0.48), (270, 0.5), (315, 0.45)]:
            rad = np.radians(angle)
            x = np.cos(rad) * 0.1
            z = np.sin(rad) * 0.1
            _add_box(vertices, x, 0.35 + h/2, z, 0.08, h, 0.02, leaf_color)
        
        self._setup_buffers(vertices)


class Rug(FurnitureItem):
    """A decorative rug"""
    
    def __init__(self, position=(0, 0, 0), rotation=0, color=(0.6, 0.3, 0.35)):
        super().__init__(position, rotation)
        self.color = color
        self._create_geometry()
    
    def _create_geometry(self):
        vertices = []
        
        # Main rug
        _add_box(vertices, 0, 0.01, 0, 3.0, 0.02, 2.0, self.color)
        
        # Border
        border_color = tuple(c * 0.7 for c in self.color)
        _add_box(vertices, 0, 0.015, 0, 3.2, 0.01, 2.2, border_color)
        
        self._setup_buffers(vertices)
