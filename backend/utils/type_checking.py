"""
Utilities for type checking and inspection.
"""
import inspect
from typing import Type, Union, get_args, get_origin
from models.cards import Card


def has_nested_card_fields(card_type_class: Type[Card]) -> bool:
    """
    Check if a card type has any fields that are Card objects or lists of Card objects.
    """
    model_fields = card_type_class.model_fields
    
    for field_name, field_info in model_fields.items():
        field_type = field_info.annotation
        
        # Skip layout fields
        if field_name in {'w', 'h', 'x', 'y', 'visible'}:
            continue
            
        # Check if field is a Card object
        if inspect.isclass(field_type) and issubclass(field_type, Card):
            return True
            
        # Check if field is a list of Card objects
        if (get_origin(field_type) is list and get_args(field_type) and 
            inspect.isclass(get_args(field_type)[0]) and issubclass(get_args(field_type)[0], Card)):
            return True
            
        # Handle Optional types (Union with None)
        if get_origin(field_type) is Union:
            args = get_args(field_type)
            for arg in args:
                if arg is not type(None):  # Skip None type
                    # Check if the non-None type is a Card
                    if inspect.isclass(arg) and issubclass(arg, Card):
                        return True
                    # Check if the non-None type is a list of Cards
                    if (get_origin(arg) is list and get_args(arg) and 
                        inspect.isclass(get_args(arg)[0]) and issubclass(get_args(arg)[0], Card)):
                        return True
    
    return False