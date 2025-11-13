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

