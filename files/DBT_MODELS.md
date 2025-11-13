# dbt Models - Agent Analytics Platform

This document contains the SQL for all dbt models in the Agent Analytics Platform.

## Model Layers

```
Raw (DuckDB) → Staging → Intermediate → Marts → Dashboard
```

**Layer Philosophy:**
- **Staging**: Clean and standardize raw data, no business logic
- **Intermediate**: Enrichment, joins, and correlation logic
- **Marts**: Aggregated, denormalized tables optimized for dashboards

---

## Staging Layer

### stg_agent_sessions

**Purpose:** Extract agent sessions from OTel metrics, one row per session.

```sql
-- models/staging/stg_agent_sessions.sql

WITH session_events AS (
    SELECT
        timestamp,
        developer_id,
        attributes->>'session_id' AS session_id,
        attributes->>'agent_type' AS agent_type,
        attributes->>'model' AS model_name
    FROM {{ source('raw', 'otel_logs') }}
    WHERE body LIKE '%session_start%'
),

session_end_events AS (
    SELECT
        timestamp,
        attributes->>'session_id' AS session_id
    FROM {{ source('raw', 'otel_logs') }}
    WHERE body LIKE '%session_end%'
)

SELECT
    s.session_id,
    s.developer_id,
    s.agent_type,
    s.model_name,
    s.timestamp AS session_start,
    e.timestamp AS session_end,
    EXTRACT(EPOCH FROM (e.timestamp - s.timestamp)) AS duration_seconds
FROM session_events s
LEFT JOIN session_end_events e
    ON s.session_id = e.session_id
```

---

### stg_agent_token_usage

**Purpose:** Extract token usage from OTel metrics.

```sql
-- models/staging/stg_agent_token_usage.sql

WITH token_metrics AS (
    SELECT
        timestamp,
        developer_id,
        attributes->>'session_id' AS session_id,
        attributes->>'agent_type' AS agent_type,
        attributes->>'model' AS model_name,
        CASE
            WHEN metric_name = 'claude_code.tokens.input' THEN metric_value
            ELSE 0
        END AS input_tokens,
        CASE
            WHEN metric_name = 'claude_code.tokens.output' THEN metric_value
            ELSE 0
        END AS output_tokens,
        CASE
            WHEN metric_name = 'claude_code.tokens.cache_creation' THEN metric_value
            ELSE 0
        END AS cache_creation_tokens,
        CASE
            WHEN metric_name = 'claude_code.tokens.cache_read' THEN metric_value
            ELSE 0
        END AS cache_read_tokens
    FROM {{ source('raw', 'otel_metrics') }}
    WHERE metric_name IN (
        'claude_code.tokens.input',
        'claude_code.tokens.output',
        'claude_code.tokens.cache_creation',
        'claude_code.tokens.cache_read'
    )
)

SELECT
    session_id,
    developer_id,
    agent_type,
    model_name,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(cache_creation_tokens) AS total_cache_creation_tokens,
    SUM(cache_read_tokens) AS total_cache_read_tokens,
    SUM(input_tokens + output_tokens + cache_creation_tokens) AS total_tokens
FROM token_metrics
GROUP BY 1, 2, 3, 4
```

---

### stg_git_commits

**Purpose:** Clean raw git commit data.

```sql
-- models/staging/stg_git_commits.sql

SELECT
    commit_hash,
    commit_message,
    author_name,
    author_email,
    commit_timestamp,
    files_changed,
    lines_added,
    lines_deleted,
    agent_assisted,
    agent_session_id,
    agent_type,
    developer_id,
    project_id,
    created_at
FROM {{ source('raw', 'git_commits') }}
WHERE commit_timestamp > CURRENT_DATE - INTERVAL '90 days'
```

---

### stg_copilot_metrics

**Purpose:** Clean Copilot daily metrics.

```sql
-- models/staging/stg_copilot_metrics.sql

SELECT
    date,
    developer_id,
    total_suggestions,
    total_acceptances,
    total_lines_suggested,
    total_lines_accepted,
    total_active_users,
    -- Calculate acceptance rate
    CASE
        WHEN total_suggestions > 0
        THEN (total_acceptances::FLOAT / total_suggestions::FLOAT) * 100
        ELSE 0
    END AS acceptance_rate_pct,
    language_breakdown,
    created_at
FROM {{ source('raw', 'copilot_metrics') }}
WHERE date > CURRENT_DATE - INTERVAL '90 days'
```

---

## Intermediate Layer

### int_sessions_with_costs

**Purpose:** Enrich sessions with token usage and cost calculations.

