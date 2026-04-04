#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Voice Vault - Quick Start Script
# ═══════════════════════════════════════════════════════════════
# This script starts all required services for Voice Vault
# Usage: ./start.sh [--mock]
# ═══════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Helper functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Get script directory and navigate to it
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse arguments
MOCK_MODE="false"
if [[ "$1" == "--mock" ]]; then
    MOCK_MODE="true"
fi

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ╦  ╦┌─┐┬┌─┐┌─┐  ╦  ╦┌─┐┬ ┬┬ ┌┬┐                             ║
║   ╚╗╔╝│ ││  ├┤   ╚╗╔╝├─┤│ ││  │                               ║
║    ╚╝ └─┘┴└─┘└─┘   ╚╝ ┴ ┴└─┘┴─┘┴                              ║
║                                                               ║
║   Decentralized Voice Identity & Deepfake Detection           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

if [[ "$MOCK_MODE" == "true" ]]; then
    echo -e "${YELLOW}   ⚠️  Running in MOCK MODE (simulated AI responses)${NC}\n"
else
    echo -e "${GREEN}   🤖 Running in REAL AI MODE (actual voice processing)${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════
# Pre-flight Checks
# ═══════════════════════════════════════════════════════════════

print_info "Running pre-flight checks..."

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Run this script from the VoiceVault root directory"
    echo -e "   Current directory: $(pwd)"
    exit 1
fi
print_success "Project directory verified"

# Check for backend virtual environment
if [ ! -d "backend/venv" ]; then
    print_error "Backend virtual environment not found"
    echo -e "\n   ${YELLOW}Run these commands first:${NC}"
    echo -e "   cd backend"
    echo -e "   python3 -m venv venv"
    echo -e "   source venv/bin/activate"
    echo -e "   pip install -r requirements.txt"
    exit 1
fi
print_success "Backend virtual environment found"

# Check for frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Frontend dependencies not installed"
    print_info "Installing frontend dependencies..."
    (cd frontend && npm install) || {
        print_error "Failed to install frontend dependencies"
        exit 1
    }
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies verified"
fi

# Check environment files
if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env not found"
    if [ -f ".env.example" ]; then
        print_info "Copying from .env.example..."
        cp .env.example backend/.env
    fi
fi

# Create logs directory
mkdir -p logs
print_success "Logs directory ready"

# ═══════════════════════════════════════════════════════════════
# Check for Existing Processes
# ═══════════════════════════════════════════════════════════════

print_info "Checking for existing processes..."

# Check port 5001 (backend)
if command -v lsof &> /dev/null && lsof -i:5001 >/dev/null 2>&1; then
    print_warning "Port 5001 is already in use"
    echo -ne "   Kill existing process? (y/n): "
    read -r answer
    if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
        lsof -ti:5001 | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "Killed existing backend process"
    else
        print_error "Cannot start backend - port 5001 is occupied"
        exit 1
    fi
fi

# Check port 5173 (frontend)
if command -v lsof &> /dev/null && lsof -i:5173 >/dev/null 2>&1; then
    print_warning "Port 5173 is already in use"
    echo -ne "   Kill existing process? (y/n): "
    read -r answer
    if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "Killed existing frontend process"
    else
        print_error "Cannot start frontend - port 5173 is occupied"
        exit 1
    fi
fi

print_success "Ports are available"

# ═══════════════════════════════════════════════════════════════
# 1. Start Backend (Flask)
# ═══════════════════════════════════════════════════════════════

echo ""
print_info "Starting Backend (Flask + AI Models)..."

cd backend
source venv/bin/activate
export MOCK_MODE=$MOCK_MODE
nohup python3 app.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

print_info "Backend process started (PID: $BACKEND_PID)"

# Wait for backend to be ready
if [[ "$MOCK_MODE" == "false" ]]; then
    print_info "Waiting for AI models to load (this may take 30-60 seconds)..."
    MAX_WAIT=120
else
    print_info "Waiting for backend to start..."
    MAX_WAIT=30
fi

