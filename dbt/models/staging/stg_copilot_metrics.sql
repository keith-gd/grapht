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

