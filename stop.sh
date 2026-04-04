#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Voice Vault - Stop Script
# ═══════════════════════════════════════════════════════════════
# This script stops all Voice Vault services
# Usage: ./stop.sh
# ═══════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        Voice Vault - Stopping Services                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

STOPPED_SOMETHING=false

# ═══════════════════════════════════════════════════════════════
# Stop Backend
# ═══════════════════════════════════════════════════════════════

print_info "Stopping Backend (Flask)..."

# Try to use saved PID first
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid 2>/dev/null)
    if [ -n "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID 2>/dev/null
        sleep 1
        kill -9 $BACKEND_PID 2>/dev/null || true
        print_success "Backend stopped (PID: $BACKEND_PID)"
        STOPPED_SOMETHING=true
    fi
    rm -f logs/backend.pid
fi

# Also check port 5001
if command -v lsof &> /dev/null; then
    BACKEND_PIDS=$(lsof -ti:5001 2>/dev/null || true)
    if [ -n "$BACKEND_PIDS" ]; then
        echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
        print_success "Killed processes on port 5001"
        STOPPED_SOMETHING=true
    fi
fi

# Kill any Python app.py processes
FLASK_PIDS=$(pgrep -f "python.*app.py" 2>/dev/null || true)
if [ -n "$FLASK_PIDS" ]; then
    echo "$FLASK_PIDS" | xargs kill -9 2>/dev/null || true
    print_success "Killed Flask processes"
    STOPPED_SOMETHING=true
fi

# ═══════════════════════════════════════════════════════════════
# Stop Frontend
# ═══════════════════════════════════════════════════════════════

print_info "Stopping Frontend (React)..."

# Try to use saved PID first
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid 2>/dev/null)
    if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID 2>/dev/null
        sleep 1
        kill -9 $FRONTEND_PID 2>/dev/null || true
        print_success "Frontend stopped (PID: $FRONTEND_PID)"
        STOPPED_SOMETHING=true
    fi
    rm -f logs/frontend.pid
fi

# Also check port 5173
if command -v lsof &> /dev/null; then
    FRONTEND_PIDS=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$FRONTEND_PIDS" ]; then
        echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null || true
        print_success "Killed processes on port 5173"
        STOPPED_SOMETHING=true
    fi
fi

# Kill any Vite processes
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)
if [ -n "$VITE_PIDS" ]; then
    echo "$VITE_PIDS" | xargs kill -9 2>/dev/null || true
    print_success "Killed Vite processes"
    STOPPED_SOMETHING=true
fi

# Kill any node processes related to this project
NODE_PIDS=$(pgrep -f "node.*frontend" 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    print_success "Killed Node processes"
    STOPPED_SOMETHING=true
fi

# ═══════════════════════════════════════════════════════════════
# Verify & Report
# ═══════════════════════════════════════════════════════════════

echo ""
sleep 1

# Verify ports are free
PORTS_FREE=true
if command -v lsof &> /dev/null; then
    if lsof -i:5001 >/dev/null 2>&1; then
        print_warning "Port 5001 is still in use"
        PORTS_FREE=false
    fi
    if lsof -i:5173 >/dev/null 2>&1; then
        print_warning "Port 5173 is still in use"
        PORTS_FREE=false
    fi
fi

# Final status
echo -e "\n${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        ✓ Voice Vault Services Stopped                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

if [ "$STOPPED_SOMETHING" = true ]; then
    print_success "All services have been stopped"
else
    print_info "No Voice Vault services were running"
fi

if [ "$PORTS_FREE" = true ]; then
    print_success "Ports 5001 and 5173 are now free"
else
    echo ""
    print_warning "Some ports may still be in use"
    print_info "Run: lsof -i:5001 -i:5173"
fi

echo ""
