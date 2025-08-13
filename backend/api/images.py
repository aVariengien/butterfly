"""
Image generation API endpoints.
"""
from services.image_service import generate_image_with_runware


async def generate_image_endpoint(request: dict) -> dict:
    """Generate an image from a text prompt."""
    prompt = request.get("prompt", "")
    if not prompt:
        return {"success": False, "error": "No prompt provided"}
    
    image_url = await generate_image_with_runware(prompt)
    return {"success": bool(image_url), "image_url": image_url}