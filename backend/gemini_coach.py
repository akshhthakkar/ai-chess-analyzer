"""
Gemini AI Chess Coach
=====================
Uses Google Gemini to generate human-readable chess explanations.
Analyzes the full board state to provide context-aware coaching.
"""

import os
import chess
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Chess coaching system prompt
CHESS_COACH_SYSTEM = """You are a friendly chess coach explaining moves to beginners and intermediate players.
Your explanations should be:
- Clear and concise (3-4 sentences)
- Focus on the IDEAS and STRATEGY behind moves
- Mention threats, tactics, and future plans
- Use beginner-friendly language
- Be encouraging and educational

DO NOT use phrases like "As a chess coach" or "Let me explain". Just give the explanation directly."""


class GeminiChessCoach:
    """Uses Gemini to generate context-aware chess explanations."""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def _describe_position(self, fen: str) -> str:
        """Convert FEN to human-readable position description."""
        try:
            board = chess.Board(fen)
            
            description = []
            
            # Material count
            white_material = self._count_material(board, chess.WHITE)
            black_material = self._count_material(board, chess.BLACK)
            material_diff = white_material - black_material
            
            if material_diff > 0:
                description.append(f"White is up {material_diff} points of material")
            elif material_diff < 0:
                description.append(f"Black is up {-material_diff} points of material")
            else:
                description.append("Material is equal")
            
            # King safety
            if board.has_kingside_castling_rights(chess.WHITE) or board.has_queenside_castling_rights(chess.WHITE):
                description.append("White can still castle")
            if board.has_kingside_castling_rights(chess.BLACK) or board.has_queenside_castling_rights(chess.BLACK):
                description.append("Black can still castle")
            
            # Checks
            if board.is_check():
                description.append("The king is in CHECK!")
            
            # Game phase
            total_pieces = len(board.piece_map())
            if total_pieces > 24:
                description.append("Opening/early middlegame phase")
            elif total_pieces > 14:
                description.append("Middlegame phase")
            else:
                description.append("Endgame phase")
            
            # Center control
            center_squares = [chess.D4, chess.D5, chess.E4, chess.E5]
            white_center = sum(1 for sq in center_squares if board.is_attacked_by(chess.WHITE, sq))
            black_center = sum(1 for sq in center_squares if board.is_attacked_by(chess.BLACK, sq))
            if white_center > black_center + 1:
                description.append("White has strong central control")
            elif black_center > white_center + 1:
                description.append("Black has strong central control")
            
            return ". ".join(description) + "."
            
        except Exception as e:
            return f"Position from FEN: {fen}"
    
    def _count_material(self, board: chess.Board, color: chess.Color) -> int:
        """Count material for a side (Q=9, R=5, B=3, N=3, P=1)."""
        values = {chess.QUEEN: 9, chess.ROOK: 5, chess.BISHOP: 3, 
                  chess.KNIGHT: 3, chess.PAWN: 1, chess.KING: 0}
        total = 0
        for piece_type in values:
            total += len(board.pieces(piece_type, color)) * values[piece_type]
        return total
    
    def explain_move(
        self,
        position_fen: str,
        move_san: str,
        is_white: bool,
        classification: str,
        best_move_san: Optional[str] = None,
        cp_loss: int = 0
    ) -> Dict[str, str]:
        """Generate a context-aware explanation for a chess move."""
        
        side = "White" if is_white else "Black"
        position_desc = self._describe_position(position_fen)
        
        # Build comprehensive prompt
        prompt = f"""{CHESS_COACH_SYSTEM}

CURRENT POSITION STATE:
{position_desc}

FEN: {position_fen}

MOVE PLAYED:
{side} played: {move_san}
Move quality: {classification}

TASK:
1. Explain what {move_san} does in this specific position
2. Mention any threats created or prevented
3. Describe the strategic idea behind the move"""

        if best_move_san and best_move_san != move_san and cp_loss > 25:
            prompt += f"""

BETTER ALTERNATIVE:
The best move was: {best_move_san} (saves ~{cp_loss/100:.1f} pawns of advantage)
Also explain briefly why {best_move_san} was stronger."""

        try:
            response = self.model.generate_content(prompt)
            explanation = response.text.strip()
            
            return {
                "explanation": explanation,
                "source": "gemini"
            }
        except Exception as e:
            return {
                "explanation": f"Move: {move_san}",
                "error": str(e),
                "source": "fallback"
            }
    
    def suggest_move(self, position_fen: str, best_move: str, eval_score: int) -> Dict[str, str]:
        """Get AI suggestion for what to play and why."""
        
        position_desc = self._describe_position(position_fen)
        
        try:
            board = chess.Board(position_fen)
            side = "White" if board.turn == chess.WHITE else "Black"
        except:
            side = "The player"
        
        prompt = f"""{CHESS_COACH_SYSTEM}

CURRENT POSITION:
{position_desc}

FEN: {position_fen}

The engine suggests: {best_move}
Position evaluation: {eval_score/100:+.2f} (positive = better for White)

Explain why {best_move} is the best move here. What does it achieve? What threats does it create?
Keep it practical and instructive."""

        try:
            response = self.model.generate_content(prompt)
            return {
                "suggestion": best_move,
                "explanation": response.text.strip(),
                "source": "gemini"
            }
        except Exception as e:
            return {
                "suggestion": best_move,
                "explanation": f"Best move is {best_move}",
                "source": "fallback"
            }
    
    def analyze_game_summary(
        self,
        moves_data: List[Dict],
        white_accuracy: float,
        black_accuracy: float
    ) -> str:
        """Generate a comprehensive game summary."""
        
        # Analyze key moments
        blunders = [m for m in moves_data if m.get('classification') == 'blunder']
        mistakes = [m for m in moves_data if m.get('classification') == 'mistake']
        best_moves = [m for m in moves_data if m.get('classification') == 'best']
        
        # Build context
        blunder_info = ""
        if blunders:
            blunder_moves = [f"{m['move']} (move {m.get('moveNumber', '?')})" for m in blunders[:3]]
            blunder_info = f"Key blunders: {', '.join(blunder_moves)}"
        
        prompt = f"""{CHESS_COACH_SYSTEM}

GAME ANALYSIS RESULTS:
- Total moves: {len(moves_data)}
- White accuracy: {white_accuracy}%
- Black accuracy: {black_accuracy}%
- Best moves played: {len(best_moves)}
- Mistakes: {len(mistakes)}
- Blunders: {len(blunders)}
{blunder_info}

Write a helpful summary (4-5 sentences):
1. Who played better overall?
2. What were the critical moments?
3. What should each player work on?

Be encouraging and constructive."""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            winner = "White" if white_accuracy > black_accuracy else "Black"
            return f"{winner} played more accurately. White: {white_accuracy}%, Black: {black_accuracy}%."
    
    def teach_concept(self, concept: str) -> str:
        """Teach a chess concept interactively."""
        
        prompt = f"""{CHESS_COACH_SYSTEM}

A student wants to learn about: "{concept}"

Provide a clear, beginner-friendly explanation:
1. What is {concept}?
2. Why is it important?
3. Give a simple example
4. One practical tip to remember

Keep it to 5-6 sentences total. Be encouraging!"""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Sorry, I couldn't explain '{concept}' right now. Try asking again!"


# Singleton instance
_coach: Optional[GeminiChessCoach] = None

def get_coach() -> GeminiChessCoach:
    """Get or create the Gemini coach instance."""
    global _coach
    if _coach is None:
        _coach = GeminiChessCoach()
    return _coach
