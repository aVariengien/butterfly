# %%
def create_card_generation_prompt(intention: str, board_json: str, available_types: list[str], pydantic_classes_description: str) -> str:
    """
    Create a complete prompt for card generation including user intention and constraints.
    
    Args:
        intention: User's stated intention/goal
        board_json: JSON representation of current board state
        available_types: List of available card type names
    
    Returns:
        Complete formatted prompt string
    """
    return f"""You are in charge of making recommendation to create next card on a whiteboard. Make the card as close as what you can infer from the users' thinking. Be considerate and try to keep the flow that the user creates both in the content and the organisation of the cards.

Global user's thinking goal: {intention}

## Current state of the board
{board_json}

## Answer format
You must respond with one of the following card types: [{', '.join(available_types)}] following the json format.


Example output:

{{
    "title": "...",
    "body": "..."
    "image": {{
        "prompt": "...",
        "base64": "",
    }}
}}

## Json format

{pydantic_classes_description}

## Image instruction

If you are generating an image prompt in your output, only generate prompts for photography, or piece of art.
Image featuring text or diagram are not allowed. Add stylistic instruction depending on the image you are aiming to generate.

If the image field is optional, only add an image if it is clear that a visual illustration is releavnt. In doubt, don't include an image (simply return null for the image).

## Board instructions
* Generate a card that is one of these specific types, not a generic Card. 
* If you want to keep a field empty, use null (no quotes). 
* When generating cards, make sure the width is always at least 200, and height 200. Make sure that cards don't overlap.
* Only use multiple of 50 for the x,y,w,h fields. (x,y) give the coordinate on the top left, (x+w, y+h) on the bottom right.
* When generating cards as children field to other cards, order them as a column.

The card should be relevant to the user's stated intention: "{intention}"
"""

# %%


# %%
