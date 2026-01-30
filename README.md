# ♟️ AI Chess Analyzer

![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![Status](https://img.shields.io/badge/status-active-success)

**A college project by [@akshhthakkar](https://github.com/akshhthakkar) and [@karshs](https://github.com/karshs).**

AI Chess Analyzer is a powerful web-based tool that allows users to analyze chess positions using the Stockfish engine. It provides real-time evaluations, best move suggestions, and a visual advantage bar, making it an excellent companion for chess players looking to improve their game.

---

## 📑 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Authors](#-authors)
- [License](#-license)

---

## ✨ Features

- **Interactive Chessboard**: Drag-and-drop interface powered by Chessboard.js.
- **Stockfish Integration**: Utilizes the powerful Stockfish engine for position analysis.
- **Multi-PV Analysis**: View the top 1-5 best moves for any given position.
- **Adjustable Depth**: Configure search depth (10-30 ply) for deeper analysis.
- **Visual Evaluation Bar**: Real-time visual feedback on who is winning (White vs. Black).
- **FEN Support**: Import and export board states using FEN strings.
- **Real-time Evaluation**: Instant feedback on move quality and positional advantage.

## 📸 Screenshots

_(Add screenshots of your application here)_

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+**: [Download Python](https://www.python.org/downloads/)
- **Stockfish Engine**: [Download Stockfish](https://stockfishchess.org/download/)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/akshhthakkar/ai-chess-analyzer.git
cd ai-chess-analyzer
```

### 2. Setup Stockfish

1.  Download the Stockfish executable for your operating system.
2.  Create an `engines` directory in the root folder if it doesn't exist.
3.  Place the `stockfish.exe` (or binary) inside the `engines/` folder.

### 3. Backend Setup

Navigate to the backend directory and set up the virtual environment:

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Frontend Setup

The frontend is a static HTML/JS application and doesn't require complex installation.

## 🏃 Usage

### 1. Start the Backend Server

Ensure your virtual environment is activated and run:

```bash
cd backend
python app.py
```

The Flask API will start at `http://localhost:5000`.

### 2. Run the Frontend

Open a new terminal window:

```bash
cd frontend
python -m http.server 8000
```

### 3. Open the Application

Open your web browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

1.  **Analyze**: Move pieces on the board or paste a FEN string.
2.  **Settings**: Adjust the "Depth" and "Multi-PV" sliders.
3.  **Go**: Click "Analyze Position" to see Stockfish's best moves and evaluation.

## 📂 Project Structure

```bash
ai-chess-analyzer/
├── backend/
│   ├── app.py              # Flask API server & socket handling
│   ├── stockfish_engine.py # Wrapper class for Stockfish interaction
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── index.html          # Main application interface
│   ├── style.css           # Custom styling
│   ├── app.js              # Frontend logic and API communication
│   └── img/                # Assets (chess pieces, etc.)
├── engines/
│   └── stockfish.exe       # Stockfish engine binary
└── README.md
```

## 💻 Tech Stack

- **Backend**: Python, Flask, python-chess
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Libraries**:
  - [Chessboard.js](https://chessboardjs.com/) (Board UI)
  - [Chess.js](https://github.com/jhlywa/chess.js) (Move validation)
- **Engine**: [Stockfish](https://stockfishchess.org/)

## 👥 Authors

- **Aksh Thakkar** - [@akshhthakkar](https://github.com/akshhthakkar)
- **Karshs** - [@karshs](https://github.com/karshs)
