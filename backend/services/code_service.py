"""
Service for executing and validating Python code.
"""
import inspect
from typing import Dict, Type, Tuple, Any, Optional, Literal
from pydantic import BaseModel, Field
from models.cards import Card
from utils.conversion import pydantic_to_react_layout


def get_card_types_from_code(code: str, generation: bool = False, user_card: bool = False) -> Tuple[bool, str, Dict[str, Type[Card]]]:
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
                
                # Check if the class has user_only field set to True
                if generation and 'user_only' in (list(obj.model_fields.keys()) if hasattr(obj, 'model_fields') else []):
                    continue

                if user_card and 'generation_only' in (list(obj.model_fields.keys()) if hasattr(obj, 'model_fields') else []):
                    continue
                    
                # Check for nested card fields - return error if found
                from utils.type_checking import has_nested_card_fields
                if has_nested_card_fields(obj):
                    return False, f"Error: Card type '{name}' contains nested card fields. Nested card types are not supported.", {}
                    
                pydantic_classes[name] = obj

        
        if not pydantic_classes:
            return False, "No card type classes found. Define classes that inherit from Card.", {}
        
        return True, "", pydantic_classes
        
    except Exception as e:
        return False, str(e), {}


def execute_python_code_for_config(code: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Execute Python code and return React configuration for the execute-code endpoint.
    Returns (success, error_message, react_config)
    """
    success, error_msg, pydantic_classes = get_card_types_from_code(code, user_card=True)
    
    if not success:
        return success, error_msg, {}
    
    # Convert Pydantic classes to React layout format
    react_config = pydantic_to_react_layout(pydantic_classes)
    
    return True, "", react_config