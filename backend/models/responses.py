"""
Response models for API endpoints.
"""
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class TitleResponse(BaseModel):
    title: str


class CardTypeConfig(BaseModel):
    colors: Dict[str, str]
    layouts: Dict[str, Dict[str, bool]]


class CodeExecutionResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    card_types: Optional[CardTypeConfig] = None


class FieldValidationResult(BaseModel):
    score: int = Field(..., description="Score from 1 to 10 for how well the value matches the description")
    reasoning: str = Field(..., description="Explanation of the score")


class FluidTypeCheckLLMResponse(BaseModel):
    score: int = Field(..., description="Score from 1 to 10 for how well the value matches the description")
    reasoning: str = Field(..., description="Clear explanation of the score")


class FluidTypeCheckingResponse(BaseModel):
    errors: List[str] = Field(default=[], description="List of error messages for fields with score < 5")
    field_scores: Dict[str, FieldValidationResult] = Field(default={}, description="Detailed scores and reasoning for each field")