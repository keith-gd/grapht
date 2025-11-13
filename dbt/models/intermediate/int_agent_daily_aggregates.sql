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

