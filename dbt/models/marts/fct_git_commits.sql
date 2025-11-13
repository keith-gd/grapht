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

