.PHONY: help build up down run test compile debug deps clean

help:
	@echo "dbt Docker Commands"
	@echo ""
	@echo "  make build    - Build the dbt Docker image"
	@echo "  make up       - Start dbt container in background"
	@echo "  make down     - Stop and remove dbt container"
	@echo "  make run      - Run dbt models (dbt run)"
	@echo "  make test     - Run dbt tests (dbt test)"
	@echo "  make compile  - Compile dbt models (dbt compile)"
	@echo "  make debug    - Check dbt connection (dbt debug)"
	@echo "  make deps     - Install dbt packages (dbt deps)"
	@echo "  make clean    - Clean target directory"
	@echo "  make shell    - Open shell in dbt container"
	@echo ""
	@echo "Custom commands:"
	@echo "  make dbt CMD='run --select staging'  - Run custom dbt command"

# Build Docker image
build:
	docker-compose build

# Start container
up:
	docker-compose up -d
	@echo "✅ dbt container started"

# Stop container
down:
	docker-compose down
	@echo "✅ dbt container stopped"

# Run dbt models
run: up
	docker-compose exec dbt dbt run --profiles-dir .

# Run specific models
run-staging: up
	docker-compose exec dbt dbt run --select staging --profiles-dir .

run-intermediate: up
	docker-compose exec dbt dbt run --select intermediate --profiles-dir .

run-marts: up
	docker-compose exec dbt dbt run --select marts --profiles-dir .

# Run dbt tests
test: up
	docker-compose exec dbt dbt test --profiles-dir .

# Compile models
compile: up
	docker-compose exec dbt dbt compile --profiles-dir .

# Debug connection
debug: up
	docker-compose exec dbt dbt debug --profiles-dir .

# Install dependencies
deps: up
	docker-compose exec dbt dbt deps --profiles-dir .

# Clean target directory
clean: up
	docker-compose exec dbt dbt clean --profiles-dir .

# Open shell in container
shell: up
	docker-compose exec dbt bash

# Run custom dbt command
# Usage: make dbt CMD='run --select my_model'
dbt: up
	docker-compose exec dbt dbt $(CMD) --profiles-dir .

# Generate docs
docs: up
	docker-compose exec dbt dbt docs generate --profiles-dir .
	@echo "📚 Documentation generated. To serve: make docs-serve"

docs-serve: up
	docker-compose exec dbt dbt docs serve --profiles-dir .
