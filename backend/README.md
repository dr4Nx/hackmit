# Mentra Bridge Server

A backend-only TypeScript server that acts as a bridge between MentraOS glasses and the Python AI backend.

## Features

- **Voice Recognition**: Listens for "hey little chef" trigger phrase
- **Photo Capture**: Takes photos from MentraOS glasses automatically
- **AI Analysis**: Sends photos to Python backend for AI processing
- **Text-to-Speech**: Speaks AI analysis results back to glasses using MentraOS TTS
- **Voice Confirmations**: Provides audio feedback for user interactions
- **TypeScript**: Fully typed for better development experience
- **No Frontend**: Pure backend server focusing on data processing

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure the `.env` file exists in the parent directory with:
   ```
   PACKAGE_NAME=com.adi.hackmit
   MENTRAOS_API_KEY=your_api_key_here
   PORT=3000
   PYTHON_BACKEND_URL=http://127.0.0.1:8000

   # TTS Configuration (optional)
   TTS_MODEL=eleven_flash_v2_5
   TTS_STABILITY=0.7
   TTS_SIMILARITY_BOOST=0.8
   TTS_STYLE=0.3
   TTS_SPEED=0.9
   ```

3. Start the Python backend first:
   ```bash
   cd .. && python -m uvicorn backend.main:app --reload --port 8000
   ```

4. Run the bridge server:
   ```bash
   # Development mode (with live reload)
   npm run dev

   # Production build and run
   npm run build
   npm start
   ```

## API Endpoints

- `GET /health` - Server health check and photo count
- `GET /api/status` - Detailed status with latest photo info
- `POST /api/clear-photos` - Clear all stored photos

## Architecture

```
MentraOS Glasses → Bridge Server (Node.js/TypeScript) → Python Backend (FastAPI)
                                   ↓
                               Photo Storage & Processing
```

The bridge server:
1. Connects to MentraOS glasses via WebSocket
2. Listens for voice commands ("hey little chef")
3. Provides audio confirmation when triggered
4. Captures photos automatically
5. Sends photos to Python backend for AI analysis
6. Speaks AI analysis results back to glasses using TTS
7. Stores results in memory

## Usage

1. Connect your MentraOS glasses to the app
2. Say "hey little chef" to trigger photo capture
3. The system will automatically:
   - Speak "I heard you! Taking a photo now..." as confirmation
   - Take a photo from the glasses camera
   - Convert to base64 for processing
   - Send to Python backend for AI analysis
   - Speak "Analysis complete. Here's what I found:"
   - Read the full AI analysis aloud through the glasses
   - Log all results for debugging

## Development

- TypeScript compilation: `npm run build`
- Clean build directory: `npm run clean`
- Development server: `npm run dev` (uses ts-node with ESM support)