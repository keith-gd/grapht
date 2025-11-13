# dbt Project - Agent Analytics Platform

This dbt project transforms raw telemetry and git commit data into analytics-ready tables for dashboards.

## Project Structure

```
dbt/
├── dbt_project.yml          # dbt project configuration
├── profiles.yml              # Database connection profiles
├── models/
│   ├── staging/              # Clean and standardize raw data
│   │   ├── _staging.yml     # Source definitions
│   │   ├── stg_agent_sessions.sql
│   │   ├── stg_agent_token_usage.sql
│   │   ├── stg_git_commits.sql
│   │   └── stg_copilot_metrics.sql
│   ├── intermediate/         # Enrichment and joins
│   │   ├── int_sessions_with_costs.sql
│   │   ├── int_commits_with_agent_context.sql
│   │   └── int_agent_daily_aggregates.sql
│   └── marts/               # Analytics-ready tables
│       ├── _marts.yml       # Model tests
│       ├── fct_daily_agent_usage.sql
│       ├── fct_git_commits.sql
│       ├── fct_agent_costs.sql
│       ├── dim_developers.sql
│       └── dim_agents.sql
└── README.md
```

## Setup

### Prerequisites

- Python 3.8+
- dbt-duckdb installed: `pip install dbt-duckdb`
- DuckDB database file at `../backend/data/agent_analytics.duckdb` (created by backend initialization)

### Configuration

1. **Install dbt-duckdb:**
   ```bash
   pip install dbt-duckdb
   ```

2. **Verify `profiles.yml`** is configured for DuckDB:
   ```yaml
   agent_analytics:
     target: dev
     outputs:
       dev:
         type: duckdb
         path: ../backend/data/agent_analytics.duckdb
         schema: main
         threads: 4
   ```

3. **Test connection:**
   ```bash
   dbt debug
   ```

   This will verify:
   - dbt-duckdb adapter is installed
   - DuckDB file exists and is accessible
   - Connection to DuckDB database works

## Usage

### Run All Models

```bash
dbt run
```

### Run Specific Layer

```bash
# Run only staging models
dbt run --models staging.*

# Run only intermediate models
dbt run --models intermediate.*

# Run only marts models
dbt run --models marts.*
```

### Run Specific Model

```bash
dbt run --models fct_daily_agent_usage
```

### Run with Dependencies

```bash
# Include upstream models
dbt run --models +fct_daily_agent_usage

# Include downstream models
dbt run --models fct_daily_agent_usage+
```

### Test Models

```bash
# Run all tests
dbt test

# Test specific model
dbt test --models fct_daily_agent_usage
```

### Generate Documentation

```bash
dbt docs generate
dbt docs serve
```

## Model Lineage

```
raw.otel_metrics ──┐
raw.otel_logs ─────┤
                   ├──> stg_agent_sessions ──┐
                   │                          │
                   └──> stg_agent_token_usage ┘
                                                │
                                                ├──> int_sessions_with_costs ──┐
                                                │                               │
raw.git_commits ──────> stg_git_commits ────────────> int_commits_with_agent_context
                                                │                               │
                                                └──> int_agent_daily_aggregates │
                                                                                │
                                                                                ├──> fct_daily_agent_usage
                                                                                ├──> fct_git_commits
                                                                                ├──> fct_agent_costs
                                                                                │
                                                                                └──> Dashboard Queries
```

## Model Descriptions

### Staging Layer

- **stg_agent_sessions**: Extract agent sessions from OTel logs, one row per session
- **stg_agent_token_usage**: Aggregate token usage metrics from OTel metrics
- **stg_git_commits**: Clean raw git commit data (last 90 days)
- **stg_copilot_metrics**: Clean Copilot daily metrics (last 90 days)

### Intermediate Layer

- **int_sessions_with_costs**: Enrich sessions with token usage and cost calculations
- **int_commits_with_agent_context**: Correlate commits with agent sessions
- **int_agent_daily_aggregates**: Pre-aggregate daily stats for faster dashboard queries

### Marts Layer

- **fct_daily_agent_usage**: Daily usage and cost metrics per developer and agent
- **fct_git_commits**: All commits with agent enrichment for analysis
- **fct_agent_costs**: Cost rollups by time period for budgeting and forecasting
- **dim_developers**: Developer dimension for joins and filters
- **dim_agents**: Agent types dimension

## Cost Model

Pricing is hardcoded in `int_sessions_with_costs.sql` (as of Nov 2024). To update:

1. Option A: Update the pricing CTE directly in the model
2. Option B: Create a seed file `seeds/claude_pricing.csv` and load with `dbt seed`

## Troubleshooting

### Connection Issues

- Verify DuckDB file exists: `ls -la ../backend/data/agent_analytics.duckdb`
- Check file path in `profiles.yml` is correct (relative to dbt/ directory)
- Ensure dbt-duckdb is installed: `pip show dbt-duckdb`
- Run `dbt debug` to diagnose connection problems

### Model Errors

- Check raw data exists: `SELECT COUNT(*) FROM raw.git_commits;` (using DuckDB CLI or dbt show)
- Verify schemas exist: DuckDB creates schemas automatically on first run
- Review dbt logs: `dbt run --log-level debug`
- Compile models to check SQL: `dbt compile`

### Test Failures

- Some tests require `dbt_utils` package: `dbt deps`
- Check data quality in raw tables
- Review test definitions in `_marts.yml`

### DuckDB-Specific Notes

- DuckDB uses `main` schema by default for dbt models
- Raw tables are in `raw` schema (as defined in backend initialization)
- DuckDB supports PostgreSQL-compatible SQL, so most SQL functions work as-is
- JSON extraction uses `->>` operator (same as PostgreSQL)

## Next Steps

1. Run `dbt run` to build all models
2. Connect Metabase/Grafana to the `mart` schema
3. Build dashboards using the fact and dimension tables
4. Schedule dbt runs (cron or dbt Cloud)

