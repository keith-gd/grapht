# Test Data Generator

This script generates realistic test data for the Agent Analytics Platform, including agent sessions, git commits, and Copilot metrics.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **DuckDB** database file accessible (at `backend/data/agent_analytics.duckdb`)
3. **Database schema** initialized (run `init_duckdb.sql` first)

## Installation

1. Install dependencies in the `backend/api` directory:

```bash
cd backend/api
npm install @faker-js/faker
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "@faker-js/faker": "^8.0.0"
  }
}
```

Then run:

```bash
npm install
```

## Configuration

The script uses environment variables for database connection. Set up a `.env` file in the `backend/api` directory:

```env
DATA_DIR=/app/data
```

Or use the default path (for Docker Compose setup):
```
DATA_DIR=/app/data
```

**Note:** DuckDB is embedded - no connection string needed. The database file is at `DATA_DIR/agent_analytics.duckdb`.

## Usage

### Run the script:

```bash
# From the backend directory
node scripts/generate-test-data.js

# Or make it executable and run directly
chmod +x scripts/generate-test-data.js
./scripts/generate-test-data.js
```

### Using Docker Compose:

If you're running the database via Docker Compose:

```bash
# From the backend directory
docker-compose exec api node scripts/generate-test-data.js
```

## What It Generates

### 1. Agent Sessions (100 sessions)
- **OTel Logs**: Session start and end events in `raw_otel_logs`
- **Token Metrics**: Token usage metrics in `raw_otel_metrics` for Claude Code sessions
  - Input tokens: 1,000 - 50,000 per session
  - Output tokens: 500 - 20,000 per session
  - Cache creation/read tokens (realistic ratios)
- **Session Duration**: 5 minutes to 1 hour
- **Agent Types**: Mix of `claude_code`, `cursor`, and `github_copilot`
- **Models**: Realistic Claude model names (Sonnet, Opus, Haiku)

### 2. Git Commits (50 commits)
- **Mix**: 60% agent-assisted, 40% manual commits
- **Correlation**: Agent-assisted commits linked to recent agent sessions
- **Realistic Data**:
  - Agent-assisted: 3-15 files changed, 50-500 lines added
  - Manual: 1-8 files changed, 10-200 lines added
- **Time Range**: Last 30 days

### 3. Copilot Metrics (7 days)
- **Daily Metrics**: Per developer for the last 7 days
- **Metrics Include**:
  - Total suggestions: 50-500 per day
  - Acceptance rate: 25-45%
  - Lines suggested/accepted
  - Language breakdown (JavaScript, TypeScript, Python, etc.)
- **Active Users**: 5-12 developers active per day

## Data Characteristics

The generated data is designed to be realistic:

- **Session durations** match typical coding session patterns
- **Token counts** reflect actual Claude Code usage patterns
- **Cost calculations** will be accurate based on Claude pricing
- **Commit patterns** show realistic agent-assisted vs manual ratios
- **Copilot metrics** follow typical acceptance rates and usage patterns

## Verification

After running the script, you can verify the data:

```sql
-- Check agent sessions
SELECT COUNT(*) FROM raw_otel_logs WHERE body LIKE '%session_start%';

-- Check token metrics
SELECT COUNT(*) FROM raw_otel_metrics WHERE metric_name LIKE 'claude_code.tokens%';

-- Check git commits
SELECT 
  COUNT(*) as total_commits,
  SUM(CASE WHEN agent_assisted THEN 1 ELSE 0 END) as agent_assisted
FROM raw_git_commits;

-- Check Copilot metrics
SELECT 
  COUNT(DISTINCT developer_id) as unique_developers,
  COUNT(*) as total_records
FROM raw_copilot_metrics;
```

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Verify DuckDB file exists:
   ```bash
   ls -lh backend/data/agent_analytics.duckdb
   duckdb backend/data/agent_analytics.duckdb -c "SELECT NOW();"
   ```

2. Check your `DATA_DIR` environment variable

3. Ensure the data directory exists:
   ```bash
   mkdir -p backend/data
   ```

### Schema Issues

If you get table/column errors:

1. Ensure `init_duckdb.sql` has been run:
   ```bash
   duckdb backend/data/agent_analytics.duckdb < backend/init_duckdb.sql
   ```

### Performance

For large datasets, the script inserts data in batches. If you need to generate more data, you can modify the counts in the script or run it multiple times.

## Notes

- The script uses `ON CONFLICT DO NOTHING` for Copilot metrics to avoid duplicates
- Session IDs are UUIDs to ensure uniqueness
- Commit hashes are generated using Faker's git utilities
- All timestamps are in UTC

