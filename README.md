# 🦋 Butterfly

**A quiet space for early intuition to unfold.**

Butterfly is an AI-augmented thinking canvas designed to help you develop authentic thoughts before they become fully legible. 

[![Presentation](docs/presentation-cover.png)](https://docs.google.com/presentation/d/1UFhrjoh3xpxWYXs7VmM53mXjrPg7IR_0J7wnau9jWvo/edit?usp=sharing)

📖 **[View the (scrapy) design presentation →](https://docs.google.com/presentation/d/1UFhrjoh3xpxWYXs7VmM53mXjrPg7IR_0J7wnau9jWvo/edit?usp=sharing)**

## Project Structure

```
butterfly/
├── backend/          # FastAPI backend for AI card generation
├── frontend/         # React + tldraw infinite canvas UI
└── sandbox/          # Experimental features and prototypes
```

## Quick Start

### Backend

```bash
cd backend
uv sync
export ANTHROPIC_API_KEY=your_key_here
uv run python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` with the backend on `http://localhost:8000`.

## How It Works

1. **Start a session** with an intention and duration
2. **Write freely** on the canvas using typed cards
3. **AI generates suggestions** shown at the end of the session
4. **Review generated cards** at session end. click to keep for the next session, else the cards are pushed to the history
5. **Reflect** on the history of your thinking sessions

## License

MIT

