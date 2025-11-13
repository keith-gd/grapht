# Technical Specification - Agent Analytics Platform

## System Architecture

### High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Developer Workstation                     │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Claude Code │  │   Copilot   │  │    Cursor   │          │
│  │             │  │             │  │             │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                   │
│         └────────────────┼────────────────┘                   │
│                          │                                    │
│                          ▼                                    │
│              ┌────────────────────────┐                       │
│              │  Agent Analytics CLI  │                       │
│              │  (npm global package) │                       │
│              └───────────┬────────────┘                       │
│                          │                                    │
│                          │ [OpenTelemetry + Git Hooks]       │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                      Backend Services                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           OpenTelemetry Collector                    │    │
│  │  (Receives agent telemetry via OTLP protocol)        │    │
│  └─────────────────────┬────────────────────────────────┘    │
│                        │                                       │
│                        ▼                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Ingestion API                           │    │
│  │  (REST endpoint for CLI data, Copilot API proxy)    │    │
│  └─────────────────────┬────────────────────────────────┘    │
│                        │                                       │
│                        ▼                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              DuckDB Database                        │    │
│  │  (Embedded, single file: agent_analytics.duckdb)    │    │
│  │                                                       │    │
│  │  Raw Tables:                                          │    │
│  │  - agent_sessions                                     │    │
│  │  - agent_tool_calls                                   │    │
│  │  - agent_token_usage                                  │    │
│  │  - git_commits                                        │    │
│  │  - copilot_metrics                                    │    │
│  └─────────────────────┬────────────────────────────────┘    │
│                        │                                       │
└────────────────────────┼───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│                    dbt Transformation Layer                     │
│                                                                 │
│  Staging → Intermediate → Mart                                 │
│                                                                 │
│  Output:                                                        │
│  - fct_daily_agent_usage                                       │
│  - fct_git_commits                                             │
│  - fct_agent_costs                                             │
│  - dim_developers, dim_agents                                  │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                   Visualization Layer                         │
│                                                                │
│  ┌────────────┐         ┌────────────┐                       │
│  │ Metabase   │   OR    │  Grafana   │                       │
│  │ Dashboards │         │ Dashboards │                       │
│  └────────────┘         └────────────┘                       │
│                                                                │
│  5 Core Views: ROI, Agent Comparison, Team Activity,          │
│                Git Integration, Cost Tracking                 │
└────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Agent Analytics CLI

**Purpose:** Developer-installed tool that collects agent telemetry and git metadata.

**Technology:**
- Node.js / TypeScript
- Distributed as npm package: `@agent-analytics/cli`

**Key Functions:**

#### 1.1 Installation & Configuration
```bash
# Global installation
npm install -g @agent-analytics/cli

# Project initialization
agent-analytics init

# What it does:
# 1. Creates ~/.agent-analytics/config.yaml
# 2. Prompts for API key (backend auth)
# 3. Asks which agents to track (Claude Code, Copilot, etc.)
# 4. Configures OpenTelemetry exports
# 5. Installs git hooks (post-commit)
```

**Config File Structure:**
```yaml
# ~/.agent-analytics/config.yaml
api_key: "aa_prod_..."
backend_url: "https://api.agent-analytics.io"
enabled_agents:
  - claude_code
  - github_copilot
  - cursor
developer_id: "dev_abc123"
project_id: "proj_xyz789"
telemetry:
  export_interval: 60  # seconds
  include_prompts: false  # privacy setting
git:
  track_commits: true
  correlation_window: 300  # seconds (5 min)
```

#### 1.2 OpenTelemetry Configuration (for Claude Code)

The CLI automatically sets environment variables when developer runs agents:

```javascript
// CLI injects these env vars into shell profile (.zshrc / .bashrc)

export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.agent-analytics.io:4317
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=<user-api-key>,x-developer-id=<dev-id>"
export OTEL_METRIC_EXPORT_INTERVAL=60000
export OTEL_LOGS_EXPORT_INTERVAL=5000
```

#### 1.3 Git Hooks

**Post-Commit Hook** (installed in `.git/hooks/post-commit`):

