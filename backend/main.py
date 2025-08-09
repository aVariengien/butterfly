#!/usr/bin/env python3
"""
Butterfly Backend API
A simple FastAPI server with LiteLLM integration for card management.
"""

import os
import sys
import subprocess
import tempfile
import json
import inspect
from typing import Optional, Dict, Any, Type, Union, get_args, get_origin, Annotated, Literal, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import litellm
from litellm import completion, acompletion
from prompts import create_card_generation_prompt
from pprint import pprint
from card_model import Card, Image, Example, Idea, Question
from pydantic import BaseModel, Field, create_model
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings

import nest_asyncio
nest_asyncio.apply()


PYDANTIC_MODEL_NAME = 'groq:openai/gpt-oss-20b'
FAST_MODEL_NAME = "groq/llama3-70b-8192"

# Available colors for card types (will cycle through these)
AVAILABLE_COLORS = [
    'blue', 'green', 'pink', 'orange', 'violet', 
    'cyan', 'yellow', 'indigo', 'teal', 'lime', 'grape'
]

# Removed global store - card types are now executed fresh each time

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


class ReactCard(BaseModel): # React card, the type that is sent back to the front end. Not to be confused with the Card class.
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
    cards: list[ReactCard]
    sidepanel_code: str = Field(..., description="Python code from the sidepanel defining card types")
    intention: str = Field(..., description="User's intention/goal for the session")


class CodeExecutionRequest(BaseModel):
    code: str


class CardTypeConfig(BaseModel):
    colors: Dict[str, str]
    layouts: Dict[str, Dict[str, bool]]


class CodeExecutionResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    card_types: Optional[CardTypeConfig] = None


class FluidTypeCheckingRequest(BaseModel):
    card: Union[ReactCard, Card]
    sidepanel_code: str


class FieldValidationResult(BaseModel):
    score: int = Field(..., description="Score from 1 to 10 for how well the value matches the description")
    reasoning: str = Field(..., description="Explanation of the score")


class FluidTypeCheckLLMResponse(BaseModel):
    score: int = Field(..., description="Score from 1 to 10 for how well the value matches the description")
    reasoning: str = Field(..., description="Clear explanation of the score")


class FluidTypeCheckingResponse(BaseModel):
    errors: List[str] = Field(default=[], description="List of error messages for fields with score < 5")
    field_scores: Dict[str, FieldValidationResult] = Field(default={}, description="Detailed scores and reasoning for each field")



def pydantic_to_react_layout(pydantic_classes: Dict[str, Type[BaseModel]]) -> Dict[str, Any]:
    """
    Convert Pydantic card type classes to React layout configuration.
    
    Args:
        pydantic_classes: Dictionary mapping class names to Pydantic model classes
        
    Returns:
        Dictionary with 'colors' and 'layouts' for React configuration
    """
    colors = {}
    layouts = {}
    
    class_names = list(pydantic_classes.keys())
    
    # Generate colors by cycling through available colors
    for i, class_name in enumerate(class_names):
        color_index = i % len(AVAILABLE_COLORS)
        colors[class_name] = AVAILABLE_COLORS[color_index]
    
    # Extract layout configuration from Pydantic models
    for class_name, pydantic_class in pydantic_classes.items():
        try:
            # Get field information from the model
            model_fields = pydantic_class.model_fields
            
            # Initialize layout with default values
            layout = {
                'image': False,
                'title': False,
                'body': False,
                'details': False,
            }
            
            # Check each field to determine visibility
            for field_name in ['image', 'title', 'body', 'details']:
                if field_name in model_fields:
                    field_info = model_fields[field_name]
                    
                    # Field is visible if it exists and is not explicitly None
                    # Check if it's a required field (no default or default is ...)
                    is_required = field_info.default is ... or field_info.default is None
                    
                    # Check if the annotation suggests it's not None-only
                    annotation_str = str(field_info.annotation)
                    is_none_only = annotation_str == 'None' or annotation_str == '<class \'NoneType\'>'
                    
                    # Field is visible if it's present and not None-only
                    layout[field_name] = not is_none_only
            
            # If there is a field in model_fields that is not in the default Card fields, set details=True
            default_card_fields = set(Card.model_fields.keys())
            extra_fields = set(model_fields.keys()) - default_card_fields
            if extra_fields:
                layout['details'] = True

            layouts[class_name] = layout
            print(f"Generated layout for {class_name}: {layout}")
            
        except Exception as e:
            print(f"Error processing {class_name}: {e}")
            # Fallback to analyzing the class definition
            layout = {
                'image': True,  # Default to showing most fields
                'title': True,
                'body': True,
                'details': True,
            }
            
            # Try to be smarter about the fallback by checking annotations
            if hasattr(pydantic_class, '__annotations__'):
                annotations = pydantic_class.__annotations__
                for field_name in ['image', 'title', 'body', 'details']:
                    if field_name in annotations:
                        # Check if the annotation suggests None
                        annotation_str = str(annotations[field_name])
                        if 'None' in annotation_str and annotation_str != 'Optional[None]':
                            layout[field_name] = True
                        elif annotation_str == 'None':
                            layout[field_name] = False
                    else:
                        layout[field_name] = False
            
            layouts[class_name] = layout
            print(f"Fallback layout for {class_name}: {layout}")
    
    return {
        'colors': colors,
        'layouts': layouts
    }


