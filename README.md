# AI-Powered Chess Game Analyzer

A post-game analysis tool that explains chess moves in clear, coach-like language so beginners and intermediate players can learn why moves were good or bad — not just what the engine says.

Collaborators: @akshhthakkar, @karshs

---

## Highlights

- Human-readable, strategic explanations (plans, weaknesses, alternatives)
- Single clear recommendation per move (no overload of engine lines)
- Supports PGN paste, file upload, and Chess.com imports
- Interactive board, move-by-move graph, and Stockfish-backed evaluation

## Usage

- Paste a PGN into the UI, upload a PGN file, or import games from Chess.com by username.
- Analyses are post-game only — this tool is for learning and review, not live assistance.

## Features

- Move classification (Best / Good / Inaccuracy / Mistake / Blunder / Brilliant)
- Move-by-move human explanations focused on plans and consequences
- Interactive chessboard and evaluation graph
- Clean, responsive UI with accessibility in mind

## Project Structure

```
ai-chess-analyzer/
├── client/        # React frontend
├── server/        # Node.js + Express backend
├── docs/          # Architecture and design documentation
├── README.md
└── CONTRIBUTING.md
```

## Tech Stack

- Frontend: React, react-chessboard, chess.js
- Backend: Node.js, Express, Stockfish
- DB: MongoDB (Atlas)

## Roadmap / Planned Enhancements

- Configurable Stockfish strength
- Optional AI-generated explanation layer
- User accounts and saved history
- Shareable reports and dark mode

## Contributing

See `CONTRIBUTING.md` for guidelines — welcome pull requests, issues, and suggestions.

## Ethics & Safety

This app does NOT provide live assistance during ongoing games; it is intended solely for post-game learning and improvement.

## License

This project is licensed under the terms in `LICENSE`.

---
