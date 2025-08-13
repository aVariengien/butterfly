"""
Test cases for nested card conversion and type checking.
"""
import pytest
from models.cards import ReactCard
from utils.conversion import cast_react_card_to_pydantic, pydantic_to_react_content


class TestNestedCardConversion:
    """Test conversion between Pydantic cards and ReactCards with nested structures."""

    def test_simple_example_card_conversion(self, sample_card_types):
        """Test basic Example card conversion."""
        # Create a simple Example ReactCard
        react_card = ReactCard(
            w=300,
            h=200,
            x=100.0,
            y=100.0,
            title="Test Example",
            body="This is a test example",
            card_type="Example",
            img_prompt="",
            img_source="",
            details="user_only: True",
            createdAt=None
        )
        
        # Convert to Pydantic
        pydantic_card = cast_react_card_to_pydantic(react_card, sample_card_types)
        
        # Verify conversion
        assert pydantic_card.title == "Test Example"
        assert pydantic_card.body == "This is a test example"
        assert pydantic_card.user_only == True
        assert pydantic_card.w == 300
        assert pydantic_card.h == 200

    def test_contrasting_example_pair_creation(self, sample_card_types):
        """Test creating a ContrastingExamplePair Pydantic card."""
        ExampleClass = sample_card_types["Example"]
        ContrastingExamplePairClass = sample_card_types["ContrastingExamplePair"]
        
        # Create nested Example instances
        affirming_example = ExampleClass(
            title="Good Example",
            body="This shows the right way",
            w=300.0,
            h=200.0,
            x=0.0,
            y=250.0,
            user_only=True
        )
        
        counter_example = ExampleClass(
            title="Bad Example", 
            body="This shows the wrong way",
            w=300.0,
            h=200.0,
            x=0.0,
            y=450.0,
            user_only=True
        )
        
        # Create ContrastingExamplePair
        contrasting_pair = ContrastingExamplePairClass(
            title="Test Contrasting Pair",
            body="This demonstrates contrast",
            w=300.0,
            h=250.0,
            x=0.0,
            y=0.0,
            claim_title="Test Concept",
            affirming_example=affirming_example,
            counter_example=counter_example,
            generation_only=True
        )
        
        # Verify the nested structure
        assert contrasting_pair.claim_title == "Test Concept"
        assert contrasting_pair.affirming_example.title == "Good Example"
        assert contrasting_pair.counter_example.title == "Bad Example"
        assert contrasting_pair.generation_only == True

    def test_pydantic_to_react_conversion_with_nesting(self, sample_card_types):
        """Test converting Pydantic card with nested cards to ReactCards."""
        ExampleClass = sample_card_types["Example"]
        ContrastingExamplePairClass = sample_card_types["ContrastingExamplePair"]
        
        # Create the same structure as in your error
        affirming_example = ExampleClass(
            title="Listening with open attention",
            body="Sitting with a friend, reflecting back their feelings, and asking gentle questions before offering help.",
            w=300.0,
            h=200.0,
            x=1300.0,
            y=250.0,
            user_only=True
        )
        
        counter_example = ExampleClass(
            title="Quick‑fix advice",
            body="Telling someone how to feel or immediately offering solutions without acknowledging their emotions first.",
            w=300.0,
            h=200.0,
            x=1300.0,
            y=450.0,
            user_only=True
        )
        
        contrasting_pair = ContrastingExamplePairClass(
            title="Empathy: Contrasting Examples",
            body="Concrete examples illustrating what empathy looks like and what it isn't, to guide wholesome interactions.",
            w=300.0,
            h=250.0,
            x=1300.0,
            y=0.0,
            claim_title="Empathy",
            affirming_example=affirming_example,
            counter_example=counter_example,
            generation_only=True
        )
        
        # Convert to ReactCards
        react_cards = pydantic_to_react_content(contrasting_pair)
        
        # Should get 3 ReactCards: main + 2 nested
        assert len(react_cards) == 3
        
        # Check main card
        main_card = react_cards[0]
        assert main_card.title == "Empathy: Contrasting Examples"
        assert main_card.card_type == "ContrastingExamplePair"
        assert "generation_only: True" in main_card.details
        assert "[Nested card: Example]" in main_card.details
        
        # Check nested cards
        nested_cards = react_cards[1:]
        assert len(nested_cards) == 2
        
        affirming_card = next(card for card in nested_cards if "Listening" in card.title)
        counter_card = next(card for card in nested_cards if "Quick" in card.title)
        
        assert affirming_card.card_type == "Example"
        assert "user_only: True" in affirming_card.details
        assert counter_card.card_type == "Example"
        assert "user_only: True" in counter_card.details

    def test_react_to_pydantic_conversion_with_nesting_bug(self, sample_card_types):
        """Test the specific bug: ReactCard back to Pydantic with nested references."""
        # This simulates the exact scenario from your error
        
        # Create ReactCards as they would come from pydantic_to_react_content
        main_react_card = ReactCard(
            w=250,
            h=200,
            x=1300.0,
            y=0.0,
            title="Empathy: Contrasting Examples",
            body="Concrete examples illustrating what empathy looks like and what it isn't, to guide wholesome interactions.",
            card_type="ContrastingExamplePair",
            img_prompt="",
            img_source="",
            details="generation_only: True\naffirming_example: [Nested card: Example]\ncounter_example: [Nested card: Example]\nclaim_title: Empathy",
            createdAt=None
        )
        
        # This is where the bug occurs - trying to convert back to Pydantic
        # The nested card references are just strings in details, not actual objects
        
        with pytest.raises(Exception) as exc_info:
            pydantic_card = cast_react_card_to_pydantic(main_react_card, sample_card_types)
        
        # The error should mention validation errors for nested fields
        assert "affirming_example" in str(exc_info.value) or "counter_example" in str(exc_info.value)

    def test_details_parsing_for_nested_fields(self, sample_card_types):
        """Test parsing details string to extract nested field information."""
        details = "generation_only: True\naffirming_example: [Nested card: Example]\ncounter_example: [Nested card: Example]\nclaim_title: Empathy"
        
        # This should be improved in the cast_react_card_to_pydantic function
        lines = details.split('\n')
        parsed_details = {}
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # Handle nested card references
                if "[Nested card:" in value:
                    # This should be handled properly in the conversion
                    parsed_details[key] = "NESTED_CARD_REFERENCE"
                elif value.lower() in ['true', 'false']:
                    parsed_details[key] = value.lower() == 'true'
                else:
                    parsed_details[key] = value
        
        assert parsed_details['generation_only'] == True
        assert parsed_details['claim_title'] == "Empathy"
        assert parsed_details['affirming_example'] == "NESTED_CARD_REFERENCE"
        assert parsed_details['counter_example'] == "NESTED_CARD_REFERENCE"

    def test_nested_field_reconstruction(self, sample_card_types):
        """Test that we can reconstruct nested fields from ReactCard data."""
        # This test shows what the fix should do
        
        # Given: ReactCards representing a nested structure
        main_card = ReactCard(
            title="Empathy: Contrasting Examples",
            card_type="ContrastingExamplePair",
            details="generation_only: True\nclaim_title: Empathy",
            w=250, h=200, x=0, y=0, body="test", img_prompt="", img_source="", createdAt=None
        )
        
        affirming_card = ReactCard(
            title="Listening with open attention", 
            card_type="Example",
            details="user_only: True",
            w=250, h=200, x=0, y=250, body="test", img_prompt="", img_source="", createdAt=None
        )
        
        counter_card = ReactCard(
            title="Quick‑fix advice",
            card_type="Example", 
            details="user_only: True",
            w=250, h=200, x=0, y=450, body="test", img_prompt="", img_source="", createdAt=None
        )
        
        # The conversion should be able to reconstruct the nested structure
        # This is what needs to be implemented in the fix
        
        # Convert individual cards
        affirming_pydantic = cast_react_card_to_pydantic(affirming_card, sample_card_types)
        counter_pydantic = cast_react_card_to_pydantic(counter_card, sample_card_types)
        
        # Create the main card with proper nested references
        ContrastingExamplePairClass = sample_card_types["ContrastingExamplePair"]
        
        # This should work after the fix
        reconstructed_main = ContrastingExamplePairClass(
            title=main_card.title,
            body=main_card.body,
            w=main_card.w,
            h=main_card.h,
            x=main_card.x,
            y=main_card.y,
            claim_title="Empathy",
            affirming_example=affirming_pydantic,
            counter_example=counter_pydantic,
            generation_only=True
        )
        
        # Verify the reconstruction
        assert reconstructed_main.claim_title == "Empathy"
        assert reconstructed_main.affirming_example.title == "Listening with open attention"
        assert reconstructed_main.counter_example.title == "Quick‑fix advice"