def pydantic_to_react_content(pydantic_card: Card) -> list[ReactCard]:
    """
    Convert a Pydantic Card instance to a list of ReactCard instances.
    
    Args:
        pydantic_card: Instance of a Card subclass
        
    Returns:
        List of ReactCard instances suitable for the frontend
    """
    cards = []
    
    def process_card(card: Card, is_root: bool = True) -> ReactCard:
        # Get the card type name from the class
        card_type = card.__class__.__name__
        
        # Handle image field - convert Image object to base64 string if present
        image_str = ""
        if hasattr(card, 'image') and card.image:
            if isinstance(card.image, Image):
                image_str = card.image.base64 or ""
            else:
                # If it's already a string, use it directly
                image_str = str(card.image) if card.image else ""
        
        # Get base Card fields
        base_card_fields = set(Card.model_fields.keys())
        current_card_fields = set(card.model_fields.keys())
        
        # Find additional fields beyond the base Card class
        additional_fields = current_card_fields - base_card_fields
        
        # Start with existing details or empty string
        details_parts = []
        existing_details = getattr(card, 'details', '') or ''
        if existing_details:
            details_parts.append(existing_details)
        
        # Process additional fields
        for field_name in additional_fields:
            field_value = getattr(card, field_name, None)
            
            # Skip None values
            if field_value is None:
                continue
                
            # Check if the field value is a Card instance (nested card)
            if isinstance(field_value, Card):
                # Recursively process nested card
                nested_card = process_card(field_value, is_root=False)
                cards.append(nested_card)
                # Add reference in details
                details_parts.append(f"**{field_name}**: [Nested card: {field_value.__class__.__name__}]")
            elif isinstance(field_value, list):
                # Handle list of potential Card instances
                nested_cards_found = []
                for item in field_value:
                    if isinstance(item, Card):
                        nested_card = process_card(item, is_root=False)
                        cards.append(nested_card)
                        nested_cards_found.append(item.__class__.__name__)
                
                if nested_cards_found:
                    details_parts.append(f"**{field_name}**: [Nested cards: {', '.join(nested_cards_found)}]")
                else:
                    # Regular list field
                    details_parts.append(f"**{field_name}**: {field_value}")
            else:
                # Regular additional field
                details_parts.append(f"**{field_name}**: {field_value}")
        
        # Combine all details
        final_details = '\n'.join(details_parts) if details_parts else ''
        
        return ReactCard(
            w=getattr(card, 'w', 300.0),
            h=getattr(card, 'h', 200.0),
            x=getattr(card, 'x', 0.0),
            y=getattr(card, 'y', 0.0),
            title=getattr(card, 'title', '') or '',
            body=getattr(card, 'body', '') or '',
            card_type=card_type,
            image=image_str,
            details=final_details,
            createdAt=None  # Will be set by the frontend
        )
    
    # Process the root card
    root_card = process_card(pydantic_card)
    cards.insert(0, root_card)  # Root card goes first
    
    return cards


