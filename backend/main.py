#!/usr/bin/env python3
"""
Butterfly Backend API
A simple FastAPI server with LiteLLM integration for card management.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import litellm
from litellm import completion, acompletion
from prompts import NEXT_CARD_PROMPT
from pprint import pprint
MODEL_NAME = "gemini/gemini-2.5-flash-preview-05-20"
FAST_MODEL_NAME = "groq/llama3-70b-8192"

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Butterfly Backend",
    description="FastAPI backend for Butterfly card management",
    version="0.1.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class CardDescriptionRequest(BaseModel):
    description: str

class TitleResponse(BaseModel):
    title: str

# Main endpoint for generating titles from card descriptions
@app.post("/generate-title", response_model=TitleResponse)
async def generate_title(request: CardDescriptionRequest):
    """
    Generate a concise title from a card description using AI.
    
    Args:
        request: CardDescriptionRequest containing the description and optional model
    
    Returns:
        TitleResponse with the generated title and model used
    """
    try:
        # Create a prompt for title generation
        prompt = f"""Generate a concise, clear title (maximum 5 words) for the following card description:

Description: {request.description}

Requirements:
- Maximum 5 words
- Clear and descriptive
- No special characters or quotes
- Captures the main topic/action
- Generate only the title

Title:"""

        # Call LiteLLM to generate the title
        response = litellm.completion(
            model=FAST_MODEL_NAME,
            messages=[
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=20,
            temperature=0.7
        )
        
        # Extract the generated title
        generated_title = response.choices[0].message.content.strip()
        
        # Clean up the title (remove quotes, extra whitespace, etc.)
        title = generated_title.replace('"', '').replace("'", '').strip()
        
        return TitleResponse(
            title=title,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate title: {str(e)}"
        )


class Card(BaseModel):
    w: float
    h: float
    x: float
    y: float
    title: str
    body: str
    card_type: str
    image: Optional[str] #base64 image
    details: Optional[str]
    createdAt: Optional[float] = None  # seconds since session start
    

class BoardState(BaseModel):
    cards: list[Card]
    allowed_card_types: list[str]


@app.post("/generate-card", response_model=Card)
async def generate_card(request: BoardState):
    pprint(request)
    prompt = NEXT_CARD_PROMPT.format(board=request.model_dump_json())
    result = completion(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format=Card,
        reasoning_effort="medium",
    )
    pprint(result.choices[0].message.content)
    card = Card.model_validate_json(result.choices[0].message.content)
    
    print(card)
    return card


if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )