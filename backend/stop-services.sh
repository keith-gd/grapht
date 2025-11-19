#!/bin/bash
# Stop backend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping Agent Analytics Backend Services..."

# Stop API Server
if [ -f "api.pid" ]; then
    API_PID=$(cat api.pid)
    if kill -0 "$API_PID" 2>/dev/null; then
        echo "Stopping API server (PID: $API_PID)..."
        kill "$API_PID"
        rm api.pid
        echo "✅ API server stopped"
    else
        echo "⚠️  API server was not running"
        rm api.pid
    fi
else
    # Try to find and kill by port
    API_PID=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$API_PID" ]; then
        echo "Stopping API server on port 3000 (PID: $API_PID)..."
        kill "$API_PID"
        echo "✅ API server stopped"
    fi
fi

# Stop OTel Collector
if [ -f "otel-collector.pid" ]; then
    OTEL_PID=$(cat otel-collector.pid)
    if kill -0 "$OTEL_PID" 2>/dev/null; then
        echo "Stopping OTel Collector (PID: $OTEL_PID)..."
        kill "$OTEL_PID"
        rm otel-collector.pid
        echo "✅ OTel Collector stopped"
    else
        echo "⚠️  OTel Collector was not running"
        rm otel-collector.pid
    fi
else
    # Try to find and kill by ports
    OTEL_PID=$(lsof -ti:4317 2>/dev/null || lsof -ti:4318 2>/dev/null || true)
    if [ -n "$OTEL_PID" ]; then
        echo "Stopping OTel Collector (PID: $OTEL_PID)..."
        kill "$OTEL_PID"
        echo "✅ OTel Collector stopped"
    fi
fi

echo ""
echo "✅ All services stopped"

