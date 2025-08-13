"""
Configuration settings for the Butterfly backend.
"""

# Model configuration
PYDANTIC_MODEL_NAME = "openai:gpt-5-mini-2025-08-07"
FAST_MODEL_NAME = "groq/llama-3.3-70b-versatile"

# Available colors for card types (will cycle through these)
AVAILABLE_COLORS = [
    'blue', 'green', 'pink', 'orange', 'violet', 
    'cyan', 'yellow', 'indigo', 'teal', 'lime', 'grape'
]

# Card dimensions
DEFAULT_CARD_WIDTH = 250
DEFAULT_CARD_HEIGHT = 200
DEFAULT_CARD_PADDING = 5

# Image generation settings
IMAGE_WIDTH = 512
IMAGE_HEIGHT = 256

# CORS settings
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]