"""
Flask API Server for Chess Analyzer
====================================
Provides REST API endpoints for chess position analysis using Stockfish.

Endpoints:
    POST /api/analyze    - Multi-line position analysis
    POST /api/best-move  - Quick best move lookup
    GET  /health         - Server health check
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from stockfish_engine import ChessAnalyzer, find_stockfish
from gemini_coach import get_coach

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes, allowing all origins, methods, and headers
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Stockfish engine
STOCKFISH_PATH = os.environ.get("STOCKFISH_PATH") or find_stockfish()
analyzer = None

def get_analyzer():
    """Get or create the chess analyzer instance."""
    global analyzer
    if analyzer is None:
        if STOCKFISH_PATH is None:
            raise RuntimeError(
                "Stockfish not found. Please set STOCKFISH_PATH environment variable "
                "or place stockfish executable in the 'engines' folder."
            )
        analyzer = ChessAnalyzer(STOCKFISH_PATH)
    return analyzer


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify server is running."""
    stockfish_status = "available" if STOCKFISH_PATH else "not found"
    return jsonify({
        "status": "ok",
        "stockfish": stockfish_status,
        "stockfishPath": STOCKFISH_PATH
    })


@app.route("/api/analyze", methods=["POST"])
def analyze_position():
    """
    Analyze a chess position with multiple principal variations.
    
    Request Body:
        {
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "depth": 20,      // Optional, default 20
            "multipv": 3      // Optional, default 3
        }
    
    Response:
        {
            "success": true,
            "lines": [
                {
                    "score": 25,
                    "scoreText": "+0.25",
                    "moves": ["e4", "e5", "Nf3"],
                    "depth": 20
                },
                ...
            ],
            "position": "...",
            "turn": "white"
        }
    """
    try:
        data = request.get_json()
        
        if not data or "fen" not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'fen' in request body"
            }), 400
        
        fen = data["fen"]
        depth = min(data.get("depth", 20), 30)  # Cap at 30 for performance
        multipv = min(data.get("multipv", 3), 5)  # Cap at 5 lines
        
        engine = get_analyzer()
        result = engine.analyze_position(fen, depth=depth, multipv=multipv)
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except RuntimeError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500


@app.route("/api/best-move", methods=["POST"])
def get_best_move():
    """
    Get the single best move for a position (quick analysis).
    
    Request Body:
        {
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        }
    
    Response:
        {
            "success": true,
            "bestMove": "e2e4",
            "bestMoveSan": "e4"
        }
    """
    try:
        data = request.get_json()
        
        if not data or "fen" not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'fen' in request body"
            }), 400
        
        fen = data["fen"]
        
        engine = get_analyzer()
        result = engine.get_best_move(fen)
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except RuntimeError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500


@app.route("/api/analyze-game", methods=["POST"])
def analyze_game():
    """
    Analyze a full chess game and classify each move.
    
    Request Body:
        {
            "moves": ["e4", "e5", "Nf3", "Nc6", ...],  // SAN notation
            "depth": 18   // Optional, default 18
        }
    
    Response:
        {
            "success": true,
            "moves": [
                {
                    "moveNumber": 1,
                    "move": "e4",
                    "isWhite": true,
                    "eval": 20,
                    "evalText": "+0.20",
                    "classification": "best",
                    "cpLoss": 0
                },
                ...
            ],
            "accuracy": {
                "white": 85.6,
                "black": 81.9
            },
            "summary": {
                "white": {"best": 10, "excellent": 5, ...},
                "black": {"best": 8, "excellent": 6, ...}
            }
        }
    """
    try:
        data = request.get_json()
        
        if not data or "moves" not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'moves' in request body"
            }), 400
        
        moves = data["moves"]
        depth = min(data.get("depth", 18), 24)  # Cap for performance
        
        if not isinstance(moves, list) or len(moves) == 0:
            return jsonify({
                "success": False,
                "error": "Moves must be a non-empty list"
            }), 400
        
        engine = get_analyzer()
        result = engine.analyze_game(moves, depth=depth)
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except RuntimeError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500


if __name__ == "__main__":
    print("=" * 50)
    print("AI Chess Analyzer Backend")
    print("=" * 50)
    
    if STOCKFISH_PATH:
        print(f"Stockfish found at: {STOCKFISH_PATH}")
    else:
        print("WARNING: Stockfish not found!")
        print("Please set STOCKFISH_PATH or place stockfish in 'engines/' folder")
    
    print("\nStarting server on http://localhost:5000")
    print("=" * 50)
    
    app.run(host="0.0.0.0", port=5000, debug=True)


@app.route("/api/explain-move", methods=["POST"])
def explain_move():
    """
    Get AI-powered explanation for a chess move.
    
    Request Body:
        {
            "fen": "position FEN",
            "move": "e4",
            "isWhite": true,
            "classification": "best",
            "bestMove": "e4",
            "cpLoss": 0
        }
    """
    try:
        data = request.get_json()
        
        coach = get_coach()
        result = coach.explain_move(
            position_fen=data.get("fen", ""),
            move_san=data.get("move", ""),
            is_white=data.get("isWhite", True),
            classification=data.get("classification", "unknown"),
            best_move_san=data.get("bestMove"),
            cp_loss=data.get("cpLoss", 0)
        )
        
        return jsonify({"success": True, **result})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/game-summary", methods=["POST"])
def game_summary():
    """
    Get AI-generated game summary.
    
    Request Body:
        {
            "moves": [...],
            "whiteAccuracy": 85.5,
            "blackAccuracy": 82.3
        }
    """
    try:
        data = request.get_json()
        
        coach = get_coach()
        summary = coach.analyze_game_summary(
            moves_data=data.get("moves", []),
            white_accuracy=data.get("whiteAccuracy", 0),
            black_accuracy=data.get("blackAccuracy", 0)
        )
        
        return jsonify({"success": True, "summary": summary})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/teach", methods=["POST"])
def teach_concept():
    """
    Teach a chess concept using AI.
    
    Request Body:
        {
            "concept": "castling" or "what is a fork?"
        }
    """
    try:
        data = request.get_json()
        concept = data.get("concept", "")
        
        if not concept:
            return jsonify({"success": False, "error": "No concept provided"}), 400
        
        coach = get_coach()
        explanation = coach.teach_concept(concept)
        
        return jsonify({"success": True, "explanation": explanation})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

