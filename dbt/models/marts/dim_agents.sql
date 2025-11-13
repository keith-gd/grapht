-- models/marts/dim_agents.sql

SELECT
    agent_type,
    
    -- Friendly names
    CASE agent_type
        WHEN 'claude_code' THEN 'Claude Code'
        WHEN 'github_copilot' THEN 'GitHub Copilot'
        WHEN 'cursor' THEN 'Cursor'
        ELSE agent_type
    END AS agent_display_name,
    
    -- Agent metadata (can be expanded)
    CASE agent_type
        WHEN 'claude_code' THEN 'Anthropic'
        WHEN 'github_copilot' THEN 'GitHub/OpenAI'
        WHEN 'cursor' THEN 'Cursor AI'
        ELSE 'Unknown'
    END AS vendor,
    
    CASE agent_type
        WHEN 'claude_code' THEN 'Terminal'
        WHEN 'github_copilot' THEN 'IDE'
        WHEN 'cursor' THEN 'IDE'
        ELSE 'Unknown'
    END AS interface_type

FROM (
    SELECT DISTINCT agent_type
    FROM {{ ref('stg_agent_sessions') }}
) agents

