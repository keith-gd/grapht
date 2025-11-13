#!/bin/bash

# Reset Database Script
# Stops services, deletes the database file, and recreates the schema.
# Optionally seeds the database with test data.
# Usage: ./backend/scripts/reset-db.sh [--seed]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

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

# Check for --seed flag
SEED_DATA=false
if [ "$1" == "--seed" ]; then
  SEED_DATA=true
fi

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

echo "🔄 Resetting database..."
echo ""

# Step 1: Stop services
info "Step 1: Stopping services..."
cd "$BACKEND_DIR"

if [ -f "docker-compose.yml" ]; then
  $DOCKER_COMPOSE down 2>/dev/null || true
  success "Services stopped"
else
  info "No docker-compose.yml found, skipping service stop"
fi

echo ""

# Step 2: Delete database file
info "Step 2: Deleting database file..."

DATA_DIR="${DATA_DIR:-$BACKEND_DIR/data}"
DB_PATH="$DATA_DIR/agent_analytics.duckdb"

if [ -f "$DB_PATH" ]; then
  rm -f "$DB_PATH"
  success "Deleted database file: $DB_PATH"
else
  info "Database file not found: $DB_PATH (may not exist yet)"
fi

# Also clean up any .duckdb.wal files
if [ -f "$DB_PATH.wal" ]; then
  rm -f "$DB_PATH.wal"
  info "Deleted WAL file: $DB_PATH.wal"
fi

echo ""

# Step 3: Recreate schema
info "Step 3: Recreating database schema..."
cd "$BACKEND_DIR"

if [ ! -f "scripts/init-db.js" ]; then
  error "init-db.js not found at backend/scripts/init-db.js"
  exit 1
fi

if ! node scripts/init-db.js; then
  error "Failed to initialize database"
  exit 1
fi

success "Database schema recreated"
echo ""

# Step 4: Optionally seed data
if [ "$SEED_DATA" = true ]; then
  info "Step 4: Seeding database with test data..."
  
  if [ ! -f "scripts/seed-data.js" ]; then
    error "seed-data.js not found at backend/scripts/seed-data.js"
    exit 1
  fi
  
  if ! node scripts/seed-data.js; then
    error "Failed to seed database"
    exit 1
  fi
  
  success "Database seeded with test data"
  echo ""
fi

success "Database reset complete! 🎉"

if [ "$SEED_DATA" = false ]; then
  echo ""
  info "Tip: Run with --seed flag to populate test data:"
  info "   ./backend/scripts/reset-db.sh --seed"
fi

