"""
Service for card generation and processing.
"""
from typing import List
from pydantic_ai import Agent, UnexpectedModelBehavior
from models.cards import ReactCard
from models.requests import BoardState, FluidTypeCheckingRequest
from utils.conversion import pydantic_to_react_content
from utils.type_checking import has_nested_card_fields
from services.code_service import get_card_types_from_code
from services.validation_service import perform_fluid_type_checking
from services.image_service import generate_image_with_runware
from services.base_model_service import generate_cards_with_base_model_strategy
from prompts import create_card_generation_prompt
from config.settings import PYDANTIC_MODEL_NAME


async def generate_card(request: BoardState) -> List[ReactCard]:
    """
    Generate a new card based on the board state and intention.
    """
    # Execute the sidepanel code to get fresh card types
    success, error_msg, card_types = get_card_types_from_code(request.sidepanel_code, generation=True)
    
    if not success:
        raise ValueError(f"Failed to execute sidepanel code: {error_msg}")
    
    if not card_types:
        raise ValueError("No card types found in sidepanel code")
    
    # Create a prompt that includes the available card types and user intention
    available_types = list(card_types.keys())

    card_descriptions = [f"**{name}**\n\n {pydantic_type.schema()}" for name, pydantic_type in card_types.items()]
    prompt = create_card_generation_prompt(
        intention=request.intention,
        board_json=str(request.cards),
        available_types=available_types,
        pydantic_classes_description=str(card_descriptions)
    )

    # Build the union type
    card_type_classes = list(card_types.values())

    # Make single LLM call with Union wrapper type
    agent = Agent(
        PYDANTIC_MODEL_NAME,
        output_type=card_type_classes, 
    )
    try:
        result = await agent.run(prompt)
    except UnexpectedModelBehavior:
        print("unexpected behavior!")
        raise

    pydantic_card = result.output
    print("card", pydantic_card)

    # Convert to ReactCard(s)
    generated_cards = pydantic_to_react_content(pydantic_card)
    print("generated_cards", generated_cards)
    
    # Apply fluid typechecking to the output
    print(f"Available card types for validation: {list(card_types.keys())}")
    for card in generated_cards:
        print(f"Validating card: {card.card_type}")
        
        # Skip validation for cards with nested fields
        card_type_class = card_types.get(card.card_type)
        if card_type_class and has_nested_card_fields(card_type_class):
            print(f"Skipping fluid type checking for card with nested fields: {card.card_type}")
            continue
            
        validation_result = None
        try:
            # Use the validation service directly to avoid circular import
            from utils.conversion import cast_react_card_to_pydantic
            pydantic_card = cast_react_card_to_pydantic(card, card_types)
            validation_result = await perform_fluid_type_checking(pydantic_card, card_types)
        except ValueError as e:
            # Handle unknown card type errors gracefully
            if "Unknown card type:" in str(e):
                print(f"Skipping fluid type checking for unknown card type: {card.card_type}")
                continue
            else:
                print(f"Error performing fluid type checking on generated pydantic card: {e}")
                raise ValueError(f"Failed to run fluid typechecking: {str(e)}")
        except Exception as e:
            print(f"Error performing fluid type checking on generated pydantic card: {e}")
            raise ValueError(f"Failed to run fluid typechecking: {str(e)}")

        assert validation_result is not None
        if len(validation_result.errors) > 0:
            print(f"Error performing fluid type checking on generated pydantic card: {validation_result.errors}")
            raise ValueError(f"Fluid Typechecking error: {validation_result.errors}")

    # Generate images for cards that have img_prompt but no img_source
    for card in generated_cards:
        if card.img_prompt and not card.img_source:
            print(f"Generating image for prompt: {card.img_prompt}")
            generated_image_url = await generate_image_with_runware(card.img_prompt)
            if generated_image_url:
                card.img_source = generated_image_url
                print(f"Image generated successfully and assigned to card: {generated_image_url}")

    return generated_cards


async def generate_card_with_base_model(request: BoardState) -> List[ReactCard]:
    """
    Generate cards using the base model strategy with Claude completions.
    This is the new enhanced strategy that uses Claude to generate raw notes first.
    """
    # Execute the sidepanel code to get fresh card types
    success, error_msg, card_types = get_card_types_from_code(request.sidepanel_code, generation=True)
    
    if not success:
        raise ValueError(f"Failed to execute sidepanel code: {error_msg}")
    
    if not card_types:
        raise ValueError("No card types found in sidepanel code")
    
    # Use the base model strategy to generate cards
    generated_cards = await generate_cards_with_base_model_strategy(
        board_state=request,
        card_types=card_types
    )
    
    # Apply the same validation and image generation as the original service
    print(f"Available card types for validation: {list(card_types.keys())}")
    for card in generated_cards:
        print(f"Validating card: {card.card_type}")
        
        # Skip validation for cards with nested fields
        card_type_class = card_types.get(card.card_type)
        if card_type_class and has_nested_card_fields(card_type_class):
            print(f"Skipping fluid type checking for card with nested fields: {card.card_type}")
            continue
            
        validation_result = None
        try:
            # Use the validation service directly to avoid circular import
            from utils.conversion import cast_react_card_to_pydantic
            pydantic_card = cast_react_card_to_pydantic(card, card_types)
            validation_result = await perform_fluid_type_checking(pydantic_card, card_types)
        except ValueError as e:
            # Handle unknown card type errors gracefully
            if "Unknown card type:" in str(e):
                print(f"Skipping fluid type checking for unknown card type: {card.card_type}")
                continue
            else:
                print(f"Error performing fluid type checking on generated pydantic card: {e}")
                raise ValueError(f"Failed to run fluid typechecking: {str(e)}")
        except Exception as e:
            print(f"Error performing fluid type checking on generated pydantic card: {e}")
            raise ValueError(f"Failed to run fluid typechecking: {str(e)}")

        assert validation_result is not None
        if len(validation_result.errors) > 0:
            print(f"Error performing fluid type checking on generated pydantic card: {validation_result.errors}")
            raise ValueError(f"Fluid Typechecking error: {validation_result.errors}")

    # Generate images for cards that have img_prompt but no img_source
    for card in generated_cards:
        if card.img_prompt and not card.img_source:
            print(f"Generating image for prompt: {card.img_prompt}")
            generated_image_url = await generate_image_with_runware(card.img_prompt)
            if generated_image_url:
                card.img_source = generated_image_url
                print(f"Image generated successfully and assigned to card: {generated_image_url}")

    return generated_cards