# Architecture

## Overview

Brief overview of the system architecture for AI Chess Analyzer.

## Components

- Client — UI and user interactions
- Server — API, analysis engine, model serving
- Data — PG/NoSQL storage for games, analysis results

## Data flow

1. User submits a game or position via Client
2. Server validates and queues analysis
3. Analysis engine processes and stores results
4. Client fetches and displays results

## Notes

Add diagrams, component responsibilities, and scaling considerations here.