def get_card_types_from_code(code: str) -> tuple[bool, str, Dict[str, Type[Card]]]:
    """
    Execute Python code in a safe environment and extract Card subclasses.
    Returns (success, error_message, card_type_classes)
    """
    try:
        # Create a restricted execution environment with Pydantic support
        safe_globals = {
            '__builtins__': {
                'dict': dict,
                'list': list,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'len': len,
                'range': range,
                'enumerate': enumerate,
                'zip': zip,
                'print': print,
                'type': type,
                'super': super,
                'getattr': getattr,
                'setattr': setattr,
                'hasattr': hasattr,
                '__build_class__': __builtins__['__build_class__'],  # Required for class creation
                '__name__': __name__,  # Required for class creation
            },
            'BaseModel': BaseModel,
            'Field': Field,  # Simplified Field for user code
            'Card': Card,  # Use Card instead of ReactCard for user definitions
            'Image': Image,
            'Optional': Optional,  # Import Optional for type hints
            'Literal': Literal,  # Import Literal for literal type hints
        }
        
        # Share local_vars as globals to allow forward references between classes
        local_vars = safe_globals.copy()
        
        # Execute the code in the restricted environment
        # Use local_vars as both globals and locals to enable forward references
        exec(code, local_vars, local_vars)
        
        # Find all classes that inherit from Card
        pydantic_classes = {}
        for name, obj in local_vars.items():
            if (inspect.isclass(obj) and 
                issubclass(obj, Card) and 
                obj is not Card):
                pydantic_classes[name] = obj
                print(json.dumps(obj.schema(), indent=2))
        
        if not pydantic_classes:
            return False, "No card type classes found. Define classes that inherit from Card.", {}
        
        return True, "", pydantic_classes
        
    except Exception as e:
        return False, str(e), {}


def execute_python_code_for_config(code: str) -> tuple[bool, str, Dict[str, Any]]:
    """
    Execute Python code and return React configuration for the execute-code endpoint.
    Returns (success, error_message, react_config)
    """
    success, error_msg, pydantic_classes = get_card_types_from_code(code)
    
    if not success:
        return success, error_msg, {}
    
    # Convert Pydantic classes to React layout format
    react_config = pydantic_to_react_layout(pydantic_classes)
    
    return True, "", react_config


def cast_react_card_to_pydantic(react_card: ReactCard, card_types: Dict[str, Type[Card]]) -> Card:
    """
    Cast a ReactCard to the appropriate Pydantic Card subclass based on card_type.
    """
    card_type_class = card_types.get(react_card.card_type)
    if not card_type_class:
        raise ValueError(f"Unknown card type: {react_card.card_type}")
    
    # Convert ReactCard fields to Card fields
    card_data = {
        'w': react_card.w,
        'h': react_card.h,
        'x': react_card.x,
        'y': react_card.y,
        'visible': True,  # Default visible to True
    }
    
    # Get model fields to understand expected types
    model_fields = card_type_class.model_fields
    
    # Handle each field based on its expected type in the target model
    for field_name in ['title', 'body', 'details']:
        react_value = getattr(react_card, field_name, '')
        
        if field_name in model_fields:
            field_info = model_fields[field_name]
            annotation_str = str(field_info.annotation)
            
            # If the field expects None and we have an empty string, set to None
            if annotation_str == '<class \'NoneType\'>' or annotation_str == 'None':
                card_data[field_name] = None
            elif react_value:  # Only include non-empty values
                card_data[field_name] = react_value
            # If field is required but empty, include it anyway to get proper validation error
            elif field_info.default is ...:  # Required field
                card_data[field_name] = react_value
    
    # Handle image field
    if 'image' in model_fields:
        field_info = model_fields['image']
        if react_card.image:
            # Create Image object from base64 string
            card_data['image'] = Image(description="", base64=react_card.image)
        elif field_info.default is ...:  # Required field
            # Create empty Image object for required image fields
            card_data['image'] = Image(description="Auto-generated placeholder", base64="")
    
    # Create instance of the correct card type
    return card_type_class(**card_data)


