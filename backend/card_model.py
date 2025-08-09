# %%
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class Image(BaseModel):
    """Represents an image with URL and optional metadata."""
    description: str = Field(..., description="The prompt of the image to be given to an AI image generator.")
    base64: Optional[str] = Field(None, description="The base64 content of the image. Empty at the creation stage.")
    

class Card(BaseModel):
    """A card from the whiteboard"""
    title: Optional[str] = Field(None, description="A short title (<4 words) defining the card")
    body: Optional[str] = Field(None, description="The body of the card, in 1-2 sentences.")
    details: Optional[str] = Field( None, description="Additional details when more space is needed.")
    image: Optional[Image] = Field(None, description="An image illustrating the card.")
    visible: bool = Field(False, description="Whether the card is visible on the whiteboard. Default to False when generating a new card, as the card is not placed yet.")
    w: float
    h: float
    x: float
    y: float

class Example(Card):
    """A concrete example."""
    title: str = Field(..., description="A short title (<4 words) defining the card")
    body: str = Field(..., description="The body of the example, in 1-2 sentences.")
    details: Optional[str] = Field( "", description="Additional details when more space is needed.")
    image: Optional[Image] = Field(..., description="An image illustrating the Example.")
    relatedCard: Optional[Card] = Field(None, description="The card the Example is responding to. The related card comes from the whiteboard.")

class Idea(Card):
    """A card representing a concrete example."""
    title: str = Field(..., description="A short title (<4 words) defining the card")
    body: str = Field(..., description="The short description of the idea in 1-2 sentences.")

class Question(Card):
    """A card representing a concrete example."""
    title: str = Field(..., description="A short title (<4 words) defining the card")
    body: None
