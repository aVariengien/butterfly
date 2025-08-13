"""
Service for fluid type checking and validation.
"""
import json
from typing import Any, Dict, Type
from litellm import acompletion
from models.cards import Card
from models.responses import FieldValidationResult, FluidTypeCheckLLMResponse, FluidTypeCheckingResponse
from config.settings import FAST_MODEL_NAME


async def validate_field_with_llm(field_name: str, field_value: Any, field_description: str, card_type_name: str) -> FieldValidationResult:
    """
    Use Groq LLM to validate how well a field value matches its description.
    """
    prompt = f"""On a score from 1 to 10, how much does this value match this description for the type called {card_type_name}?

Field: {field_name}
Value: {field_value}
Description: {field_description}

Please provide a score from 1 to 10 and reasoning for your score. Be strict but fair in your evaluation. 
If the description is empty, be less strict and rely on the field name to judge."""

    try:
        # Use async completion with structured output
        response = await acompletion(
            model=FAST_MODEL_NAME,
            messages=[{
                "role": "user",
                "content": prompt
            }],
            max_tokens=200,
            temperature=0.0,
            response_format=FluidTypeCheckLLMResponse
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse the structured JSON response
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
    
    # Get field information from the model
    model_fields = card.model_fields
    
    # Fields to skip (layout/positioning fields)
    skip_fields = {'w', 'h', 'x', 'y', 'visible', 'img_prompt'}
    
    field_scores = {}
    errors = []
    
    # Process each field
    for field_name, field_info in model_fields.items():
        # Skip layout fields
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