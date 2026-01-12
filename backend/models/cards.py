"""
Base Card model and related types.
"""
from typing import Optional
from pydantic import BaseModel, Field


class Card(BaseModel):
    """A card from the whiteboard"""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the card.")
    img_source: Optional[str] = Field(None, description="The URL or base64 data of the card's image")
    w: float
    h: float
    x: float
    y: float


class ReactCard(BaseModel):
    """React card, the type that is sent back to the front end. Not to be confused with the Card class."""
    w: float
    h: float
    x: float
    y: float
    title: Optional[str]
    body: Optional[str]
    card_type: str
    img_prompt: Optional[str] = None
    img_source: Optional[str] = None
    extra_fields: Optional[dict[str, str]] = None
    createdAt: Optional[float] = None  # seconds since session start