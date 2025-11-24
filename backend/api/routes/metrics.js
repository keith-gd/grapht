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

/**
 * GET /api/metrics/timeline
 * Get session timeline data for rhythm chart
 */
router.get('/timeline', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const result = await pool.query(`
      SELECT 
        session_id,
        session_start,
        session_end,
        agent_type,
        model_name,
        input_tokens,
        output_tokens,
        (input_tokens + output_tokens) as total_tokens,
        total_cost,
        EXTRACT(EPOCH FROM (session_end - session_start)) as duration_seconds,
        CASE 
          WHEN (input_tokens + output_tokens) > 0 THEN total_cost / (input_tokens + output_tokens)
          ELSE 0 
        END as cost_efficiency
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '${days}' day
      ORDER BY session_start ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    next(error);
  }
});

/**
 * GET /api/metrics/scatter
 * Get cost variance scatter plot data
 */
router.get('/scatter', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const result = await pool.query(`
      SELECT 
        session_id,
        agent_type,
        model_name,
        total_cost,
        EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0 as duration_minutes,
        (input_tokens + output_tokens) as total_tokens,
        session_start
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '${days}' day
      AND total_cost > 0
      ORDER BY duration_minutes ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scatter data:', error);
    next(error);
  }
});

/**
 * GET /api/metrics/flow
 * Get session to commit flow data
 */
router.get('/flow', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Sessions summary
    const sessionsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(total_cost) as total_spend
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '${days}' day
    `);
    
    // Sessions with commits
    const commitSessionsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.session_id) as sessions_with_commits,
        COUNT(DISTINCT c.commit_hash) as total_commits,
        SUM(c.files_changed) as total_files,
        SUM(c.lines_added) as total_lines_added
      FROM raw.agent_sessions s
      JOIN raw.git_commits c ON s.session_id = c.agent_session_id
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '${days}' day
    `);

    const totalSessions = parseInt(sessionsResult.rows[0].total_sessions) || 0;
    const sessionsWithCommits = parseInt(commitSessionsResult.rows[0].sessions_with_commits) || 0;
    
    const flowData = {
      total_sessions: totalSessions,
      sessions_with_commits: sessionsWithCommits,
      sessions_without_commits: totalSessions - sessionsWithCommits,
      total_commits: parseInt(commitSessionsResult.rows[0].total_commits) || 0,
      files_changed: parseInt(commitSessionsResult.rows[0].total_files) || 0,
      lines_added: parseInt(commitSessionsResult.rows[0].total_lines_added) || 0,
      total_spend: parseFloat(sessionsResult.rows[0].total_spend) || 0
    };

    // Calculate spend for no-commit sessions
    const wasteResult = await pool.query(`
      SELECT SUM(s.total_cost) as wasted_spend
      FROM raw.agent_sessions s
      LEFT JOIN raw.git_commits c ON s.session_id = c.agent_session_id
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '${days}' day
      AND c.commit_hash IS NULL
    `);
    
    flowData.wasted_spend = parseFloat(wasteResult.rows[0].wasted_spend) || 0;

    res.json(flowData);
  } catch (error) {
    console.error('Error fetching flow data:', error);
    next(error);
  }
});

module.exports = router;
