# dbt Quick Start Guide

## ✅ Setup Complete!

Your dbt environment is ready with:
- **dbt-core 1.10.15** with **dbt-duckdb 1.10.0**
- Python 3.12 virtual environment (isolated from your dbt-fusion setup)
- Connection to DuckDB at `backend/data/agent_analytics.duckdb`

## 🚀 How to Use

### Method 1: Helper Script (Easiest)

```bash
cd dbt
./run_dbt.sh debug      # Test connection
./run_dbt.sh run        # Run all models
./run_dbt.sh test       # Run tests
./run_dbt.sh compile    # Compile SQL
```

### Method 2: Direct Commands

```bash
cd dbt
.venv/bin/dbt debug --profiles-dir .
.venv/bin/dbt run --profiles-dir .
.venv/bin/dbt test --profiles-dir .
```

### Method 3: Activate venv (if you prefer)

```bash
cd dbt
source .venv/bin/activate
dbt debug --profiles-dir .
dbt run --profiles-dir .
deactivate  # when done
```

## 📝 Development Workflow

### 1. Edit SQL Models

```bash
# Edit models in:
dbt/models/staging/*.sql
dbt/models/intermediate/*.sql
dbt/models/marts/*.sql
```

### 2. Run Specific Models

```bash
# Run all staging models
./run_dbt.sh run --select staging

# Run specific model
./run_dbt.sh run --select stg_git_commits

# Run model and downstream dependencies
./run_dbt.sh run --select stg_git_commits+
```

### 3. Test Your Models

```bash
# Run all tests
./run_dbt.sh test

# Test specific model
./run_dbt.sh test --select stg_git_commits
```

### 4. View Compiled SQL

```bash
./run_dbt.sh compile
cat target/compiled/agent_analytics/models/staging/stg_git_commits.sql
```

## ⚠️ Important Notes

### DuckDB Locking

**DuckDB only allows ONE connection at a time!**

- **Stop the API** before running dbt:
  ```bash
  pkill -f "node.*index.js"
  ```

- **Restart the API** after dbt:
  ```bash
  cd backend/api && PORT=3333 DATA_DIR=../data API_KEY=dev_local_key node index.js > /tmp/agent-api.log 2>&1 &
  ```

### Alternative: Use `--read-only` Mode (Coming Soon)

You can query DuckDB while API is running using read-only mode:
```bash
./run_dbt.sh run --vars '{read_only: true}'
```

## 📊 Model Structure

```
staging/          # Clean raw data
├── stg_git_commits.sql
├── stg_agent_sessions.sql
├── stg_agent_token_usage.sql
└── stg_copilot_metrics.sql

intermediate/     # Business logic
├── int_sessions_with_costs.sql
├── int_commits_with_agent_context.sql
└── int_agent_daily_aggregates.sql

marts/           # Dashboard-ready
├── fct_git_commits.sql
├── fct_agent_costs.sql
├── fct_daily_agent_usage.sql
├── dim_agents.sql
└── dim_developers.sql
```

## 🔧 Troubleshooting

### "Could not set lock" error
The API is still running. Stop it: `pkill -f "node.*index.js"`

### "Connection test: ERROR"
Check the database exists:
```bash
ls -la ../backend/data/agent_analytics.duckdb
```

### "No module named dbt"
You're not using the venv. Use `./run_dbt.sh` instead.

### Clean rebuild
```bash
rm -rf .venv
python3.12 -m venv .venv
.venv/bin/pip install dbt-core dbt-duckdb
```

## 📚 Next Steps

1. **Implement staging models** - Clean raw data
2. **Add dbt tests** - Ensure data quality
3. **Build intermediate models** - Add business logic
4. **Create marts** - Dashboard-ready tables
5. **Generate docs** - `./run_dbt.sh docs generate`

## 🎯 Quick Reference

```bash
# Common commands
./run_dbt.sh debug                    # Test connection
./run_dbt.sh run                      # Run all models
./run_dbt.sh run --select staging     # Run staging only
./run_dbt.sh test                     # Run all tests
./run_dbt.sh compile                  # Compile SQL
./run_dbt.sh docs generate            # Generate docs
./run_dbt.sh clean                    # Clean target dir
```

---

**Ready to build!** Start with implementing the staging models.
