const express = require('express');
const router = express.Router();
const pool = require('../db/duckdb');
const authenticate = require('../middleware/auth');

/**
 * GET /api/metrics/summary
 * Get overall summary statistics
 */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(input_tokens + output_tokens) as total_tokens,
        SUM(
          (input_tokens * 0.003 / 1000) + 
          (output_tokens * 0.015 / 1000)
        ) as total_cost,
        AVG(
          (input_tokens * 0.003 / 1000) + 
          (output_tokens * 0.015 / 1000)
        ) as avg_cost_per_session
      FROM raw.agent_sessions
    `);

    const summary = result.rows[0] || {
      total_sessions: 0,
      total_tokens: 0,
      total_cost: 0,
      avg_cost_per_session: 0
    };

    res.json(summary);

  } catch (error) {
    console.error('Error fetching summary:', error);
    next(error);
  }
});

/**
 * GET /api/metrics/cost-over-time
 * Get cost aggregated by day
 */
router.get('/cost-over-time', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('day', session_start) as date,
        SUM(
          (input_tokens * 0.003 / 1000.0) + 
          (output_tokens * 0.015 / 1000.0)
        ) as cost
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '${days}' day
      GROUP BY DATE_TRUNC('day', session_start)
      ORDER BY date
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching cost over time:', error);
    next(error);
  }
});

/**
 * GET /api/metrics/token-breakdown
 * Get token usage by agent type
 */
router.get('/token-breakdown', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        agent_type,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(input_tokens + output_tokens) as total_tokens
      FROM raw.agent_sessions
      GROUP BY agent_type
      ORDER BY total_tokens DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching token breakdown:', error);
    next(error);
  }
});

/**
 * GET /api/metrics/agent-comparison
 * Compare agents by various metrics
 */
router.get('/agent-comparison', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        agent_type,
        COUNT(*) as total_sessions,
        AVG(input_tokens + output_tokens) as avg_tokens_per_session,
        AVG(
          (input_tokens * 0.003 / 1000) + 
          (output_tokens * 0.015 / 1000)
        ) as avg_cost_per_session,
        AVG(
          EXTRACT(EPOCH FROM (session_end - session_start)) / 3600
        ) as avg_duration_hours
      FROM raw.agent_sessions
      WHERE session_end IS NOT NULL
      GROUP BY agent_type
      ORDER BY total_sessions DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching agent comparison:', error);
    next(error);
  }
});

module.exports = router;
