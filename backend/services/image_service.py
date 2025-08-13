"""
Service for image generation using Runware API.
"""
import os
from runware import Runware, IImageInference
from config.settings import IMAGE_WIDTH, IMAGE_HEIGHT


async def generate_image_with_runware(prompt: str) -> str:
    """
    Generate an image using Runware API and return as URL.
    
    Args:
        prompt: The text prompt for image generation
        
    Returns:
        Image URL string for the generated image
    """
    try:
        # Initialize Runware client
        runware = Runware(api_key=os.environ["RUNWARE_API_KEY"])
        await runware.connect()
        
        # Create image generation request
        request = IImageInference(
            positivePrompt=prompt,
            model="runware:101@1",
            width=IMAGE_WIDTH,  # Smaller size for card images
            height=IMAGE_HEIGHT
        )
        
        # Generate image
        images = await runware.imageInference(requestImage=request)
        
        if images and len(images) > 0:
            image_url = images[0].imageURL
            return image_url
        else:
            print("No images generated")
            return ""
            
    except Exception as e:
        print(f"Error generating image with Runware: {e}")
        return ""