```bash
#!/bin/bash
# .git/hooks/post-commit

# Capture commit metadata
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_EMAIL=$(git log -1 --pretty=%ae)
COMMIT_TIMESTAMP=$(git log -1 --pretty=%ct)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l)
LINES_ADDED=$(git diff HEAD~1 HEAD --numstat | awk '{add+=$1} END {print add}')
LINES_DELETED=$(git diff HEAD~1 HEAD --numstat | awk '{del+=$2} END {print del}')

# Send to Agent Analytics API
agent-analytics log-commit \
  --hash "$COMMIT_HASH" \
  --message "$COMMIT_MSG" \
  --author "$COMMIT_AUTHOR" \
  --email "$COMMIT_EMAIL" \
  --timestamp "$COMMIT_TIMESTAMP" \
  --files-changed "$FILES_CHANGED" \
  --lines-added "$LINES_ADDED" \
  --lines-deleted "$LINES_DELETED"
```

**What the CLI does:**
```javascript
// agent-analytics log-commit implementation (simplified)

async function logCommit(commitData) {
  // Check if there was an agent session in the last 5 minutes
  const recentSession = await checkRecentSession();
  
  const payload = {
    commit_hash: commitData.hash,
    commit_message: commitData.message,
    author_name: commitData.author,
    author_email: commitData.email,
    timestamp: commitData.timestamp,
    files_changed: commitData.filesChanged,
    lines_added: commitData.linesAdded,
    lines_deleted: commitData.linesDeleted,
    // Flag if this commit likely came from agent session
    agent_assisted: recentSession !== null,
    agent_session_id: recentSession?.session_id || null,
    agent_type: recentSession?.agent_type || null
  };
  
  // POST to backend
  await fetch('https://api.agent-analytics.io/v1/commits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
```

#### 1.4 Copilot Metrics Collection

**Challenge:** GitHub Copilot metrics are only available via their API, not via local telemetry.

**Solution:** CLI periodically fetches Copilot metrics and forwards to backend.

```javascript
// Runs daily via cron or user command: agent-analytics sync-copilot

async function syncCopilotMetrics() {
  const githubToken = config.github_token;
  const orgName = config.github_org;
  
  // Call GitHub Copilot Metrics API
  const response = await fetch(
    `https://api.github.com/orgs/${orgName}/copilot/usage`,
    {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json'
      }
    }
  );
  
  const metrics = await response.json();
  
  // Transform and send to backend
  await sendToBackend('/v1/copilot-metrics', metrics);
}
```

### 2. Backend Services

#### 2.1 DuckDB Database

**Purpose:** Embedded analytics database for storing raw telemetry and commit data.

**Technology:**
- DuckDB (embedded, in-process SQL OLAP database)
- Single file database: `backend/data/agent_analytics.duckdb`
- No separate database server required

**Benefits:**
- **Faster analytics:** Optimized for analytical queries (OLAP workloads)
- **Simpler setup:** No separate database container or server
- **Single file:** Easy backups (just copy the `.duckdb` file)
- **Future-ready:** Can sync to MotherDuck for cloud deployment

**Connection:**
- Database file path: `backend/data/agent_analytics.duckdb`
- Connection string: `duckdb://backend/data/agent_analytics.duckdb`
- The API service manages the DuckDB connection directly

**Environment Variables:**
- `DATA_DIR`: Directory where DuckDB file is stored (default: `/app/data`)
- No `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` needed (embedded database)

#### 2.2 OpenTelemetry Collector

**Purpose:** Receives agent telemetry from Claude Code (and other OTel-compatible agents).

**Technology:** 
- Official OpenTelemetry Collector (Docker container)
- Config: `otel-collector-config.yaml`

**Configuration:**
```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 100
  
  # Add developer_id from headers to all spans/metrics
  attributes:
    actions:
      - key: developer_id
        from_context: x-developer-id
        action: insert

exporters:
  otlphttp:
    endpoint: http://api:3000/v1/otel
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [otlphttp]
```

**Database Schema (Raw OTel Tables):**

The API service receives OTel data and writes to DuckDB. Schema:

```sql
CREATE TABLE raw_otel_metrics (
    id BIGINT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    metric_name VARCHAR(255),
    metric_value DOUBLE PRECISION,
    attributes JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raw_otel_logs (
    id BIGINT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    severity VARCHAR(50),
    body TEXT,
    attributes JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_metrics_developer_timestamp 
ON raw_otel_metrics(developer_id, timestamp DESC);

CREATE INDEX idx_logs_developer_timestamp 
ON raw_otel_logs(developer_id, timestamp DESC);
```

#### 2.3 Ingestion API

**Purpose:** REST API for CLI to send commit data and Copilot metrics.

**Technology:**
- Node.js + Express (or FastAPI in Python)
- JWT authentication (API keys)

**Endpoints:**