async def validate_field_with_llm(field_name: str, field_value: Any, field_description: str, card_type_name: str) -> FieldValidationResult:
    """
    Use Groq LLM to validate how well a field value matches its description.
    """
    prompt = f"""On a score from 1 to 10, how much does this value match this description for the type called {card_type_name}?

Field: {field_name}
Value: {field_value}
Description: {field_description}

Please provide a score from 1 to 10 and reasoning for your score. Be strict but fair in your evaluation."""

    print(prompt)
    try:
        # Use async completion with structured output
        response = await acompletion(
            model=FAST_MODEL_NAME,
            messages=[{
                "role": "user",
                "content": prompt
            }],
            max_tokens=200,
            temperature=0.3,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "field_validation",
                    "schema": FluidTypeCheckLLMResponse.model_json_schema()
                }
            }
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse the structured JSON response
        import json
        llm_result = json.loads(content)
        validated_result = FluidTypeCheckLLMResponse(**llm_result)
        
        return FieldValidationResult(
            score=validated_result.score,
            reasoning=validated_result.reasoning
        )
        
    except Exception as e:
        print(f"LLM validation error for field {field_name}: {e}")
        # Return a low score if LLM call fails
        return FieldValidationResult(
            score=3,
            reasoning=f"Failed to validate field due to error: {str(e)}"
        )


async def perform_fluid_type_checking(card: Card, card_types: Dict[str, Type[Card]]) -> FluidTypeCheckingResponse:
    """
    Perform fluid type checking on a Card instance.
    """
    card_type_name = card.__class__.__name__
    schema_dict = card_types[card_type_name].schema()

    # Pretty-print JSON schema
    print(json.dumps(schema_dict, indent=2))
    
    
    # Get field information from the model
    model_fields = card.model_fields
    
    
    # Fields to skip (layout/positioning fields)
    skip_fields = {'w', 'h', 'x', 'y', 'visible'}
    
    field_scores = {}
    errors = []
    print("model field", model_fields)
    
    # Process each field
    for field_name, field_info in model_fields.items():
        # Skip layout fields
        print("description", model_fields[field_name])
        if field_name in skip_fields:
            continue
            
        # Get field value
        field_value = getattr(card, field_name, None)
        
        # Skip None or empty values
        if field_value is None or field_value == "":
            continue
            
        # Get field description
        field_description = ""
        if hasattr(field_info, 'description') and field_info.description:
            field_description = field_info.description
        else:
            # Convert field name to human readable description
            field_description = ''
        
        # Validate field with LLM
        validation_result = await validate_field_with_llm(
            field_name, field_value, field_description, card_type_name
        )
        
        field_scores[field_name] = validation_result
        
        # Add to errors if score is too low
        if validation_result.score < 5:
            errors.append(f"**{field_name}** - {validation_result.score}/10: {validation_result.reasoning}")
    
    return FluidTypeCheckingResponse(
        errors=errors,
        field_scores=field_scores
    )


@app.post("/fluid-type-checking", response_model=FluidTypeCheckingResponse)
async def fluid_type_checking(request: FluidTypeCheckingRequest):
    """
    Perform fluid type checking on a card by validating field values against their descriptions.
    """
    try:
        # Execute the sidepanel code to get card types
        success, error_msg, card_types = get_card_types_from_code(request.sidepanel_code)

        if not success:
            raise HTTPException(status_code=400, detail=f"Failed to execute sidepanel code: {error_msg}")
        
        if not card_types:
            raise HTTPException(status_code=400, detail="No card types found in sidepanel code")
        
        # Handle different input types
        if isinstance(request.card, ReactCard):
            # Cast ReactCard to the correct Pydantic card type
            pydantic_card = cast_react_card_to_pydantic(request.card, card_types)
        else:
            # Already a Card instance
            pydantic_card = request.card
        
        # Perform fluid type checking
        result = await perform_fluid_type_checking(pydantic_card, card_types)
        print("typechecking", result)
        return result
        
    except ValueError as e:
        print(f"Error in fluid_type_checking: {e}")
        
        # Check if it's a Pydantic ValidationError
        if hasattr(e, 'errors'):
            validation_errors = []
            field_scores = {}
            
            for error in e.errors():
                field_path = '.'.join(str(loc) for loc in error['loc'])
                error_msg = error['msg']
                error_type = error['type']
                input_value = error.get('input', 'N/A')
                
                detailed_error = f"**{field_path}**: {error_msg} (type: {error_type}, input: {input_value})"
                validation_errors.append(detailed_error)
                
                field_scores[field_path] = FieldValidationResult(
                    score=0, 
                    reasoning=f"{error_msg} - {error_type}"
                )
            
            return FluidTypeCheckingResponse(errors=validation_errors, field_scores=field_scores)
        else:
            # Regular ValueError
            return FluidTypeCheckingResponse(
                errors=[f"**ValidationError**: {str(e)}"], 
                field_scores={'ValidationError': FieldValidationResult(score=0, reasoning=str(e))}
            )
    except Exception as e:
        print(f"Error in fluid_type_checking: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform fluid type checking: {str(e)}")


