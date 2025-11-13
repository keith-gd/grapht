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