```typescript
// POST /v1/commits
interface CommitPayload {
  commit_hash: string;
  commit_message: string;
  author_name: string;
  author_email: string;
  timestamp: number; // Unix timestamp
  files_changed: number;
  lines_added: number;
  lines_deleted: number;
  agent_assisted?: boolean;
  agent_session_id?: string;
  agent_type?: 'claude_code' | 'copilot' | 'cursor';
}

// POST /v1/copilot-metrics
interface CopilotMetricsPayload {
  day: string; // YYYY-MM-DD
  total_suggestions: number;
  total_acceptances: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
  total_active_users: number;
  language_breakdown: {
    language: string;
    suggestions: number;
    acceptances: number;
  }[];
}
```

**Database Schema (Raw Data Tables):**

DuckDB schema (note: DuckDB uses different syntax than PostgreSQL):

```sql
CREATE TABLE raw_git_commits (
    id BIGINT PRIMARY KEY,
    commit_hash VARCHAR(40) UNIQUE NOT NULL,
    commit_message TEXT,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    commit_timestamp TIMESTAMPTZ NOT NULL,
    files_changed INTEGER,
    lines_added INTEGER,
    lines_deleted INTEGER,
    agent_assisted BOOLEAN DEFAULT FALSE,
    agent_session_id VARCHAR(255),
    agent_type VARCHAR(50),
    developer_id VARCHAR(255),
    project_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raw_copilot_metrics (
    id BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    developer_id VARCHAR(255),
    total_suggestions INTEGER,
    total_acceptances INTEGER,
    total_lines_suggested INTEGER,
    total_lines_accepted INTEGER,
    total_active_users INTEGER,
    language_breakdown JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, developer_id)
);
```

### 3. dbt Transformation Layer

**Purpose:** Transform raw telemetry and commit data into analytics-ready tables.

**Project Structure:**
```
dbt_project/
├── dbt_project.yml
├── profiles.yml
├── models/
│   ├── staging/
│   │   ├── _staging.yml
│   │   ├── stg_agent_sessions.sql
│   │   ├── stg_agent_token_usage.sql
│   │   ├── stg_git_commits.sql
│   │   └── stg_copilot_metrics.sql
│   ├── intermediate/
│   │   ├── _intermediate.yml
│   │   ├── int_sessions_with_costs.sql
│   │   ├── int_commits_with_agent_context.sql
│   │   └── int_agent_daily_aggregates.sql
│   └── marts/
│       ├── _marts.yml
│       ├── fct_daily_agent_usage.sql
│       ├── fct_git_commits.sql
│       ├── fct_agent_costs.sql
│       ├── dim_developers.sql
│       └── dim_agents.sql
└── tests/
    └── assert_cost_calculations.sql
```

**Key dbt Models:**

See companion document `DBT_MODELS.md` for full SQL implementations.

**Model DAG (Lineage):**

```
raw_otel_metrics ──┐
raw_otel_logs ─────┤
                   ├──> stg_agent_sessions ──┐
                   │                          │
                   └──> stg_agent_token_usage ┘
                                                │
                                                ├──> int_sessions_with_costs ──┐
                                                │                               │
raw_git_commits ──────> stg_git_commits ────────────> int_commits_with_agent_context
                                                │                               │
                                                └──> int_agent_daily_aggregates │
                                                                                │
                                                                                ├──> fct_daily_agent_usage
                                                                                ├──> fct_git_commits
                                                                                ├──> fct_agent_costs
                                                                                │
                                                                                └──> Dashboard Queries
```

### 4. Dashboard Layer

**Technology Options:**

#### Option A: Metabase (Recommended for MVP)
**Pros:**
- Quick setup (Docker container)
- Great UX, non-technical users can explore data
- Built-in sharing and embedding
- No code required for basic dashboards
- Supports DuckDB via JDBC driver

**Setup:**
```bash
docker run -d -p 3001:3000 \
  -e "MB_DB_TYPE=sqlite" \
  -e "MB_DB_FILE=/metabase-data/metabase.db" \
  --name metabase \
  metabase/metabase
```

**Note:** Metabase uses SQLite for its own metadata. To connect to DuckDB data, configure a DuckDB connection in Metabase UI pointing to `backend/data/agent_analytics.duckdb`.

#### Option B: Grafana
**Pros:**
- Highly customizable
- Powerful templating and variables
- Better for technical users

**Setup:**
```bash
docker run -d -p 3000:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  --name grafana \
  grafana/grafana
```

**Dashboard Queries:**