BACKEND_READY=false
for i in $(seq 1 $MAX_WAIT); do
    # Check if process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo ""
        print_error "Backend process died unexpectedly!"
        print_info "Check logs/backend.log for details"
        echo -e "\n   ${YELLOW}Last 10 lines of log:${NC}"
        tail -10 logs/backend.log 2>/dev/null || true
        exit 1
    fi
    
    # Check health endpoint
    HEALTH=$(curl -s http://localhost:5001/api/health 2>/dev/null || echo "")
    
    if [[ $HEALTH == *"ok"* ]]; then
        if [[ "$MOCK_MODE" == "true" ]]; then
            BACKEND_READY=true
            break
        elif [[ $HEALTH == *'"model_loaded":true'* ]]; then
            BACKEND_READY=true
            break
        fi
    fi
    
    # Progress indicator
    if [ $((i % 5)) -eq 0 ]; then
        echo -ne "${BLUE}.${NC}"
    fi
    
    sleep 1
done

echo ""
if [ "$BACKEND_READY" = true ]; then
    print_success "Backend started successfully (PID: $BACKEND_PID)"
    if [[ "$MOCK_MODE" == "false" ]]; then
        print_success "AI Models loaded"
    fi
else
    print_warning "Backend may not be fully ready (timeout after ${MAX_WAIT}s)"
    print_info "Continuing anyway... check logs/backend.log if issues occur"
fi

# ═══════════════════════════════════════════════════════════════
# 2. Start Frontend (React + Vite)
# ═══════════════════════════════════════════════════════════════

echo ""
print_info "Starting Frontend (React + Vite)..."

cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

print_info "Frontend process started (PID: $FRONTEND_PID)"
print_info "Waiting for frontend to start..."

# Wait for frontend to be ready
FRONTEND_READY=false
for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    
    # Check if process is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo ""
        print_error "Frontend process died unexpectedly!"
        print_info "Check logs/frontend.log for details"
        exit 1
    fi
    
    sleep 1
done

if [ "$FRONTEND_READY" = true ]; then
    print_success "Frontend started successfully (PID: $FRONTEND_PID)"
else
    print_warning "Frontend may still be starting... check logs/frontend.log"
fi

# ═══════════════════════════════════════════════════════════════
# Save PIDs for stop.sh
# ═══════════════════════════════════════════════════════════════

echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid

# ═══════════════════════════════════════════════════════════════
# Success!
# ═══════════════════════════════════════════════════════════════

echo -e "\n${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        ✓ Voice Vault Started Successfully!                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BOLD}Services Running:${NC}"
echo -e "  • Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  • Backend:  ${BLUE}http://localhost:5001${NC}"
echo -e "  • Health:   ${BLUE}http://localhost:5001/api/health${NC}"

echo -e "\n${BOLD}Mode:${NC}"
if [[ "$MOCK_MODE" == "true" ]]; then
    echo -e "  • ${YELLOW}MOCK MODE${NC} - Simulated AI responses (fast)"
else
    echo -e "  • ${GREEN}REAL AI MODE${NC} - Actual voice biometric processing"
fi

echo -e "\n${BOLD}Logs:${NC}"
echo -e "  • Backend:  logs/backend.log"
echo -e "  • Frontend: logs/frontend.log"

echo -e "\n${BOLD}Useful Commands:${NC}"
echo -e "  ${CYAN}tail -f logs/backend.log${NC}   # Watch backend logs"
echo -e "  ${CYAN}tail -f logs/frontend.log${NC}  # Watch frontend logs"
echo -e "  ${CYAN}./stop.sh${NC}                  # Stop all services"
echo -e "  ${CYAN}./validate_accuracy.py${NC}     # Run accuracy tests"

echo -e "\n${GREEN}Opening browser...${NC}\n"

# Open browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open http://localhost:5173 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sleep 2
    xdg-open http://localhost:5173 2>/dev/null || true
fi

echo -e "${BLUE}Press Ctrl+C or run ./stop.sh to stop all services${NC}\n"
