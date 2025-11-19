#!/bin/bash
# Start backend services manually (without Docker)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Agent Analytics Backend Services..."

# Start API Server
echo "📡 Starting API server on port 3000..."
cd api
DATA_DIR=../data PORT=3000 API_KEY=dev_local_key NODE_ENV=development npm run dev > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid
cd ..

# Wait for API to start
sleep 3

# Check if API is running
if ! lsof -ti:3000 > /dev/null 2>&1; then
    echo "❌ API server failed to start. Check api.log for details."
    exit 1
fi

echo "✅ API server started (PID: $API_PID)"

# Start OTel Collector
echo "📊 Starting OpenTelemetry Collector..."
if [ ! -f "./otelcol-contrib" ]; then
    echo "❌ OTel Collector binary not found. Please download it first."
    exit 1
fi

./otelcol-contrib --config=otel-collector-config.yaml > otel-collector.log 2>&1 &
OTEL_PID=$!
echo $OTEL_PID > otel-collector.pid

# Wait for OTel Collector to start
sleep 3

# Check if OTel Collector is running
if ! lsof -ti:4317 > /dev/null 2>&1; then
    echo "❌ OTel Collector failed to start. Check otel-collector.log for details."
    exit 1
fi

echo "✅ OTel Collector started (PID: $OTEL_PID)"

echo ""
echo "✅ All services started successfully!"
echo ""
echo "Service Status:"
echo "  - API Server:     http://localhost:3000 (PID: $API_PID)"
echo "  - OTel gRPC:      localhost:4317 (PID: $OTEL_PID)"
echo "  - OTel HTTP:      localhost:4318 (PID: $OTEL_PID)"
echo "  - DuckDB:         data/agent_analytics.duckdb"
echo ""
echo "To stop services, run: ./stop-services.sh"
echo "To view logs:"
echo "  - API: tail -f api.log"
echo "  - OTel: tail -f otel-collector.log"

