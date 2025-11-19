#!/bin/bash
set -e

echo "🚀 Setting up Agent Analytics Platform..."

# 1. Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend/api
npm install
cd ../..

# 2. Initialize Database
echo "🗄️ Initializing Database..."
cd backend/api
export NODE_PATH=$(pwd)/node_modules
node ../scripts/init-db.js
sleep 5
cd ../..

# 3. Seed Data
echo "🌱 Seeding Test Data..."
cd backend/api
export NODE_PATH=$(pwd)/node_modules
node ../scripts/seed-data.js
sleep 5
cd ../..

# 4. Run dbt
echo "🔄 Running dbt transformations..."
echo "⚠️ Skipping dbt due to Python 3.14 compatibility issues. Dashboard will use raw tables."
# cd dbt
# ... (skipped)
# cd ..

# 5. Start Backend
echo "🏁 Starting Backend Service..."
cd backend


# Ensure scripts are executable
chmod +x start-services.sh
chmod +x stop-services.sh
if [ -f "otelcol-contrib" ]; then
    chmod +x otelcol-contrib
fi

./start-services.sh

