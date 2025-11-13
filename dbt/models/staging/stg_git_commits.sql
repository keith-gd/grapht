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

