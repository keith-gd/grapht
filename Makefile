.PHONY: help start stop restart logs status clean test

# Default target
help:
	@echo "Agent Analytics Platform - Makefile Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make start       - Start all backend services"
	@echo "  make stop        - Stop all backend services"
	@echo "  make restart     - Restart all backend services"
	@echo "  make logs        - View logs from all services"
	@echo "  make status      - Check status of all services"
	@echo "  make clean       - Stop services and remove volumes (WARNING: deletes data)"
	@echo "  make test-api    - Test API health endpoint"
	@echo "  make install-cli - Install CLI tool globally"
	@echo ""

# Start all backend services
start:
	@echo "🚀 Starting backend services..."
	cd backend && docker-compose up -d
	@echo "✅ Services started. Waiting for health checks..."
	@sleep 5
	@make status

# Stop all backend services
stop:
	@echo "🛑 Stopping backend services..."
	cd backend && docker-compose down
	@echo "✅ Services stopped."

# Restart all backend services
restart: stop start

# View logs from all services
logs:
	cd backend && docker-compose logs -f

# Check status of all services
status:
	@echo "📊 Service Status:"
	@cd backend && docker-compose ps
	@echo ""
	@echo "🔍 Testing API health..."
	@curl -s http://localhost:3000/health | grep -q "healthy" && echo "✅ API is healthy" || echo "❌ API is not responding"

# Clean: stop services and remove volumes (WARNING: deletes all data)
clean:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd backend && docker-compose down -v; \
		echo "✅ Cleaned up all services and data."; \
	else \
		echo "Cancelled."; \
	fi

# Test API health endpoint
test-api:
	@echo "🔍 Testing API..."
	@curl -s http://localhost:3000/health | python3 -m json.tool || echo "❌ API not responding"

# Install CLI tool globally
install-cli:
	@echo "📦 Installing CLI tool..."
	cd cli && npm install && npm link
	@echo "✅ CLI installed. Run 'agent-analytics --version' to verify."

# Setup: First-time setup (start services + install CLI)
setup: start install-cli
	@echo ""
	@echo "🎉 Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'agent-analytics init' in your project"
	@echo "  2. Configure Claude Code with OTel env vars"
	@echo "  3. Start using your AI coding assistants"
	@echo "  4. View dashboard at http://localhost:3001"