```sql
-- models/intermediate/int_sessions_with_costs.sql

WITH sessions AS (
    SELECT * FROM {{ ref('stg_agent_sessions') }}
),

token_usage AS (
    SELECT * FROM {{ ref('stg_agent_token_usage') }}
),

-- Claude pricing (as of Nov 2024)
-- These should be in a seed file in production
pricing AS (
    SELECT
        'claude-sonnet-4' AS model_name,
        3.00 AS input_token_cost_per_mtok,
        15.00 AS output_token_cost_per_mtok,
        0.30 AS cache_write_cost_per_mtok,
        0.30 AS cache_read_cost_per_mtok
    UNION ALL
    SELECT
        'claude-opus-4',
        15.00,
        75.00,
        1.50,
        1.50
)

SELECT
    s.session_id,
    s.developer_id,
    s.agent_type,
    s.model_name,
    s.session_start,
    s.session_end,
    s.duration_seconds,
    
    -- Token counts
    COALESCE(t.total_input_tokens, 0) AS input_tokens,
    COALESCE(t.total_output_tokens, 0) AS output_tokens,
    COALESCE(t.total_cache_creation_tokens, 0) AS cache_creation_tokens,
    COALESCE(t.total_cache_read_tokens, 0) AS cache_read_tokens,
    COALESCE(t.total_tokens, 0) AS total_tokens,
    
    -- Cost calculations (in dollars)
    (
        (COALESCE(t.total_input_tokens, 0) / 1000000.0) * COALESCE(p.input_token_cost_per_mtok, 0) +
        (COALESCE(t.total_output_tokens, 0) / 1000000.0) * COALESCE(p.output_token_cost_per_mtok, 0) +
        (COALESCE(t.total_cache_creation_tokens, 0) / 1000000.0) * COALESCE(p.cache_write_cost_per_mtok, 0) +
        (COALESCE(t.total_cache_read_tokens, 0) / 1000000.0) * COALESCE(p.cache_read_cost_per_mtok, 0)
    ) AS session_cost_usd,
    
    -- Efficiency metrics
    CASE
        WHEN s.duration_seconds > 0
        THEN COALESCE(t.total_tokens, 0) / s.duration_seconds
        ELSE 0
    END AS tokens_per_second

FROM sessions s
LEFT JOIN token_usage t
    ON s.session_id = t.session_id
LEFT JOIN pricing p
    ON s.model_name = p.model_name
```

---

### int_commits_with_agent_context

**Purpose:** Correlate commits with agent sessions.

```sql
-- models/intermediate/int_commits_with_agent_context.sql

WITH commits AS (
    SELECT * FROM {{ ref('stg_git_commits') }}
),

sessions AS (
    SELECT * FROM {{ ref('int_sessions_with_costs') }}
)

SELECT
    c.commit_hash,
    c.commit_message,
    c.author_name,
    c.author_email,
    c.commit_timestamp,
    c.files_changed,
    c.lines_added,
    c.lines_deleted,
    c.developer_id,
    c.project_id,
    
    -- Agent context
    c.agent_assisted,
    c.agent_session_id,
    c.agent_type,
    
    -- Enrich with session data if agent-assisted
    s.model_name,
    s.input_tokens,
    s.output_tokens,
    s.total_tokens,
    s.session_cost_usd,
    s.duration_seconds AS agent_session_duration,
    
    -- Time between session end and commit
    CASE
        WHEN c.agent_assisted AND s.session_end IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c.commit_timestamp - s.session_end))
        ELSE NULL
    END AS seconds_after_session,
    
    -- Flags
    CASE
        WHEN c.agent_assisted THEN 1
        ELSE 0
    END AS is_agent_assisted,
    
    CASE
        WHEN c.lines_added + c.lines_deleted > 500 THEN 'large'
        WHEN c.lines_added + c.lines_deleted > 100 THEN 'medium'
        ELSE 'small'
    END AS commit_size

FROM commits c
LEFT JOIN sessions s
    ON c.agent_session_id = s.session_id
```

---

### int_agent_daily_aggregates

**Purpose:** Pre-aggregate daily stats for faster dashboard queries.

```sql
-- models/intermediate/int_agent_daily_aggregates.sql

WITH sessions AS (
    SELECT * FROM {{ ref('int_sessions_with_costs') }}
),

commits AS (
    SELECT * FROM {{ ref('int_commits_with_agent_context') }}
)

SELECT
    DATE(s.session_start) AS date,
    s.developer_id,
    s.agent_type,
    s.model_name,
    
    -- Session metrics
    COUNT(DISTINCT s.session_id) AS total_sessions,
    SUM(s.duration_seconds) AS total_duration_seconds,
    AVG(s.duration_seconds) AS avg_duration_seconds,
    
    -- Token metrics
    SUM(s.input_tokens) AS total_input_tokens,
    SUM(s.output_tokens) AS total_output_tokens,
    SUM(s.total_tokens) AS total_tokens,
    
    -- Cost metrics
    SUM(s.session_cost_usd) AS total_cost_usd,
    AVG(s.session_cost_usd) AS avg_cost_per_session_usd,
    
    -- Commit metrics
    COUNT(DISTINCT CASE WHEN c.is_agent_assisted = 1 THEN c.commit_hash END) AS agent_assisted_commits,
    SUM(CASE WHEN c.is_agent_assisted = 1 THEN c.lines_added ELSE 0 END) AS agent_assisted_lines_added,
    SUM(CASE WHEN c.is_agent_assisted = 1 THEN c.lines_deleted ELSE 0 END) AS agent_assisted_lines_deleted

FROM sessions s
LEFT JOIN commits c
    ON s.session_id = c.agent_session_id
    AND DATE(s.session_start) = DATE(c.commit_timestamp)

GROUP BY 1, 2, 3, 4
```

