"""
Room Module
Creates 3D room environment (floor, walls, ceiling)
"""
import numpy as np
from OpenGL.GL import *


class Room:
    """3D Room with floor, walls, and ceiling"""
    
    def __init__(self, width=12, height=4, depth=12):
        self.width = width
        self.height = height
        self.depth = depth
        
        self.vao = None
        self.vbo = None
        self.vertex_count = 0
        
        # Colors
        self.floor_color = (0.6, 0.5, 0.4)      # Wooden floor
        self.wall_color = (0.95, 0.93, 0.88)    # Cream walls
        self.ceiling_color = (1.0, 1.0, 1.0)    # White ceiling
        
        self._create_geometry()
    
    def _create_geometry(self):
        """Create room geometry"""
        w, h, d = self.width / 2, self.height, self.depth / 2
        
        vertices = []
        
        # Floor
        fc = self.floor_color
        vertices.extend([
            -w, 0, -d,  0, 1, 0,  *fc,
             w, 0, -d,  0, 1, 0,  *fc,
             w, 0,  d,  0, 1, 0,  *fc,
             w, 0,  d,  0, 1, 0,  *fc,
            -w, 0,  d,  0, 1, 0,  *fc,
            -w, 0, -d,  0, 1, 0,  *fc,
        ])
        
        # Ceiling
        cc = self.ceiling_color
        vertices.extend([
            -w, h,  d,  0, -1, 0,  *cc,
             w, h,  d,  0, -1, 0,  *cc,
             w, h, -d,  0, -1, 0,  *cc,
             w, h, -d,  0, -1, 0,  *cc,
            -w, h, -d,  0, -1, 0,  *cc,
            -w, h,  d,  0, -1, 0,  *cc,
        ])
        
        # Back wall
        wc = self.wall_color
        vertices.extend([
            -w, 0, -d,  0, 0, 1,  *wc,
            -w, h, -d,  0, 0, 1,  *wc,
             w, h, -d,  0, 0, 1,  *wc,
             w, h, -d,  0, 0, 1,  *wc,
             w, 0, -d,  0, 0, 1,  *wc,
            -w, 0, -d,  0, 0, 1,  *wc,
        ])
        
        # Front wall (with opening for viewing)
        # Left part
        vertices.extend([
            -w, 0,  d,  0, 0, -1,  *wc,
            -w, h,  d,  0, 0, -1,  *wc,
            -w + 2, h,  d,  0, 0, -1,  *wc,
            -w + 2, h,  d,  0, 0, -1,  *wc,
            -w + 2, 0,  d,  0, 0, -1,  *wc,
            -w, 0,  d,  0, 0, -1,  *wc,
        ])
        # Right part
        vertices.extend([
             w - 2, 0,  d,  0, 0, -1,  *wc,
             w - 2, h,  d,  0, 0, -1,  *wc,
             w, h,  d,  0, 0, -1,  *wc,
             w, h,  d,  0, 0, -1,  *wc,
             w, 0,  d,  0, 0, -1,  *wc,
             w - 2, 0,  d,  0, 0, -1,  *wc,
        ])
        
        # Left wall
        vertices.extend([
            -w, 0,  d,  1, 0, 0,  *wc,
            -w, 0, -d,  1, 0, 0,  *wc,
            -w, h, -d,  1, 0, 0,  *wc,
            -w, h, -d,  1, 0, 0,  *wc,
            -w, h,  d,  1, 0, 0,  *wc,
            -w, 0,  d,  1, 0, 0,  *wc,
        ])
        
        # Right wall
        vertices.extend([
             w, 0, -d,  -1, 0, 0,  *wc,
             w, 0,  d,  -1, 0, 0,  *wc,
             w, h,  d,  -1, 0, 0,  *wc,
             w, h,  d,  -1, 0, 0,  *wc,
             w, h, -d,  -1, 0, 0,  *wc,
             w, 0, -d,  -1, 0, 0,  *wc,
        ])
        
        self._setup_buffers(vertices)
    
    def _setup_buffers(self, vertices):
        """Setup OpenGL buffers"""
        self.vertex_count = len(vertices) // 9
        
        self.vao = glGenVertexArrays(1)
        self.vbo = glGenBuffers(1)
        
        glBindVertexArray(self.vao)
        glBindBuffer(GL_ARRAY_BUFFER, self.vbo)
        
        vertices_array = np.array(vertices, dtype=np.float32)
        glBufferData(GL_ARRAY_BUFFER, vertices_array.nbytes, vertices_array, GL_STATIC_DRAW)
        
        # Position attribute
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(0))
        glEnableVertexAttribArray(0)
        
        # Normal attribute
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(12))
        glEnableVertexAttribArray(1)
        
        # Color attribute
        glVertexAttribPointer(2, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(24))
        glEnableVertexAttribArray(2)
        
        glBindBuffer(GL_ARRAY_BUFFER, 0)
        glBindVertexArray(0)
    
    def draw(self):
        """Draw the room"""
        if self.vao:
            glBindVertexArray(self.vao)
            glDrawArrays(GL_TRIANGLES, 0, self.vertex_count)
            glBindVertexArray(0)
    
    def cleanup(self):
        """Clean up resources"""
        if self.vbo:
            glDeleteBuffers(1, [self.vbo])
        if self.vao:
            glDeleteVertexArrays(1, [self.vao])
