#!/bin/bash
# Quick start script for Voice Vault development

set -e

echo "🚀 Voice Vault - Quick Start"
echo "============================"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "blockchain" ]; then
    echo "❌ Error: Run this script from the VoiceVault root directory"
    exit 1
fi

# Check environment files
echo "📋 Checking environment files..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env not found. Copy from .env.example if available."
fi
if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Warning: frontend/.env not found. Copy from .env.example if available."
fi

# Start backend
echo ""
echo "🐍 Starting Flask backend..."
echo "   Port: 5001"
echo "   Mode: Check backend/.env for MOCK_MODE setting"
echo ""

cd backend
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate venv and start Flask in background
source venv/bin/activate
python app.py &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

# Health check
HEALTH=$(curl -s http://localhost:5001/api/health || echo "error")
if [[ $HEALTH == *"ok"* ]]; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed. Check logs above."
fi

cd ..

# Start frontend
echo ""
echo "⚛️  Starting React frontend..."
echo "   Port: 5173"
echo "   URL: http://localhost:5173"
echo ""

cd frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

cd ..

echo ""
echo "✅ Voice Vault is running!"
echo ""
echo "   Backend:  http://localhost:5001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📝 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "   Or press Ctrl+C (may need to manually kill processes)"
echo ""

# Keep script running
wait
