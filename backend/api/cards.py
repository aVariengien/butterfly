"""
Card-related API endpoints.
"""
from typing import List
from fastapi import HTTPException
from models.cards import ReactCard
from models.requests import BoardState, FluidTypeCheckingRequest, CardDescriptionRequest
from models.responses import TitleResponse, FluidTypeCheckingResponse, FieldValidationResult
from services.card_service import generate_card
from services.code_service import get_card_types_from_code
from services.validation_service import perform_fluid_type_checking
from utils.conversion import cast_react_card_to_pydantic
from utils.type_checking import has_nested_card_fields
import litellm
from config.settings import FAST_MODEL_NAME


async def generate_title(request: CardDescriptionRequest) -> TitleResponse:
    """
    Generate a concise title from a card description using AI.
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
        
        return TitleResponse(title=title)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate title: {str(e)}"
        )


async def generate_card_endpoint(request: BoardState) -> List[ReactCard]:
    """
    Generate a new card based on the board state and intention.
    """
    try:
        return await generate_card(request)
    except Exception as e:
        print(f"Error in generate_card: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate card: {str(e)}")


async def fluid_type_checking(request: FluidTypeCheckingRequest) -> FluidTypeCheckingResponse:
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
        
        # Check for nested card types first
        if isinstance(request.card, ReactCard):
            card_type_name = request.card.card_type
            card_type_class = card_types.get(card_type_name)
            
            # Nested card types coming from ReactCards are not supported yet. Need to implement card reference in the
            if card_type_class and has_nested_card_fields(card_type_class):
                return FluidTypeCheckingResponse(
                    errors=[],
                    field_scores={}
                )
            
            # Cast ReactCard to the correct Pydantic card type
            pydantic_card = cast_react_card_to_pydantic(request.card, card_types)
        else:
            # Already a Card instance
            pydantic_card = request.card
            card_type_class = card_types.get(pydantic_card.__class__.__name__)
        
        # Perform fluid type checking
        result = await perform_fluid_type_checking(pydantic_card, card_types)
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