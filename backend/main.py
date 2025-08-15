#!/usr/bin/env python3
"""
Butterfly Backend API
A simple FastAPI server with LiteLLM integration for card management.
"""

import os
import logfire
import nest_asyncio
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import models
from models.cards import ReactCard
from models.requests import (
    CardDescriptionRequest, 
    CodeExecutionRequest, 
    BoardState, 
    FluidTypeCheckingRequest
)
from models.responses import (
    TitleResponse, 
    CodeExecutionResponse, 
    FluidTypeCheckingResponse
)

# Import API handlers
from api.cards import generate_title, generate_card_endpoint, generate_card_with_base_model_endpoint, fluid_type_checking
from api.code import execute_code
from api.images import generate_image_endpoint

# Import configuration
from config.settings import ALLOWED_ORIGINS

# Apply nested asyncio for compatibility
nest_asyncio.apply()

# Configure logging
logfire.configure()  
logfire.instrument_pydantic_ai() 

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
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Routes
@app.post("/generate-title", response_model=TitleResponse)
async def generate_title_endpoint(request: CardDescriptionRequest):
    """Generate a concise title from a card description using AI."""
    return await generate_title(request)


@app.post("/execute-code", response_model=CodeExecutionResponse)
async def execute_code_endpoint(request: CodeExecutionRequest):
    """Execute Python code safely and return card type configurations."""
    return await execute_code(request)


@app.post("/fluid-type-checking", response_model=FluidTypeCheckingResponse)
async def fluid_type_checking_endpoint(request: FluidTypeCheckingRequest):
    """Perform fluid type checking on a card by validating field values against their descriptions."""
    return await fluid_type_checking(request)


@app.post("/generate-card", response_model=List[ReactCard])
async def generate_card_route(request: BoardState):
    """Generate a new card based on the board state and intention."""
    return await generate_card_endpoint(request)


@app.post("/generate-card-base-model", response_model=List[ReactCard])
async def generate_card_base_model_route(request: BoardState):
    """Generate cards using the enhanced base model strategy with Claude completions."""
    return await generate_card_with_base_model_endpoint(request)


@app.post("/generate-image")
async def generate_image_route(request: dict):
    """Generate an image from a text prompt."""
    return await generate_image_endpoint(request)


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