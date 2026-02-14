"""
OpenGL Shader Module
Handles shader compilation and uniform management
"""
from OpenGL.GL import *
import numpy as np


# Vertex Shader - handles 3D transformations
VERTEX_SHADER = """
#version 330 core

layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec3 aColor;

out vec3 FragPos;
out vec3 Normal;
out vec3 Color;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main()
{
    FragPos = vec3(model * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(model))) * aNormal;
    Color = aColor;
    gl_Position = projection * view * model * vec4(aPos, 1.0);
}
"""

# Fragment Shader - handles lighting and colors
FRAGMENT_SHADER = """
#version 330 core

in vec3 FragPos;
in vec3 Normal;
in vec3 Color;

out vec4 FragColor;

uniform vec3 lightPos;
uniform vec3 viewPos;
uniform vec3 lightColor;

void main()
{
    // Ambient lighting
    float ambientStrength = 0.3;
    vec3 ambient = ambientStrength * lightColor;
    
    // Diffuse lighting
    vec3 norm = normalize(Normal);
    vec3 lightDir = normalize(lightPos - FragPos);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;
    
    // Specular lighting
    float specularStrength = 0.5;
    vec3 viewDir = normalize(viewPos - FragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
    vec3 specular = specularStrength * spec * lightColor;
    
    // Combine lighting with object color
    vec3 result = (ambient + diffuse + specular) * Color;
    FragColor = vec4(result, 1.0);
}
"""


class ShaderProgram:
    """OpenGL Shader Program Manager"""
    
    def __init__(self):
        self.program_id = None
        self._compile_shaders()
    
    def _compile_shader(self, source, shader_type):
        """Compile a single shader"""
        shader = glCreateShader(shader_type)
        glShaderSource(shader, source)
        glCompileShader(shader)
        
        # Check for compilation errors
        if not glGetShaderiv(shader, GL_COMPILE_STATUS):
            error = glGetShaderInfoLog(shader).decode()
            shader_name = "Vertex" if shader_type == GL_VERTEX_SHADER else "Fragment"
            raise RuntimeError(f"{shader_name} shader compilation error: {error}")
        
        return shader
    
    def _compile_shaders(self):
        """Compile and link shader program"""
        vertex_shader = self._compile_shader(VERTEX_SHADER, GL_VERTEX_SHADER)
        fragment_shader = self._compile_shader(FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        
        # Create and link program
        self.program_id = glCreateProgram()
        glAttachShader(self.program_id, vertex_shader)
        glAttachShader(self.program_id, fragment_shader)
        glLinkProgram(self.program_id)
        
        # Check for linking errors
        if not glGetProgramiv(self.program_id, GL_LINK_STATUS):
            error = glGetProgramInfoLog(self.program_id).decode()
            raise RuntimeError(f"Shader program linking error: {error}")
        
        # Clean up shaders (no longer needed after linking)
        glDeleteShader(vertex_shader)
        glDeleteShader(fragment_shader)
    
    def use(self):
        """Activate this shader program"""
        glUseProgram(self.program_id)
    
    def set_mat4(self, name, matrix):
        """Set a 4x4 matrix uniform"""
        location = glGetUniformLocation(self.program_id, name)
        glUniformMatrix4fv(location, 1, GL_FALSE, matrix)
    
    def set_vec3(self, name, value):
        """Set a vec3 uniform"""
        location = glGetUniformLocation(self.program_id, name)
        if isinstance(value, np.ndarray):
            glUniform3fv(location, 1, value)
        else:
            glUniform3f(location, *value)
    
    def set_float(self, name, value):
        """Set a float uniform"""
        location = glGetUniformLocation(self.program_id, name)
        glUniform1f(location, value)
    
    def cleanup(self):
        """Delete shader program"""
        if self.program_id:
            glDeleteProgram(self.program_id)