See companion document `DASHBOARD_SPEC.md` for dashboard layouts and SQL queries.

## Data Flow Details

### Agent Session Lifecycle

```
1. Developer runs: claude
   
2. Claude Code starts, reads OTel config from env vars
   
3. Claude Code emits telemetry via gRPC to OTel Collector
   - Metrics: token counts, session duration
   - Logs: tool calls, prompts (optional), errors
   
4. OTel Collector receives data, adds developer_id from headers
   
5. OTel Collector forwards to API, which writes to DuckDB:
   - raw_otel_metrics
   - raw_otel_logs
   
6. dbt runs (scheduled every 5 mins):
   - Transforms raw OTel data into stg_agent_sessions
   - Calculates costs in int_sessions_with_costs
   - Aggregates to fct_daily_agent_usage
   
7. Dashboard queries fct_daily_agent_usage for real-time view
```

### Git Commit Correlation

```
1. Developer commits code (may or may not be agent-assisted)
   
2. Git post-commit hook fires
   
3. Hook calls: agent-analytics log-commit
   
4. CLI checks: was there an agent session in last 5 minutes?
   - YES: Flag commit as agent_assisted=true, link session_id
   - NO: Flag commit as agent_assisted=false
   
5. CLI POSTs commit metadata to API /v1/commits
   
6. API writes to DuckDB raw_git_commits table
   
7. dbt runs:
   - int_commits_with_agent_context enriches with agent info
   - fct_git_commits ready for dashboard
   
8. Dashboard shows: X% of commits were agent-assisted
```

## Scaling Considerations

### For MVP (1-50 users)
- **DuckDB** embedded in API service (single file)
- **OTel Collector** on same instance
- **dbt** runs every 5 minutes via cron
- **Metabase** on same instance
- **Total cost:** ~$20-50/month (DigitalOcean droplet or AWS EC2 t3.small)

### For Growth (50-500 users)
- **DuckDB** → MotherDuck (cloud-hosted DuckDB) for multi-instance access
- **OTel Collector** → Auto-scaling container (ECS/Fargate)
- **dbt** → Airflow for orchestration
- **Metabase/Grafana** → Separate instance with caching
- **Total cost:** ~$500-1000/month

### For Scale (500+ users)
- **DuckDB** → MotherDuck or migrate to Amazon Redshift/Snowflake
- **OTel Collector** → Kubernetes with horizontal autoscaling
- **dbt** → dbt Cloud with scheduled runs
- **Dashboard** → Embedded in SaaS app, not standalone
- **Total cost:** Depends on data volume, likely $2-5K/month

## Security & Privacy

### Data Privacy
- **No user prompts stored by default** (optional opt-in)
- **No code snippets stored**
- **Only metadata:** session IDs, token counts, timestamps
- **Commit messages** stored but can be hashed for privacy

### Authentication
- **API Keys:** JWT-based, scoped to developer/organization
- **Rate Limiting:** 100 req/min per API key
- **HTTPS Only:** All traffic encrypted in transit

### Data Retention
- **Raw telemetry:** 90 days
- **Aggregated metrics:** 2 years
- **Personally identifiable info (emails):** hashed after 30 days

## Monitoring & Observability

**For the platform itself (meta-observability):**

- **Application Logs:** Structured JSON logs to CloudWatch/Datadog
- **Database Monitoring:** DuckDB query performance metrics
- **OTel Collector Health:** Metrics on ingestion rate, error rate
- **dbt Job Monitoring:** Success/failure alerts, run duration
- **API Uptime:** Pingdom or UptimeRobot checks every 1 min

**Key Metrics to Track:**
- Telemetry ingestion rate (events/sec)
- dbt run duration (should be <2 min)
- API response times (P50, P95, P99)
- Dashboard query performance (should be <3 sec)
- DuckDB file size and query performance

## Disaster Recovery

- **DuckDB backups:** Daily automated file backups (retain 30 days)
  - Simply copy `backend/data/agent_analytics.duckdb` to backup location
  - Can use `COPY` command to export to Parquet for long-term storage
- **dbt models:** Version controlled in Git (can rebuild from raw data)
- **Config files:** Backed up to S3
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 24 hours (daily backups)

---

## Next Steps

See companion documents:
- `CLI_DESIGN.md` - Detailed CLI implementation
- `DBT_MODELS.md` - Full dbt model SQL
- `DASHBOARD_SPEC.md` - Dashboard layouts and queries
- `SETUP_GUIDE.md` - Local dev environment setup
