"""
Pytest configuration and fixtures for type checking tests.
"""
import sys
import os
import pytest

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def sample_card_types():
    """Get the default card types for testing."""
    from services.code_service import get_card_types_from_code
    
    # Default sidepanel code with nested card types
    default_code = '''
class Example(Card):
    """Example card representing a concrete instance or demonstration."""
    title: str = Field(..., description="A concise title for the example")
    body: str = Field(..., description="The main content describing the example")
    img_source: Optional[str] = Field(None, description="URL or path to an image that illustrates the example")
    details: Optional[str] = Field(None, description="Additional details or context about the example")
    w: float = Field(300.0, description="Width of the card in pixels")
    h: float = Field(200.0, description="Height of the card in pixels") 
    x: float = Field(0.0, description="X coordinate position on canvas")
    y: float = Field(0.0, description="Y coordinate position on canvas")
    user_only: bool = Field(False, description="Whether this card is only visible to the user")

class ContrastingExamplePair(Card):
    """Card showing examples of what something is and what it isn't."""
    title: str = Field(..., description="Title of the contrasting pair")
    body: str = Field(..., description="Description of what this contrast illustrates")
    img_source: Optional[str] = Field(None, description="Optional image for the main card")
    details: Optional[str] = Field(None, description="Additional context or details")
    w: float = Field(300.0, description="Width of the card")
    h: float = Field(250.0, description="Height of the card")
    x: float = Field(0.0, description="X position on canvas")
    y: float = Field(0.0, description="Y position on canvas")
    claim_title: str = Field(..., description="The concept being contrasted")
    affirming_example: Example = Field(..., description="An example that demonstrates the concept well")
    counter_example: Example = Field(..., description="A counter-example that shows what the concept is not")
    generation_only: bool = Field(False, description="Whether this card is only for generation purposes")
'''
    
    success, error_msg, card_types = get_card_types_from_code(default_code)
    assert success, f"Failed to load default card types: {error_msg}"
    return card_types