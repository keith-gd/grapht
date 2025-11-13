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

