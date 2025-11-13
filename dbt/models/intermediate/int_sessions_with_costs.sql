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

