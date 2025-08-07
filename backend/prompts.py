

NEXT_CARD_PROMPT = """Here is the state of the board. You task is to generate a relevant next card to help nurture the thinking of the user. 

### Card structure

class Card(BaseModel):
    w: int
    h: int
    x: float
    y: float
    title: str
    body: str
    image: Optional[str] #base64 image
    details: Optional[str]
    card_type: str # the card type should be one of the allowed card type d

### Board state
{board}"""