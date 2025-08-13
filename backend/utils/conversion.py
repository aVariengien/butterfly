"""
Utilities for converting between Pydantic and React card formats.
"""
import json
import re
from typing import Dict, Type, Any, List, Union, get_args, get_origin
from models.cards import Card, ReactCard
from models.responses import FieldValidationResult
from config.settings import (
    AVAILABLE_COLORS, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, DEFAULT_CARD_PADDING
)


def pydantic_to_react_layout(pydantic_classes: Dict[str, Type[Card]]) -> Dict[str, Any]:
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
            for field_name in ['title', 'body', 'details']:
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
            
            # Check for image fields - show image layout if either img_prompt or img_source exists
            has_img_prompt = 'img_prompt' in model_fields
            has_img_source = 'img_source' in model_fields
            layout['image'] = has_img_prompt or has_img_source
            
            # If there is a field in model_fields that is not in the default Card fields, set details=True
            default_card_fields = set(list(Card.model_fields.keys()) + ["user_only", "generation_only"]) 
            extra_fields = set(model_fields.keys()) - default_card_fields
            if extra_fields:
                layout['details'] = True

            layouts[class_name] = layout
            
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
                for field_name in ['title', 'body', 'details']:
                    if field_name in annotations:
                        # Check if the annotation suggests None
                        annotation_str = str(annotations[field_name])
                        if 'None' in annotation_str and annotation_str != 'Optional[None]':
                            layout[field_name] = True
                        elif annotation_str == 'None':
                            layout[field_name] = False
                    else:
                        layout[field_name] = False
                
                # Check for image fields
                has_img_prompt = 'img_prompt' in annotations
                has_img_source = 'img_source' in annotations
                layout['image'] = has_img_prompt or has_img_source
            
            layouts[class_name] = layout
    
    return {
        'colors': colors,
        'layouts': layouts
    }


def pydantic_to_react_content(pydantic_card: Card) -> List[ReactCard]:
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
        
        # Handle image fields directly
        img_prompt = getattr(card, 'img_prompt', '') or ''
        img_source = getattr(card, 'img_source', '') or ''
        
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
                details_parts.append(f"{field_name}: [Nested card: {field_value.__class__.__name__}]")
            elif isinstance(field_value, list):
                # Handle list of potential Card instances
                nested_cards_found = []
                for item in field_value:
                    if isinstance(item, Card):
                        nested_card = process_card(item, is_root=False)
                        cards.append(nested_card)
                        nested_cards_found.append(item.__class__.__name__)
                
                if nested_cards_found:
                    details_parts.append(f"{field_name}: [Nested cards: {', '.join(nested_cards_found)}]")
                else:
                    # Regular list field
                    details_parts.append(f"{field_name}: {field_value}")
            else:
                # Regular additional field
                details_parts.append(f"{field_name}: {field_value}")
        
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
            img_prompt=img_prompt,
            img_source=img_source,
            details=final_details,
            createdAt=None  # Will be set by the frontend
        )
    
    # Process the root card
    root_card = process_card(pydantic_card)
    cards.insert(0, root_card)  # Root card goes first
    
    # Post-processing: Set all cards to 200x150 size and organize in column if multiple cards
    if cards:
        # Get the position of the first card as the base position
        base_x = cards[0].x
        base_y = cards[0].y
        
        current_y = base_y
        for i, card in enumerate(cards):
            # Use larger size for cards with images
            if card.img_prompt:
                card.w = 300
                card.h = 350
            else:
                card.w = DEFAULT_CARD_WIDTH
                card.h = DEFAULT_CARD_HEIGHT
            
            # If multiple cards, organize in column with proper spacing
            if len(cards) > 1:
                card.x = base_x  # Align all cards to the first card's x position
                card.y = current_y
                current_y += card.h + DEFAULT_CARD_PADDING  # Accumulate y position based on actual card height
    
    return cards


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
    }
    
    # Get model fields to understand expected types
    model_fields = card_type_class.model_fields
    
    # Handle each field based on its expected type in the target model
    for field_name in ['title', 'body', 'details', 'img_prompt', 'img_source']:
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
    
    # Parse details field for additional fields in field_name: value format
    processed_details = react_card.details
    if react_card.details:
        details_pattern = r'(\w+):\s*(.+?)(?=\n\w+:|$)'
        matches = re.findall(details_pattern, react_card.details, re.DOTALL)
        patterns_to_remove = []
        
        for field_name, field_value in matches:
            field_value = field_value.strip()
            
            # Skip if field is not in the model
            if field_name not in model_fields:
                continue
                
            field_info = model_fields[field_name]
            field_type = field_info.annotation

            patterns_to_remove.append(f"{field_name}: {field_value}")
            patterns_to_remove.append(f"{field_name}:{field_value}")
            
            # Skip if field is a Card object or list of Cards (as requested)
            if (hasattr(field_type, '__origin__') and field_type.__origin__ is not Union and 
                hasattr(field_type, '__args__') and field_type.__args__ and 
                any(isinstance(arg, type) and issubclass(arg, Card) for arg in field_type.__args__ if isinstance(arg, type))):
                card_data[field_name] = None
                continue
            
            if (get_origin(field_type) is list and get_args(field_type) and 
                hasattr(get_args(field_type)[0], '__mro__') and issubclass(get_args(field_type)[0], Card)):
                card_data[field_name] = []
                continue
            
            # Skip references to nested cards
            if field_value.startswith('[Nested card') or field_value.startswith('[Nested cards'):
                card_data[field_name] = []
                continue
            
            # Try to cast the value to the expected type
            try:
                # Handle Optional types
                origin = get_origin(field_type)
                if origin is Union:
                    args = get_args(field_type)
                    # Check if it's Optional (Union with None)
                    if len(args) == 2 and type(None) in args:
                        # Get the non-None type
                        actual_type = args[0] if args[1] is type(None) else args[1]
                    else:
                        actual_type = field_type
                else:
                    actual_type = field_type
                
                # Cast to appropriate type
                if actual_type == str:
                    card_data[field_name] = field_value
                elif actual_type == int:
                    card_data[field_name] = int(field_value)
                elif actual_type == float:
                    card_data[field_name] = float(field_value)
                elif actual_type == bool:
                    card_data[field_name] = field_value.lower() in ('true', 't', '1', 'yes', 'y')
                elif get_origin(actual_type) is list:
                    # Handle simple lists (not Card lists)
                    list_item_type = get_args(actual_type)[0] if get_args(actual_type) else str
                    if list_item_type == str:
                        # Try parsing as JSON array or comma-separated values
                        try:
                            card_data[field_name] = json.loads(field_value)
                        except:
                            card_data[field_name] = [item.strip() for item in field_value.split(',')]
                else:
                    # For other types, keep as string
                    card_data[field_name] = field_value
                    
            except (ValueError, TypeError) as e:
                # If casting fails, skip this field
                raise ValueError(f"Failed to cast field {field_name} to {field_type}: {e}")
        
        # Remove processed patterns from details
        for pattern in patterns_to_remove:
            processed_details = processed_details.replace(pattern, "").strip()
        
        # Clean up extra newlines and whitespace
        processed_details = re.sub(r'\n\s*\n+', '\n', processed_details).strip()
        
        # Update the details field with remaining content
        if 'details' in model_fields and processed_details:
            card_data['details'] = processed_details
        elif 'details' in model_fields:
            # Set to empty string or None based on field requirements
            field_info = model_fields['details']
            if field_info.default is ...:  # Required field
                card_data['details'] = ""
            else:
                card_data['details'] = None
    
    # Create instance of the correct card type
    return card_type_class(**card_data)