"""
Stockfish Engine Wrapper
========================
Provides a Python interface to the Stockfish chess engine via UCI protocol.

Key Concepts:
- UCI (Universal Chess Interface): Text-based protocol for chess engines
- FEN: Forsyth-Edwards Notation - compact board state representation
- Centipawns: 100 cp = 1 pawn advantage (positive = white, negative = black)
- MultiPV: Multiple Principal Variations - show top N best lines
"""

import chess
import chess.engine
import os
from typing import Optional, Dict, List, Any


class ChessAnalyzer:
    """
    Wrapper class for Stockfish engine communication.
    
    Usage:
        analyzer = ChessAnalyzer("path/to/stockfish")
        result = analyzer.analyze_position(fen, depth=20, multipv=3)
        analyzer.close()
    """
    
    def __init__(self, stockfish_path: str):
        """
        Initialize connection to Stockfish engine.
        
        Args:
            stockfish_path: Path to Stockfish executable
        """
        self.stockfish_path = stockfish_path
        self.engine = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Stockfish engine."""
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)
        except Exception as e:
            raise RuntimeError(f"Failed to connect to Stockfish: {e}")
    
    def analyze_position(
        self,
        fen: str,
        depth: int = 20,
        multipv: int = 3
    ) -> Dict[str, Any]:
        """
        Analyze a chess position and return multiple best lines.
        
        Args:
            fen: Position in FEN notation
            depth: Search depth in plies (half-moves)
            multipv: Number of principal variations to return
        
        Returns:
            Dictionary with:
                - success: bool
                - lines: list of analysis lines
                - position: the analyzed FEN
                - turn: 'white' or 'black'
                - error: error message if failed
        """
        try:
            # Validate FEN
            board = chess.Board(fen)
        except ValueError as e:
            return {
                "success": False,
                "error": f"Invalid FEN: {str(e)}",
                "position": fen
            }
        
        try:
            # Run multi-line analysis
            analysis = self.engine.analyse(
                board,
                chess.engine.Limit(depth=depth),
                multipv=multipv
            )
            
            lines = []
            for info in analysis:
                line_data = self._parse_analysis_info(info, board)
                if line_data:
                    lines.append(line_data)
            
            return {
                "success": True,
                "lines": lines,
                "position": fen,
                "turn": "white" if board.turn == chess.WHITE else "black"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "position": fen
            }
    
    def _parse_analysis_info(
        self,
        info: chess.engine.InfoDict,
        board: chess.Board
    ) -> Optional[Dict[str, Any]]:
        """
        Parse Stockfish analysis output into structured data.
        
        Args:
            info: Raw analysis info from python-chess
            board: The chess board being analyzed
        
        Returns:
            Dictionary with score, moves, and formatted data
        """
        if "pv" not in info or "score" not in info:
            return None
        
        score = info["score"].white()  # Always from white's perspective
        
        # Format score
        if score.is_mate():
            mate_in = score.mate()
            score_cp = None
            score_text = f"M{mate_in}" if mate_in > 0 else f"M{mate_in}"
            # Large numeric value for sorting
            score_numeric = 10000 if mate_in > 0 else -10000
        else:
            score_cp = score.score()
            score_numeric = score_cp
            score_text = f"{score_cp/100:+.2f}"
        
        # Convert moves to SAN (Standard Algebraic Notation)
        pv = info["pv"]
        san_moves = []
        temp_board = board.copy()
        
        for move in pv[:10]:  # Limit to 10 moves for display
            try:
                san_moves.append(temp_board.san(move))
                temp_board.push(move)
            except:
                break
        
        return {
            "score": score_numeric,
            "scoreText": score_text,
            "scoreCp": score_cp,
            "isMate": score.is_mate(),
            "mateIn": score.mate() if score.is_mate() else None,
            "moves": san_moves,
            "movesUci": [move.uci() for move in pv[:10]],
            "depth": info.get("depth", 0)
        }
    
    def get_best_move(self, fen: str, time_limit: float = 1.0) -> Dict[str, Any]:
        """
        Get the single best move for a position (quick analysis).
        
        Args:
            fen: Position in FEN notation
            time_limit: Maximum time in seconds
        
        Returns:
            Dictionary with bestMove in UCI and SAN notation
        """
        try:
            board = chess.Board(fen)
        except ValueError as e:
            return {"success": False, "error": f"Invalid FEN: {str(e)}"}
        
        try:
            result = self.engine.play(
                board,
                chess.engine.Limit(time=time_limit)
            )
            
            best_move = result.move
            return {
                "success": True,
                "bestMove": best_move.uci(),
                "bestMoveSan": board.san(best_move)
            }
            
        except Exception as e:
            return {"success": False, "error": f"Failed to get best move: {str(e)}"}
    
    def close(self):
        """Close the engine connection and cleanup resources."""
        if self.engine:
            try:
                self.engine.quit()
            except:
                pass
            self.engine = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Utility function to find Stockfish
def find_stockfish() -> Optional[str]:
    """
    Try to find Stockfish executable in common locations.
    
    Returns:
        Path to Stockfish if found, None otherwise
    """
    # Common paths to check
    possible_paths = [
        # Relative to project
        "../engines/stockfish.exe",
        "../engines/stockfish",
        "engines/stockfish.exe",
        "engines/stockfish",
        # System paths
        "stockfish",
        "/usr/local/bin/stockfish",
        "/usr/bin/stockfish",
        # Windows common
        "C:/stockfish/stockfish.exe",
        "C:/Program Files/Stockfish/stockfish.exe",
    ]
    
    for path in possible_paths:
        if os.path.isfile(path):
            return os.path.abspath(path)
    
    return None
