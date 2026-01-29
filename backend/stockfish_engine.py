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
    
    def analyze_game(
        self,
        moves: List[str],
        depth: int = 18
    ) -> Dict[str, Any]:
        """
        Analyze a full game and classify each move.
        
        Args:
            moves: List of moves in SAN notation
            depth: Search depth for analysis
        
        Returns:
            Dictionary with:
                - success: bool
                - moves: list of analyzed moves with classifications
                - accuracy: dict with white/black accuracy percentages
                - summary: move classification counts
        """
        try:
            board = chess.Board()
            analyzed_moves = []
            
            white_losses = []
            black_losses = []
            
            # Get initial eval
            prev_eval = self._get_position_eval(board, depth)
            
            for i, move_san in enumerate(moves):
                try:
                    # Get best move before making the played move
                    best_result = self.engine.analyse(
                        board,
                        chess.engine.Limit(depth=depth),
                        multipv=1
                    )
                    best_move = best_result[0]["pv"][0] if best_result else None
                    best_eval = self._extract_eval(best_result[0]) if best_result else prev_eval
                    
                    # Parse and make the played move
                    move = board.parse_san(move_san)
                    is_white = board.turn == chess.WHITE
                    board.push(move)
                    
                    # Evaluate after the move
                    current_eval = self._get_position_eval(board, depth)
                    
                    # Calculate centipawn loss
                    if is_white:
                        cp_loss = best_eval - current_eval
                    else:
                        cp_loss = current_eval - best_eval
                    
                    cp_loss = max(0, cp_loss)  # Can't have negative loss
                    
                    # Classify the move
                    classification = self._classify_move(cp_loss, move, best_move)
                    
                    # Track losses for accuracy
                    if is_white:
                        white_losses.append(cp_loss)
                    else:
                        black_losses.append(cp_loss)
                    
                    analyzed_moves.append({
                        "moveNumber": (i // 2) + 1,
                        "move": move_san,
                        "moveUci": move.uci(),
                        "isWhite": is_white,
                        "eval": current_eval,
                        "evalText": f"{current_eval/100:+.2f}",
                        "bestMove": board.san(best_move) if best_move else None,
                        "cpLoss": cp_loss,
                        "classification": classification
                    })
                    
                    prev_eval = current_eval
                    
                except Exception as e:
                    analyzed_moves.append({
                        "moveNumber": (i // 2) + 1,
                        "move": move_san,
                        "isWhite": not board.turn,
                        "error": str(e),
                        "classification": "unknown"
                    })
            
            # Calculate accuracy
            white_accuracy = self._calculate_accuracy(white_losses)
            black_accuracy = self._calculate_accuracy(black_losses)
            
            # Count classifications
            summary = self._count_classifications(analyzed_moves)
            
            return {
                "success": True,
                "moves": analyzed_moves,
                "accuracy": {
                    "white": round(white_accuracy, 1),
                    "black": round(black_accuracy, 1)
                },
                "summary": summary
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Game analysis failed: {str(e)}"
            }
    
    def _get_position_eval(self, board: chess.Board, depth: int) -> int:
        """Get centipawn evaluation for a position."""
        try:
            result = self.engine.analyse(
                board,
                chess.engine.Limit(depth=depth),
                multipv=1
            )
            return self._extract_eval(result[0])
        except:
            return 0
    
    def _extract_eval(self, info: Dict) -> int:
        """Extract centipawn value from analysis info."""
        if "score" not in info:
            return 0
        score = info["score"].white()
        if score.is_mate():
            return 10000 if score.mate() > 0 else -10000
        return score.score() or 0
    
    def _classify_move(
        self,
        cp_loss: int,
        played_move: chess.Move,
        best_move: Optional[chess.Move]
    ) -> str:
        """
        Classify a move based on centipawn loss.
        
        Classifications:
        - best: 0 cp loss (played the best move)
        - excellent: 0-10 cp loss
        - good: 10-25 cp loss
        - inaccuracy: 25-50 cp loss
        - mistake: 50-100 cp loss
        - blunder: >100 cp loss
        """
        if best_move and played_move == best_move:
            return "best"
        
        if cp_loss <= 10:
            return "excellent"
        elif cp_loss <= 25:
            return "good"
        elif cp_loss <= 50:
            return "inaccuracy"
        elif cp_loss <= 100:
            return "mistake"
        else:
            return "blunder"
    
    def _calculate_accuracy(self, losses: List[int]) -> float:
        """
        Calculate accuracy percentage from centipawn losses.
        Uses a formula similar to chess.com/lichess.
        """
        if not losses:
            return 100.0
        
        # Formula: accuracy = 100 * (1 - avg_loss/100)^0.5
        # Capped at 0-100
        avg_loss = sum(losses) / len(losses)
        accuracy = 100 * max(0, (1 - avg_loss / 200)) ** 0.5
        return min(100, max(0, accuracy))
    
    def _count_classifications(self, moves: List[Dict]) -> Dict:
        """Count move classifications for summary."""
        counts = {
            "white": {"best": 0, "excellent": 0, "good": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0},
            "black": {"best": 0, "excellent": 0, "good": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0}
        }
        
        for move in moves:
            side = "white" if move.get("isWhite") else "black"
            classification = move.get("classification", "unknown")
            if classification in counts[side]:
                counts[side][classification] += 1
        
        return counts


class MoveExplainer:
    """
    Generates human-readable explanations for chess moves.
    Focuses on making moves understandable for beginners/intermediates.
    """
    
    # Piece names for explanations
    PIECE_NAMES = {
        chess.PAWN: "pawn",
        chess.KNIGHT: "knight", 
        chess.BISHOP: "bishop",
        chess.ROOK: "rook",
        chess.QUEEN: "queen",
        chess.KING: "king"
    }
    
    # Central squares
    CENTER_SQUARES = {chess.D4, chess.D5, chess.E4, chess.E5}
    EXTENDED_CENTER = {chess.C3, chess.C4, chess.C5, chess.C6,
                       chess.D3, chess.D4, chess.D5, chess.D6,
                       chess.E3, chess.E4, chess.E5, chess.E6,
                       chess.F3, chess.F4, chess.F5, chess.F6}
    
    @classmethod
    def explain_move(cls, board: chess.Board, move: chess.Move, 
                     is_best: bool = False, cp_loss: int = 0) -> Dict[str, str]:
        """
        Generate human-readable explanation for a move.
        
        Returns dict with:
            - description: What the move does
            - impact: Future positional impact
            - classification_reason: Why it's classified this way
        """
        # Get move details before making it
        piece = board.piece_at(move.from_square)
        captured = board.piece_at(move.to_square)
        piece_name = cls.PIECE_NAMES.get(piece.piece_type, "piece") if piece else "piece"
        
        # Check move characteristics
        is_capture = captured is not None
        is_check = board.gives_check(move)
        is_castle = board.is_castling(move)
        is_promotion = move.promotion is not None
        is_en_passant = board.is_en_passant(move)
        
        # Generate description
        description = cls._generate_description(
            board, move, piece, piece_name, 
            is_capture, is_check, is_castle, is_promotion, is_en_passant, captured
        )
        
        # Generate impact
        impact = cls._generate_impact(
            board, move, piece, piece_name,
            is_capture, is_check, is_castle, is_promotion
        )
        
        # Classification reason
        if is_best:
            classification_reason = "This was the engine's top choice."
        elif cp_loss <= 10:
            classification_reason = "Very close to the best move - excellent play."
        elif cp_loss <= 25:
            classification_reason = "A solid move, though not quite optimal."
        elif cp_loss <= 50:
            classification_reason = f"Loses about {cp_loss/100:.1f} pawns worth of advantage."
        elif cp_loss <= 100:
            classification_reason = f"A mistake that costs roughly {cp_loss/100:.1f} pawns."
        else:
            classification_reason = f"A serious error costing over {cp_loss/100:.1f} pawns of advantage."
        
        return {
            "description": description,
            "impact": impact,
            "classificationReason": classification_reason
        }
    
    @classmethod
    def _generate_description(cls, board, move, piece, piece_name,
                              is_capture, is_check, is_castle, is_promotion, 
                              is_en_passant, captured) -> str:
        """Generate what the move does."""
        to_square_name = chess.square_name(move.to_square)
        from_square_name = chess.square_name(move.from_square)
        
        if is_castle:
            if move.to_square > move.from_square:
                return "Castles kingside, bringing the king to safety and connecting the rooks."
            else:
                return "Castles queenside, bringing the king to safety while activating the rook."
        
        if is_promotion:
            promo_piece = cls.PIECE_NAMES.get(move.promotion, "queen")
            if is_capture:
                return f"Captures on {to_square_name} and promotes the pawn to a {promo_piece}!"
            return f"Promotes the pawn to a {promo_piece} on {to_square_name}!"
        
        if is_en_passant:
            return f"Captures the pawn en passant on {to_square_name}."
        
        if is_capture:
            captured_name = cls.PIECE_NAMES.get(captured.piece_type, "piece")
            desc = f"Captures the {captured_name} on {to_square_name}"
            if is_check:
                desc += " with check"
            return desc + "."
        
        # Regular move
        if piece and piece.piece_type == chess.PAWN:
            desc = f"Advances the pawn to {to_square_name}"
        else:
            desc = f"Moves the {piece_name} to {to_square_name}"
        
        if is_check:
            desc += ", giving check"
        
        return desc + "."
    
    @classmethod
    def _generate_impact(cls, board, move, piece, piece_name,
                         is_capture, is_check, is_castle, is_promotion) -> str:
        """Generate future positional impact."""
        impacts = []
        
        if is_castle:
            impacts.append("The king is now safe from central attacks")
            impacts.append("The rook is ready to control open files")
            return ". ".join(impacts) + "."
        
        if is_promotion:
            impacts.append("Gains a powerful new piece")
            return ". ".join(impacts) + "."
        
        if is_capture:
            impacts.append("Wins material")
        
        if is_check:
            impacts.append("Forces the opponent to address the check")
        
        # Check if move controls center
        if move.to_square in cls.CENTER_SQUARES:
            impacts.append("Controls key central squares")
        elif move.to_square in cls.EXTENDED_CENTER:
            impacts.append("Influences the center")
        
        # Check if it's a developing move (piece leaves back rank)
        if piece and piece.piece_type in [chess.KNIGHT, chess.BISHOP]:
            from_rank = chess.square_rank(move.from_square)
            if (piece.color == chess.WHITE and from_rank == 0) or \
               (piece.color == chess.BLACK and from_rank == 7):
                impacts.append("Develops a piece toward the action")
        
        # Rook to open file
        if piece and piece.piece_type == chess.ROOK:
            file = chess.square_file(move.to_square)
            # Check if file is open (simplified check)
            impacts.append("Places the rook on an active file")
        
        if not impacts:
            impacts.append("Improves piece positioning")
        
        return ". ".join(impacts) + "."
    
    @classmethod
    def explain_comparison(cls, board: chess.Board, played_move: chess.Move,
                           best_move: chess.Move, cp_loss: int) -> Dict[str, Any]:
        """
        Compare played move vs best move with explanations.
        """
        played_explanation = cls.explain_move(board, played_move, is_best=False, cp_loss=cp_loss)
        best_explanation = cls.explain_move(board, best_move, is_best=True, cp_loss=0)
        
        # Generate comparison
        if cp_loss <= 10:
            comparison = "Your move was virtually as good as the best option."
        elif cp_loss <= 25:
            comparison = "Your move was fine, but the best move was slightly more accurate."
        elif cp_loss <= 50:
            comparison = "The best move would have maintained a stronger position."
        elif cp_loss <= 100:
            comparison = "The best move was significantly better for your position."
        else:
            comparison = "The best move would have preserved a major advantage."
        
        return {
            "playedMove": {
                "san": board.san(played_move),
                **played_explanation
            },
            "bestMove": {
                "san": board.san(best_move),
                **best_explanation
            },
            "comparison": comparison
        }


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
