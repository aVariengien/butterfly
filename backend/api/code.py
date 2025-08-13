"""
Code execution API endpoints.
"""
from models.requests import CodeExecutionRequest
from models.responses import CodeExecutionResponse, CardTypeConfig
from services.code_service import execute_python_code_for_config


async def execute_code(request: CodeExecutionRequest) -> CodeExecutionResponse:
    """
    Execute Python code safely and return card type configurations.
    Expected: Pydantic classes inheriting from CardLayout.
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
        
        colors = react_config['colors']
        layouts = react_config['layouts']
        
        if not isinstance(colors, dict) or not isinstance(layouts, dict):
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