@app.post("/generate-card", response_model=list[ReactCard])
async def generate_card(request: BoardState):
    try:
        
        # Execute the sidepanel code to get fresh card types
        success, error_msg, card_types = get_card_types_from_code(request.sidepanel_code)
        
        if not success:
            raise HTTPException(status_code=400, detail=f"Failed to execute sidepanel code: {error_msg}")
        
        if not card_types:
            raise HTTPException(status_code=400, detail="No card types found in sidepanel code")
        
        # Create a prompt that includes the available card types and user intention
        available_types = list(card_types.keys())
        prompt = create_card_generation_prompt(
            intention=request.intention,
            board_json=request.model_dump_json(indent=2),
            available_types=available_types
        )
        
        print(f"Available card types for generation: {available_types}")


        # Build the union type
        card_type_classes = list(card_types.values())

        # Make single LLM call with Union wrapper type
        agent = Agent(
            PYDANTIC_MODEL_NAME,
            output_type=card_type_classes, 
        )

        result = await agent.run(prompt)

        pydantic_card = result.output
        
        print(f"Successfully generated card of type {type(pydantic_card).__name__}: {pydantic_card}")
        
        # Convert to ReactCard(s) - this now returns a list
        generated_cards = pydantic_to_react_content(pydantic_card)
        print(f"Successfully generated {len(generated_cards)} card(s): {generated_cards}")
        
        return generated_cards
        
    except Exception as e:
        print(f"Error in generate_card: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate card: {str(e)}")

@app.post("/execute-code", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code safely and return card type configurations.
    Expected: Pydantic classes inheriting from CardLayout.
    
    Args:
        request: CodeExecutionRequest containing the Python code
    
    Returns:
        CodeExecutionResponse with success status and card type configurations
    """
    try:
        success, error_msg, react_config = execute_python_code_for_config(request.code)
        
        if not success:
            return CodeExecutionResponse(
                success=False,
                error=error_msg
            )
        
        # Validate that we have the expected configuration
        if 'colors' not in react_config or 'layouts' not in react_config:
            return CodeExecutionResponse(
                success=False,
                error="Failed to extract card type configuration from Pydantic classes"
            )
        
        colors =  react_config['colors']
        layouts = react_config['layouts']
        
        if not isinstance(colors, dict) or not isinstance(layouts, dict):
            print("color", isinstance(colors, dict))
            print("layout", isinstance(layouts, dict))
            print("error", colors)
            return CodeExecutionResponse(
                success=False,
                error="Invalid configuration format generated"
            )
        
        # Validate that both have the same keys (card types)
        if set(colors.keys()) != set(layouts.keys()):
            return CodeExecutionResponse(
                success=False,
                error="Mismatch between generated colors and layouts"
            )
        
        # Validate layout structure
        for card_type, layout in layouts.items():
            if not isinstance(layout, dict):
                return CodeExecutionResponse(
                    success=False,
                    error=f"Layout for '{card_type}' must be a dictionary"
                )
            
            required_fields = {'image', 'title', 'body', 'details'}
            if not required_fields.issubset(set(layout.keys())):
                return CodeExecutionResponse(
                    success=False,
                    error=f"Layout for '{card_type}' must include fields: {required_fields}"
                )
            
            for field, value in layout.items():
                if not isinstance(value, bool):
                    return CodeExecutionResponse(
                        success=False,
                        error=f"Layout field '{field}' for '{card_type}' must be a boolean"
                    )
        
        # If we get here, the code executed successfully and produced valid configurations
        return CodeExecutionResponse(
            success=True,
            card_types=CardTypeConfig(
                colors=colors,
                layouts=layouts
            )
        )
        
    except Exception as e:
        return CodeExecutionResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


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