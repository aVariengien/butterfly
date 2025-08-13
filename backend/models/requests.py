"""
Request models for API endpoints.
"""
from typing import Union, List
from pydantic import BaseModel, Field
from .cards import ReactCard, Card


class CardDescriptionRequest(BaseModel):
    description: str


class CodeExecutionRequest(BaseModel):
    code: str


class BoardState(BaseModel):
    cards: List[ReactCard]
    sidepanel_code: str = Field(..., description="Python code from the sidepanel defining card types")
    intention: str = Field(..., description="User's intention/goal for the session")


class FluidTypeCheckingRequest(BaseModel):
    card: Union[ReactCard, Card]
    sidepanel_code: str