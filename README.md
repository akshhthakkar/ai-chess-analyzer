# AI Chess Analyzer

Analyze chess positions with Stockfish engine. Get best moves and evaluations.

## Features

- Interactive drag-and-drop chessboard
- Multi-line analysis (top 1-5 best moves)
- Adjustable search depth (10-30)
- FEN import/export
- Visual evaluation bar

## Quick Start

### 1. Download Stockfish

- Get it from [stockfishchess.org/download](https://stockfishchess.org/download/)
- Place `stockfish.exe` in the `engines/` folder

### 2. Install & Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Mac/Linux
pip install -r requirements.txt
python app.py
```

### 3. Run Frontend

```bash
cd frontend
python -m http.server 8000
```

### 4. Open Browser

Go to: **http://localhost:8000**

## Usage

1. **Move pieces** by dragging them on the board
2. **Adjust settings** using Depth and Lines sliders
3. **Click "Analyze Position"** to get Stockfish analysis
4. **View results** showing best moves and evaluation scores

### Understanding Scores

- **Positive (+0.50)**: White is winning by ~0.5 pawns
- **Negative (-0.50)**: Black is winning by ~0.5 pawns
- **Near zero**: Position is equal

## Project Structure

```
ai-chess-analyzer/
├── backend/
│   ├── app.py              # Flask API server
│   ├── stockfish_engine.py # Stockfish wrapper
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── index.html          # Main page
│   ├── style.css           # Styling
│   ├── app.js              # JavaScript logic
│   └── img/                # Chess piece images
└── engines/
    └── stockfish.exe       # Stockfish binary
```

## Tech Stack

- **Backend**: Python, Flask, python-chess
- **Frontend**: HTML, CSS, JavaScript
- **Libraries**: Chessboard.js, Chess.js
- **Engine**: Stockfish

## License

MIT License
