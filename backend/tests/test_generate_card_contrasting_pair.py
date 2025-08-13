"""
Test case for the generate-card API endpoint with nested ContrastingExamplePair type.
"""
import pytest
from typing import Optional
from unittest.mock import patch, AsyncMock
from pydantic import BaseModel, Field
from models.requests import BoardState
from models.cards import ReactCard, Card
from services.card_service import generate_card


class Example(Card):
    """A concrete example."""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the example, in 1-2 sentences.")


class ContrastingExamplePair(Card):
    """A pair of contrasting examples for a claim."""
    claim_title: str = Field(..., description="The title of a claim card from the whiteboard the pair is reacting to.")
    affirming_example: Example = Field(..., description="An example that is illustrating the claim")
    counter_example: Example = Field(..., description="A counter example, disproving the claim")
    generation_only: bool = True


@pytest.mark.asyncio
async def test_generate_contrasting_example_pair():
    """
    Test generating a ContrastingExamplePair card based on a whiteboard with property cards.
    """
    # Sidepanel code defining the nested card types
    sidepanel_code = '''
class Example(Card):
    """A concrete example."""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the example, in 1-2 sentences.")

class ContrastingExamplePair(Card):
    """A pair of contrasting examples for a claim."""
    claim_title: str = Field(..., description="The title of a claim card from the whiteboard the pair is reacting to.")
    affirming_example: Example = Field(..., description="An example that is illustrating the claim")
    counter_example: Example = Field(..., description="A counter example, disproving the claim")
    generation_only: bool = True
'''

    # Whiteboard state with property cards asking for contrasting examples
    whiteboard_cards = [
        {
            "w": 250,
            "h": 250,
            "x": 186.3707275390625,
            "y": 233.90481567382812,
            "title": "Empathy",
            "body": "",
            "card_type": "Property",
            "img_prompt": "",
            "img_source": "",
            "details": "",
            "createdAt": 16
        },
        {
            "w": 250,
            "h": 250,
            "x": 460.7869873046875,
            "y": 240.656982421875,
            "title": "Integrity",
            "body": "",
            "card_type": "Property",
            "img_prompt": "",
            "img_source": "",
            "details": "",
            "createdAt": 22
        },
        {
            "w": 220.0816650390625,
            "h": 183.1143493652344,
            "x": 349.1330862712034,
            "y": 33.86852162946741,
            "title": "Can I have contrasting example pair for these property?",
            "body": "",
            "card_type": "Question",
            "img_prompt": "",
            "img_source": "",
            "details": "",
            "createdAt": 30
        }
    ]

    # Create the board state request
    board_state = BoardState(
        intention="hollowness",
        sessionDuration=0.7,
        timestamp="2025-08-13T20:47:20.595Z",
        cards=whiteboard_cards,
        sidepanel_code=sidepanel_code
    )

    # Mock the LLM agent to return a ContrastingExamplePair
    with patch('services.card_service.Agent') as mock_agent_class, \
         patch('services.card_service.generate_image_with_runware', return_value=None) as mock_image_gen:
        
        # Mock agent instance and result
        mock_agent = AsyncMock()
        mock_agent_class.return_value = mock_agent
        
        # Mock a result that represents a ContrastingExamplePair
        mock_result = AsyncMock()
        
        # Create proper Pydantic model instances
        affirming_example = Example(
            title='Active Listening',
            body='A therapist carefully listens to their patient without judgment, reflecting back their emotions to show understanding.',
            w=200.0,
            h=150.0,
            x=100.0,
            y=100.0,
            img_source=None,
            details=None
        )
        
        counter_example = Example(
            title='Dismissive Response',
            body='A person immediately offers solutions without acknowledging the other persons feelings.',
            w=200.0,
            h=150.0,
            x=300.0,
            y=100.0,
            img_source=None,
            details=None
        )
        
        contrasting_pair = ContrastingExamplePair(
            claim_title='Empathy',
            affirming_example=affirming_example,
            counter_example=counter_example,
            generation_only=True,
            w=400.0,
            h=300.0,
            x=200.0,
            y=200.0,
            title='Empathy Examples',
            body='Contrasting examples showing empathy vs lack of empathy',
            img_source=None,
            details=None
        )
        
        mock_result.output = contrasting_pair
        
        mock_agent.run.return_value = mock_result

        # Call the generate_card function
        result = await generate_card(board_state)

        # Assertions
        assert len(result) > 0, "Should generate at least one card"
        
        # Verify that the agent was called with proper parameters
        mock_agent_class.assert_called_once()
        mock_agent.run.assert_called_once()
        
        # Check that the result contains ReactCard instances
        for card in result:
            assert isinstance(card, ReactCard), "All results should be ReactCard instances"
            assert card.card_type is not None, "Card type should be set"
            assert card.title is not None, "Title should be set"


@pytest.mark.asyncio  
async def test_generate_card_with_nested_type_validation_skip():
    """
    Test that cards with nested fields skip fluid type checking validation.
    """
    sidepanel_code = '''
class Example(Card):
    """A concrete example."""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the example, in 1-2 sentences.")

class ContrastingExamplePair(Card):
    """A pair of contrasting examples for a claim."""
    claim_title: str = Field(..., description="The title of a claim card from the whiteboard the pair is reacting to.")
    affirming_example: Example = Field(..., description="An example that is illustrating the claim")
    counter_example: Example = Field(..., description="A counter example, disproving the claim")
    generation_only: bool = True
'''

    board_state = BoardState(
        intention="test nested validation skip",
        sessionDuration=0.5,
        timestamp="2025-08-13T20:47:20.595Z", 
        cards=[],
        sidepanel_code=sidepanel_code
    )

    with patch('services.card_service.Agent') as mock_agent_class, \
         patch('services.card_service.generate_image_with_runware', return_value=None), \
         patch('services.card_service.perform_fluid_type_checking') as mock_validation:
        
        mock_agent = AsyncMock()
        mock_agent_class.return_value = mock_agent
        
        # Mock result with nested type
        mock_result = AsyncMock()
        
        test_affirming = Example(
            title='Test Example',
            body='Test body',
            w=200.0, h=150.0, x=100.0, y=100.0,
            img_source=None, details=None
        )
        
        test_counter = Example(
            title='Counter Example',
            body='Counter body', 
            w=200.0, h=150.0, x=300.0, y=100.0,
            img_source=None, details=None
        )
        
        test_pair = ContrastingExamplePair(
            claim_title='Test',
            affirming_example=test_affirming,
            counter_example=test_counter,
            generation_only=True,
            w=400.0, h=300.0, x=200.0, y=200.0,
            title='Test Pair', body='Test contrasting pair',
            img_source=None, details=None
        )
        
        mock_result.output = test_pair
        
        mock_agent.run.return_value = mock_result

        # Call generate_card
        result = await generate_card(board_state)

        # Verify that fluid type checking was called for the individual Example cards
        # but the ContrastingExamplePair itself was skipped
        assert mock_validation.call_count == 2, "Should validate the 2 individual Example cards"
        
        # Ensure we still get results (should be 3 cards: ContrastingExamplePair + 2 Examples)
        assert len(result) >= 3, "Should generate ContrastingExamplePair and its nested Example cards"