"""
3D Interior Home Design with Hand Gesture Control
Main entry point
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.app import HomeDesignApp


def main():
    """Main entry point"""
    print("Starting 3D Home Interior Design Application...")
    print("Make sure you have a webcam connected for gesture control.")
    print()
    
    app = HomeDesignApp(width=1280, height=720)
    app.run()


if __name__ == "__main__":
    main()
