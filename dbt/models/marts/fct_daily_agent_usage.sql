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

