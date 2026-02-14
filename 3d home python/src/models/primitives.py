"""
3D Primitives Module
Basic geometric shapes for building furniture and room elements
"""
import numpy as np
from OpenGL.GL import *


class Mesh:
    """Base class for 3D meshes"""
    
    def __init__(self):
        self.vao = None
        self.vbo = None
        self.vertex_count = 0
    
    def setup_buffers(self, vertices):
        """Setup OpenGL buffers for the mesh"""
        self.vertex_count = len(vertices) // 9  # 3 pos + 3 normal + 3 color
        
        # Create VAO and VBO
        self.vao = glGenVertexArrays(1)
        self.vbo = glGenBuffers(1)
        
        glBindVertexArray(self.vao)
        glBindBuffer(GL_ARRAY_BUFFER, self.vbo)
        
        vertices_array = np.array(vertices, dtype=np.float32)
        glBufferData(GL_ARRAY_BUFFER, vertices_array.nbytes, vertices_array, GL_STATIC_DRAW)
        
        # Position attribute (location = 0)
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(0))
        glEnableVertexAttribArray(0)
        
        # Normal attribute (location = 1)
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(12))
        glEnableVertexAttribArray(1)
        
        # Color attribute (location = 2)
        glVertexAttribPointer(2, 3, GL_FLOAT, GL_FALSE, 36, ctypes.c_void_p(24))
        glEnableVertexAttribArray(2)
        
        glBindBuffer(GL_ARRAY_BUFFER, 0)
        glBindVertexArray(0)
    
    def draw(self):
        """Draw the mesh"""
        if self.vao:
            glBindVertexArray(self.vao)
            glDrawArrays(GL_TRIANGLES, 0, self.vertex_count)
            glBindVertexArray(0)
    
    def cleanup(self):
        """Clean up OpenGL resources"""
        if self.vbo:
            glDeleteBuffers(1, [self.vbo])
        if self.vao:
            glDeleteVertexArrays(1, [self.vao])


def create_cube_vertices(width, height, depth, color):
    """
    Create vertices for a cube/box
    Returns list of vertices with position, normal, and color
    """
    w, h, d = width / 2, height / 2, depth / 2
    r, g, b = color
    
    vertices = []
    
    # Front face
    vertices.extend([
        -w, -h,  d,  0, 0, 1,  r, g, b,
         w, -h,  d,  0, 0, 1,  r, g, b,
         w,  h,  d,  0, 0, 1,  r, g, b,
         w,  h,  d,  0, 0, 1,  r, g, b,
        -w,  h,  d,  0, 0, 1,  r, g, b,
        -w, -h,  d,  0, 0, 1,  r, g, b,
    ])
    
    # Back face
    vertices.extend([
         w, -h, -d,  0, 0, -1,  r, g, b,
        -w, -h, -d,  0, 0, -1,  r, g, b,
        -w,  h, -d,  0, 0, -1,  r, g, b,
        -w,  h, -d,  0, 0, -1,  r, g, b,
         w,  h, -d,  0, 0, -1,  r, g, b,
         w, -h, -d,  0, 0, -1,  r, g, b,
    ])
    
    # Top face
    vertices.extend([
        -w,  h,  d,  0, 1, 0,  r, g, b,
         w,  h,  d,  0, 1, 0,  r, g, b,
         w,  h, -d,  0, 1, 0,  r, g, b,
         w,  h, -d,  0, 1, 0,  r, g, b,
        -w,  h, -d,  0, 1, 0,  r, g, b,
        -w,  h,  d,  0, 1, 0,  r, g, b,
    ])
    
    # Bottom face
    vertices.extend([
        -w, -h, -d,  0, -1, 0,  r, g, b,
         w, -h, -d,  0, -1, 0,  r, g, b,
         w, -h,  d,  0, -1, 0,  r, g, b,
         w, -h,  d,  0, -1, 0,  r, g, b,
        -w, -h,  d,  0, -1, 0,  r, g, b,
        -w, -h, -d,  0, -1, 0,  r, g, b,
    ])
    
    # Right face
    vertices.extend([
         w, -h,  d,  1, 0, 0,  r, g, b,
         w, -h, -d,  1, 0, 0,  r, g, b,
         w,  h, -d,  1, 0, 0,  r, g, b,
         w,  h, -d,  1, 0, 0,  r, g, b,
         w,  h,  d,  1, 0, 0,  r, g, b,
         w, -h,  d,  1, 0, 0,  r, g, b,
    ])
    
    # Left face
    vertices.extend([
        -w, -h, -d,  -1, 0, 0,  r, g, b,
        -w, -h,  d,  -1, 0, 0,  r, g, b,
        -w,  h,  d,  -1, 0, 0,  r, g, b,
        -w,  h,  d,  -1, 0, 0,  r, g, b,
        -w,  h, -d,  -1, 0, 0,  r, g, b,
        -w, -h, -d,  -1, 0, 0,  r, g, b,
    ])
    
    return vertices


def create_plane_vertices(width, depth, color, y=0):
    """Create vertices for a horizontal plane (floor/ceiling)"""
    w, d = width / 2, depth / 2
    r, g, b = color
    
    vertices = [
        -w, y, -d,  0, 1, 0,  r, g, b,
         w, y, -d,  0, 1, 0,  r, g, b,
         w, y,  d,  0, 1, 0,  r, g, b,
         w, y,  d,  0, 1, 0,  r, g, b,
        -w, y,  d,  0, 1, 0,  r, g, b,
        -w, y, -d,  0, 1, 0,  r, g, b,
    ]
    
    return vertices


class Cube(Mesh):
    """A simple cube mesh"""
    
    def __init__(self, width=1, height=1, depth=1, color=(0.8, 0.8, 0.8)):
        super().__init__()
        vertices = create_cube_vertices(width, height, depth, color)
        self.setup_buffers(vertices)


class Plane(Mesh):
    """A horizontal plane mesh"""
    
    def __init__(self, width=10, depth=10, color=(0.5, 0.5, 0.5), y=0):
        super().__init__()
        vertices = create_plane_vertices(width, depth, color, y)
        self.setup_buffers(vertices)
