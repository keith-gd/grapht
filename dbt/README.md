# dbt for Agent Analytics

This dbt project transforms raw agent telemetry data into analytics-ready models.

## Setup (Docker - Isolated Environment)

**No Python/dbt installation needed!** Everything runs in Docker.

### Prerequisites
- Docker Desktop installed

### Quick Start

```bash
# 1. Build the dbt Docker image (one-time)
make build

# 2. Start the dbt container
make up

# 3. Check connection
make debug

# 4. Run all models
make run
```

### Common Commands

```bash
# Run specific layer
make run-staging        # Run staging models only
make run-intermediate   # Run intermediate models only
make run-marts          # Run marts models only

# Run specific model
make dbt CMD='run --select stg_git_commits'

# Run tests
make test

# Generate documentation
make docs
make docs-serve         # View at http://localhost:8080

# Open shell in container
make shell

# Stop container
make down
```

## Model Structure

```
models/
├── staging/           # Clean raw data
│   ├── stg_git_commits.sql
│   ├── stg_agent_sessions.sql
│   ├── stg_agent_token_usage.sql
│   └── stg_copilot_metrics.sql
├── intermediate/      # Business logic
│   ├── int_sessions_with_costs.sql
│   ├── int_commits_with_agent_context.sql
│   └── int_agent_daily_aggregates.sql
└── marts/            # Dashboard-ready
    ├── fct_git_commits.sql
    ├── fct_agent_costs.sql
    ├── fct_daily_agent_usage.sql
    ├── dim_agents.sql
    └── dim_developers.sql
```

## Database Connection

- **Type:** DuckDB
- **Path:** `/data/agent_analytics.duckdb` (mapped to `../backend/data/`)
- **Schema:** `main`

## Development Workflow

1. **Edit SQL models** in `models/` directory
2. **Run models:** `make run`
3. **Test:** `make test`
4. **Check compiled SQL:** `make compile` (see `target/compiled/`)

## Troubleshooting

**Container won't start?**
```bash
docker ps -a  # Check container status
docker logs agent-analytics-dbt
```

**Connection errors?**
```bash
make debug  # Check dbt connection
ls -la ../backend/data/agent_analytics.duckdb  # Check DB exists
```

**Reset everything:**
```bash
make down
make build
make up
```

## Without Docker (Not Recommended)

If you must run without Docker:
```bash
pip install dbt-core dbt-duckdb --user
dbt debug --profiles-dir .
dbt run --profiles-dir .
```
