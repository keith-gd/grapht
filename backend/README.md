# Agent Analytics Platform - Backend Services

This directory contains all backend services for the Agent Analytics Platform, orchestrated via Docker Compose.

## Services

- **DuckDB** (embedded) - Database for raw and transformed data (single file at `data/agent_analytics.duckdb`)
- **OpenTelemetry Collector** (ports 4317/4318) - Receives agent telemetry
- **REST API** (port 3000) - Ingestion endpoints for commits and OTel data
- **Metabase** (port 3001) - Dashboard and visualization tool

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 8GB RAM available

### Start All Services

```bash
# Start all services in detached mode
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f otel-collector
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Service Details

### DuckDB Database

**Connection:**
- Database file: `backend/data/agent_analytics.duckdb`
- Embedded database (no separate server)
- Single file - easy to backup and move

**Connect via DuckDB CLI:**
```bash
duckdb backend/data/agent_analytics.duckdb
```

**Table Naming:**
- `raw_*` - Raw telemetry and commit data (e.g., `raw_git_commits`, `raw_otel_metrics`)
- `staging_*` - Cleaned data (created by dbt)
- `intermediate_*` - Enriched data (created by dbt)
- `mart_*` - Analytics-ready tables (created by dbt)

**Benefits:**
- Faster analytics queries (OLAP-optimized)
- Simpler setup (no separate database container)
- Single file database (easy backups)
- Future: can sync to MotherDuck for cloud deployment

### OpenTelemetry Collector

Receives telemetry from Claude Code and other OTel-compatible agents.

**Endpoints:**
- gRPC: `localhost:4317`
- HTTP: `localhost:4318`

**Configuration:** `otel-collector-config.yaml`

The collector forwards all received data to the API at `http://api:3000/v1/otel`.

### REST API

**Base URL:** `http://localhost:3000`

**Endpoints:**
- `GET /health` - Health check
- `POST /v1/commits` - Git commit ingestion
- `POST /v1/otel` - OpenTelemetry data ingestion

See `api/README.md` for detailed API documentation.

### Metabase

**URL:** `http://localhost:3001`

**First-time Setup:**
1. Open http://localhost:3001
2. Create admin account
3. Connect to database:
   - Type: DuckDB (or use JDBC connection)
   - Database file path: `/app/data/agent_analytics.duckdb` (from container perspective)
   - Or use JDBC URL: `jdbc:duckdb:/app/data/agent_analytics.duckdb`
   
   **Note:** Metabase may require DuckDB JDBC driver. Check Metabase documentation for DuckDB support.

## Development

### API Development

```bash
# Make changes to api/ files
# Changes are hot-reloaded (if using nodemon) or restart container:

docker-compose restart api

# View API logs
docker-compose logs -f api
```

### Database Changes

To modify the schema:

1. Edit `init_duckdb.sql`
2. Recreate the database:
```bash
# Stop services
docker-compose down

# Remove DuckDB file (WARNING: deletes all data)
rm backend/data/agent_analytics.duckdb

# Restart services (database will be recreated)
docker-compose up -d
```

**Note:** This will delete all data. For production, use migrations or ALTER TABLE statements.

### Testing Services

```bash
# Test API health
curl http://localhost:3000/health

# Test database connection (from host)
duckdb backend/data/agent_analytics.duckdb -c "SELECT COUNT(*) FROM raw_git_commits;"

# Or from inside container
docker-compose exec api duckdb /app/data/agent_analytics.duckdb -c "SELECT COUNT(*) FROM raw_git_commits;"

# Test OTel Collector
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{"resourceLogs":[]}'
```

## Troubleshooting

### Services won't start

```bash
# Check if ports are in use
lsof -i :3000  # API
lsof -i :3001  # Metabase
lsof -i :4317  # OTel gRPC
lsof -i :4318  # OTel HTTP

# View detailed logs
docker-compose logs

# Restart specific service
docker-compose restart <service-name>
```

### Database connection errors

```bash
# Check DuckDB file exists
ls -lh backend/data/agent_analytics.duckdb

# Ensure data directory exists
mkdir -p backend/data

# Check API logs for DuckDB errors
docker-compose logs api

# Connect directly to DuckDB
duckdb backend/data/agent_analytics.duckdb
```

### API errors

```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api

# Rebuild API container
docker-compose build api
docker-compose up -d api
```

### OTel Collector not receiving data

```bash
# Check collector logs
docker-compose logs otel-collector

# Verify collector is running
docker-compose ps otel-collector

# Test endpoint manually
curl -X POST http://localhost:4318/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{"resourceMetrics":[]}'
```

## Environment Variables

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

Key variables:
- `API_KEY` - API authentication key (default: `dev_local_key`)
- `DATA_DIR` - Directory where DuckDB file is stored (default: `/app/data`)
- `NODE_ENV` - Environment (development/production)

**Note:** No `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` needed - DuckDB is embedded.

## Data Persistence

Data is persisted in:
- `backend/data/agent_analytics.duckdb` - DuckDB database file (on host filesystem)
- `metabase_data` - Metabase metadata (Docker volume)

To backup:
```bash
# Simply copy the DuckDB file
cp backend/data/agent_analytics.duckdb backend/data/agent_analytics.duckdb.backup

# Or export to Parquet for long-term storage
duckdb backend/data/agent_analytics.duckdb -c "COPY (SELECT * FROM raw_git_commits) TO 'backup_commits.parquet' (FORMAT PARQUET);"
```

To restore:
```bash
# Copy backup file back
cp backend/data/agent_analytics.duckdb.backup backend/data/agent_analytics.duckdb
```

## Next Steps

1. Start services: `docker-compose up -d`
2. Initialize CLI tool (see `../cli/README.md`)
3. Configure agents to send telemetry
4. Run dbt transformations (see `../dbt/README.md`)
5. Build dashboards in Metabase

For detailed setup instructions, see `../files/SETUP_GUIDE.md`.

