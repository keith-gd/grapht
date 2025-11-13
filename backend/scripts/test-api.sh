#!/bin/bash

# Test API Script
# Tests the Agent Analytics API endpoints and verifies data insertion

set -e  # Exit on error

API_URL="http://localhost:3000"
API_KEY="${API_KEY:-dev_local_key}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
  error "docker-compose or docker is not installed"
  exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

echo "🚀 Starting API tests..."
echo ""

# Step 1: Start services
info "Step 1: Starting services with docker compose..."
cd "$PROJECT_ROOT/backend"
$DOCKER_COMPOSE up -d

if [ $? -ne 0 ]; then
  error "Failed to start services"
  exit 1
fi

success "Services started"
echo ""

# Step 2: Wait for API health check
info "Step 2: Waiting for API to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    success "API is healthy"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "API health check failed after $MAX_RETRIES retries"
    echo "   Check logs with: $DOCKER_COMPOSE logs api"
    exit 1
  fi
  
  sleep 1
done

echo ""

# Step 3: Test POST /v1/commits
info "Step 3: Testing POST /v1/commits..."

COMMIT_HASH=$(openssl rand -hex 20)
TIMESTAMP=$(date +%s)

COMMIT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/v1/commits" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"commit_hash\": \"$COMMIT_HASH\",
    \"commit_message\": \"test: API test commit\",
    \"author_name\": \"Test User\",
    \"author_email\": \"test@example.com\",
    \"timestamp\": $TIMESTAMP,
    \"files_changed\": 5,
    \"lines_added\": 100,
    \"lines_deleted\": 20,
    \"agent_assisted\": true,
    \"agent_session_id\": \"session_test_123\",
    \"agent_type\": \"claude_code\",
    \"developer_id\": \"dev_test_123\",
    \"project_id\": \"proj_test_123\"
  }")

HTTP_CODE=$(echo "$COMMIT_RESPONSE" | tail -n1)
BODY=$(echo "$COMMIT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  success "POST /v1/commits succeeded (HTTP $HTTP_CODE)"
else
  error "POST /v1/commits failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
  exit 1
fi

echo ""

# Step 4: Test POST /v1/otel
info "Step 4: Testing POST /v1/otel..."

OTEL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/v1/otel" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "resourceMetrics": [{
      "resource": {
        "attributes": [{
          "key": "developer_id",
          "value": {
            "stringValue": "dev_test_123"
          }
        }]
      },
      "scopeMetrics": [{
        "metrics": [{
          "name": "claude_code.tokens.input",
          "sum": {
            "dataPoints": [{
              "timeUnixNano": "'$(date +%s)000000000'",
              "asDouble": 1500
            }]
          }
        }]
      }]
    }],
    "resourceLogs": [{
      "resource": {
        "attributes": [{
          "key": "developer_id",
          "value": {
            "stringValue": "dev_test_123"
          }
        }]
      },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "'$(date +%s)000000000'",
          "severityText": "INFO",
          "body": {
            "stringValue": "session_start: session_test_123"
          },
          "attributes": [{
            "key": "session_id",
            "value": {
              "stringValue": "session_test_123"
            }
          }]
        }]
      }]
    }]
  }')

HTTP_CODE=$(echo "$OTEL_RESPONSE" | tail -n1)
BODY=$(echo "$OTEL_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  success "POST /v1/otel succeeded (HTTP $HTTP_CODE)"
else
  error "POST /v1/otel failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
  exit 1
fi

echo ""

# Step 5: Verify inserts with query.js
info "Step 5: Verifying data insertion..."

# Check commits
COMMIT_RESULT=$(cd "$PROJECT_ROOT/backend" && QUERY_SCRIPT_MODE=1 node scripts/query.js "SELECT COUNT(*) as count FROM raw.git_commits WHERE commit_hash = '$COMMIT_HASH'" 2>/dev/null || echo "0")
# Handle both numeric output and JSON output
if [[ "$COMMIT_RESULT" =~ ^[0-9]+$ ]]; then
  COMMIT_COUNT="$COMMIT_RESULT"
else
  COMMIT_COUNT=$(echo "$COMMIT_RESULT" | grep -oE '"count":\s*[0-9]+' | grep -oE '[0-9]+' | head -1 || echo "0")
fi

if [ "$COMMIT_COUNT" -ge 1 ]; then
  success "Commit verification: Found commit in database"
else
  error "Commit verification: Commit not found in database"
  exit 1
fi

# Check OTel metrics
METRIC_RESULT=$(cd "$PROJECT_ROOT/backend" && QUERY_SCRIPT_MODE=1 node scripts/query.js "SELECT COUNT(*) as count FROM raw.otel_metrics WHERE developer_id = 'dev_test_123'" 2>/dev/null || echo "0")
# Handle both numeric output and JSON output
if [[ "$METRIC_RESULT" =~ ^[0-9]+$ ]]; then
  METRIC_COUNT="$METRIC_RESULT"
else
  METRIC_COUNT=$(echo "$METRIC_RESULT" | grep -oE '"count":\s*[0-9]+' | grep -oE '[0-9]+' | head -1 || echo "0")
fi

if [ "$METRIC_COUNT" -ge 1 ]; then
  success "OTel metrics verification: Found metrics in database"
else
  error "OTel metrics verification: Metrics not found in database"
  exit 1
fi

# Check OTel logs
LOG_RESULT=$(cd "$PROJECT_ROOT/backend" && QUERY_SCRIPT_MODE=1 node scripts/query.js "SELECT COUNT(*) as count FROM raw.otel_logs WHERE developer_id = 'dev_test_123'" 2>/dev/null || echo "0")
# Handle both numeric output and JSON output
if [[ "$LOG_RESULT" =~ ^[0-9]+$ ]]; then
  LOG_COUNT="$LOG_RESULT"
else
  LOG_COUNT=$(echo "$LOG_RESULT" | grep -oE '"count":\s*[0-9]+' | grep -oE '[0-9]+' | head -1 || echo "0")
fi

if [ "$LOG_COUNT" -ge 1 ]; then
  success "OTel logs verification: Found logs in database"
else
  error "OTel logs verification: Logs not found in database"
  exit 1
fi

echo ""
success "All API tests passed! 🎉"