---

## Marts Layer (Analytics-Ready)

### fct_daily_agent_usage

**Purpose:** Daily usage and cost metrics per developer and agent.

```sql
-- models/marts/fct_daily_agent_usage.sql

SELECT
    date,
    developer_id,
    agent_type,
    model_name,
    
    -- Session metrics
    total_sessions,
    total_duration_seconds,
    avg_duration_seconds,
    ROUND(total_duration_seconds / 3600.0, 2) AS total_duration_hours,
    
    -- Token metrics
    total_input_tokens,
    total_output_tokens,
    total_tokens,
    
    -- Cost metrics
    ROUND(total_cost_usd, 4) AS total_cost_usd,
    ROUND(avg_cost_per_session_usd, 4) AS avg_cost_per_session_usd,
    
    -- Commit metrics
    agent_assisted_commits,
    agent_assisted_lines_added,
    agent_assisted_lines_deleted,
    
    -- Efficiency metrics
    CASE
        WHEN agent_assisted_commits > 0
        THEN ROUND(total_cost_usd / agent_assisted_commits, 4)
        ELSE NULL
    END AS cost_per_commit_usd,
    
    CASE
        WHEN agent_assisted_commits > 0
        THEN ROUND(total_tokens::FLOAT / agent_assisted_commits, 0)
        ELSE NULL
    END AS tokens_per_commit,
    
    CASE
        WHEN total_tokens > 0
        THEN ROUND((agent_assisted_lines_added::FLOAT / total_tokens) * 1000, 2)
        ELSE NULL
    END AS lines_per_1k_tokens

FROM {{ ref('int_agent_daily_aggregates') }}
```

---

### fct_git_commits

**Purpose:** All commits with agent enrichment for analysis.

```sql
-- models/marts/fct_git_commits.sql

SELECT
    commit_hash,
    commit_message,
    author_name,
    author_email,
    commit_timestamp,
    DATE(commit_timestamp) AS commit_date,
    EXTRACT(HOUR FROM commit_timestamp) AS commit_hour,
    EXTRACT(DOW FROM commit_timestamp) AS commit_day_of_week,
    
    files_changed,
    lines_added,
    lines_deleted,
    lines_added + lines_deleted AS lines_changed,
    commit_size,
    
    developer_id,
    project_id,
    
    -- Agent context
    is_agent_assisted,
    agent_type,
    model_name,
    agent_session_id,
    
    -- Token and cost (for agent-assisted commits only)
    CASE WHEN is_agent_assisted = 1 THEN total_tokens ELSE NULL END AS tokens_used,
    CASE WHEN is_agent_assisted = 1 THEN ROUND(session_cost_usd, 4) ELSE NULL END AS cost_usd,
    
    -- Timing
    CASE WHEN is_agent_assisted = 1 THEN agent_session_duration ELSE NULL END AS agent_duration_seconds,
    CASE WHEN is_agent_assisted = 1 THEN seconds_after_session ELSE NULL END AS seconds_after_session,
    
    -- Efficiency (for agent-assisted commits)
    CASE
        WHEN is_agent_assisted = 1 AND total_tokens > 0
        THEN ROUND(lines_changed::FLOAT / total_tokens * 1000, 2)
        ELSE NULL
    END AS lines_per_1k_tokens,
    
    CASE
        WHEN is_agent_assisted = 1 AND session_cost_usd > 0
        THEN ROUND(lines_changed::FLOAT / session_cost_usd, 0)
        ELSE NULL
    END AS lines_per_dollar

FROM {{ ref('int_commits_with_agent_context') }}
```

---

### fct_agent_costs

**Purpose:** Cost rollups by time period for budgeting and forecasting.

