-- models/marts/fct_agent_costs.sql

WITH daily_costs AS (
    SELECT
        date,
        developer_id,
        agent_type,
        total_cost_usd
    FROM {{ ref('fct_daily_agent_usage') }}
)

SELECT
    date,
    developer_id,
    agent_type,
    
    -- Daily cost
    total_cost_usd AS daily_cost_usd,
    
    -- Running total (cumulative cost)
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cost_usd,
    
    -- Week-to-date cost
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type, DATE_TRUNC('week', date)
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS wtd_cost_usd,
    
    -- Month-to-date cost
    SUM(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type, DATE_TRUNC('month', date)
        ORDER BY date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS mtd_cost_usd,
    
    -- 7-day rolling average
    AVG(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS avg_7day_cost_usd,
    
    -- 30-day rolling average
    AVG(total_cost_usd) OVER (
        PARTITION BY developer_id, agent_type
        ORDER BY date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS avg_30day_cost_usd

FROM daily_costs

