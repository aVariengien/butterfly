# Butterfly Backend

Minimal FastAPI backend for AI-powered title generation.

## Setup

1. **Install dependencies**:
   ```bash
   cd backend
   uv sync
   ```

2. **Set OpenAI API key**:
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

3. **Run server**:
   ```bash
   uv run python main.py
   ```

## API

**POST** `/generate-title`
```json
{
  "description": "Create a dashboard for analytics"
}
```

Response:
```json
{
  "title": "Analytics Dashboard Creation"
}
```

Server runs on http://localhost:8000