```sql
-- models/marts/fct_agent_costs.sql

WITH daily_costs AS (
    SELECT
        date,
        developer_id,
        agent_type,
        total_cost_usd
    FROM {{ ref('fct_daily_agent_usage') }}
)

SELECT
    date,
    developer_id,
    agent_type,
    
    -- Daily cost
    total_cost_usd AS daily_cost_usd,
    
    -- Running total (cumulative cost)
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cost_usd,
    
    -- Week-to-date cost
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type, DATE_TRUNC('week', date)
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS wtd_cost_usd,
    
    -- Month-to-date cost
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type, DATE_TRUNC('month', date)
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS mtd_cost_usd,
    
    -- 7-day rolling average
    AVG(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS avg_7day_cost_usd,
    
    -- 30-day rolling average
    AVG(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS avg_30day_cost_usd

FROM daily_costs
```

---

### dim_developers

**Purpose:** Developer dimension for joins and filters.

```sql
-- models/marts/dim_developers.sql

WITH unique_developers AS (
    SELECT DISTINCT
        developer_id,
        author_name,
        author_email
    FROM {{ ref('stg_git_commits') }}
)

SELECT
    developer_id,
    COALESCE(author_name, 'Unknown') AS developer_name,
    COALESCE(author_email, 'unknown@example.com') AS developer_email,
    
    -- Derived attributes (can be enriched later)
    CASE
        WHEN author_email LIKE '%@company.com' THEN 'Internal'
        ELSE 'External'
    END AS developer_type,
    
    MIN(created_at) AS first_seen_at,
    MAX(created_at) AS last_seen_at

FROM unique_developers
GROUP BY 1, 2, 3
```

---

### dim_agents

**Purpose:** Agent types dimension.

```sql
-- models/marts/dim_agents.sql

SELECT
    agent_type,
    
    -- Friendly names
    CASE agent_type
        WHEN 'claude_code' THEN 'Claude Code'
        WHEN 'github_copilot' THEN 'GitHub Copilot'
        WHEN 'cursor' THEN 'Cursor'
        ELSE agent_type
    END AS agent_display_name,
    
    -- Agent metadata (can be expanded)
    CASE agent_type
        WHEN 'claude_code' THEN 'Anthropic'
        WHEN 'github_copilot' THEN 'GitHub/OpenAI'
        WHEN 'cursor' THEN 'Cursor AI'
        ELSE 'Unknown'
    END AS vendor,
    
    CASE agent_type
        WHEN 'claude_code' THEN 'Terminal'
        WHEN 'github_copilot' THEN 'IDE'
        WHEN 'cursor' THEN 'IDE'
        ELSE 'Unknown'
    END AS interface_type

FROM (
    SELECT DISTINCT agent_type
    FROM {{ ref('stg_agent_sessions') }}
) agents
```

---

## Testing

### Example dbt Test

```yaml
# models/marts/_marts.yml

version: 2

models:
  - name: fct_daily_agent_usage
    description: "Daily agent usage and cost metrics"
    columns:
      - name: date
        description: "Date of usage"
        tests:
          - not_null
      
      - name: developer_id
        description: "Unique developer identifier"
        tests:
          - not_null
      
      - name: total_cost_usd
        description: "Total cost in USD"
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
              config:
                where: "total_cost_usd IS NOT NULL"
      
      - name: cost_per_commit_usd
        description: "Average cost per commit"
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"
              config:
                where: "cost_per_commit_usd IS NOT NULL"

  - name: fct_git_commits
    description: "All commits with agent enrichment"
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - commit_hash
            - developer_id
```

---

## Usage

### Run All Models

```bash
dbt run
```

### Run Specific Layer

```bash
dbt run --models staging.*
dbt run --models intermediate.*
dbt run --models marts.*
```

### Run Specific Model

```bash
dbt run --models fct_daily_agent_usage
```

### Run with Dependencies

```bash
dbt run --models +fct_daily_agent_usage  # Include upstream models
dbt run --models fct_daily_agent_usage+  # Include downstream models
```

### Test Models

```bash
dbt test
dbt test --models fct_daily_agent_usage
```

### Generate Documentation

```bash
dbt docs generate
dbt docs serve
```

---

## Cost Model Pricing Updates

When Claude pricing changes, update the pricing CTE in `int_sessions_with_costs.sql` or (better) create a seed file:

**seeds/claude_pricing.csv:**
```csv
model_name,input_token_cost_per_mtok,output_token_cost_per_mtok,cache_write_cost_per_mtok,cache_read_cost_per_mtok
claude-sonnet-4,3.00,15.00,0.30,0.30
claude-opus-4,15.00,75.00,1.50,1.50
```

Then load it:
```bash
dbt seed
```

And reference it in the model:
```sql
pricing AS (
    SELECT * FROM {{ ref('claude_pricing') }}
)
```

---

## Next Steps

1. Implement these models in your dbt project
2. Run `dbt run` to build the marts
3. Connect Metabase to the `mart` schema
4. Build dashboards querying these tables!

See `DASHBOARD_SPEC.md` for dashboard queries that use these models.
