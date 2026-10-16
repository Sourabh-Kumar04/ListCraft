#!/usr/bin/env bash
set -e

# Ensure Ollama is running
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "Starting local Ollama server..."
    ~/.local/bin/ollama serve > /dev/null 2>&1 &
    sleep 3
fi

echo "Starting ListCraft web application on http://127.0.0.1:8000 ..."
PYTHONPATH=. /usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
