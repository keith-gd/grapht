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

