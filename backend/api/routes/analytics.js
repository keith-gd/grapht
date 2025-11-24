const express = require('express');
const router = express.Router();
const pool = require('../db/duckdb');
const authenticate = require('../middleware/auth');

/**
 * GET /api/analytics/tempo
 * Data for Session Tempo / Rhythm Visualization
 * Returns sessions with start, end, cost, and tokens for the last 30 days.
 */
router.get('/tempo', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        session_id,
        session_start,
        session_end,
        total_cost,
        input_tokens,
        output_tokens,
        agent_type,
        (input_tokens + output_tokens) as total_tokens
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '30' DAY
      ORDER BY session_start ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tempo data:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/variance
 * Data for Cost Variance Explorer
 * Returns detailed session data for scatter plot.
 */
router.get('/variance', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        session_id,
        session_start,
        session_end,
        EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0 as duration_minutes,
        total_cost,
        model_name,
        agent_type,
        input_tokens,
        output_tokens,
        (input_tokens + output_tokens) as total_tokens
      FROM raw.agent_sessions
      WHERE session_start >= CURRENT_DATE - INTERVAL '30' DAY
      AND session_end IS NOT NULL
      ORDER BY total_cost DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching variance data:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/flow
 * Data for Session -> Commit Flow
 * Joins sessions with commits to see outcome.
 */
router.get('/flow', authenticate, async (req, res, next) => {
  try {
    // DuckDB simplified query
    const result = await pool.query(`
      WITH session_commits AS (
        SELECT 
          agent_session_id,
          COUNT(*) as commit_count,
          SUM(files_changed) as files_changed,
          SUM(lines_added) as lines_added,
          SUM(lines_deleted) as lines_deleted
        FROM raw.git_commits
        WHERE agent_session_id IS NOT NULL
        GROUP BY agent_session_id
      )
      SELECT 
        s.session_id,
        s.total_cost,
        s.agent_type,
        COALESCE(sc.commit_count, 0) as commit_count,
        COALESCE(sc.files_changed, 0) as files_changed,
        COALESCE(sc.lines_added, 0) as lines_added
      FROM raw.agent_sessions s
      LEFT JOIN session_commits sc ON s.session_id = sc.agent_session_id
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '30' DAY
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching flow data:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/spans
 * Get granular span metrics
 */
router.get('/spans', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await pool.query(`
      SELECT * FROM raw.llm_spans 
      ORDER BY start_time DESC 
      LIMIT ?
    `, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching spans:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/tokens/distribution
 * Token usage distribution
 */
router.get('/tokens/distribution', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        floor(total_tokens / 100) * 100 as token_bin,
        COUNT(*) as count
      FROM raw.llm_spans
      GROUP BY 1
      ORDER BY 1
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching token distribution:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/latency/percentiles
 * Latency percentiles
 */
router.get('/latency/percentiles', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
      FROM raw.llm_spans
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching latency percentiles:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/tools/usage
 * Tool usage statistics
 */
router.get('/tools/usage', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        tool_name,
        COUNT(*) as usage_count,
        AVG(duration_ms) as avg_duration,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM raw.tool_spans
      GROUP BY tool_name
      ORDER BY usage_count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tool usage:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/cost/breakdown
 * Cost breakdown by model
 */
router.get('/cost/breakdown', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        model_name,
        SUM(total_cost_usd) as total_cost,
        COUNT(*) as call_count
      FROM raw.llm_spans
      GROUP BY model_name
      ORDER BY total_cost DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/timeseries/cost
 * Cumulative cost over time
 */
router.get('/timeseries/cost', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await pool.query(`
      SELECT 
        date_trunc('day', start_time) as time,
        SUM(total_cost_usd) as daily_cost,
        SUM(SUM(total_cost_usd)) OVER (ORDER BY date_trunc('day', start_time)) as cumulative_cost
      FROM raw.llm_spans
      WHERE start_time >= CURRENT_DATE - INTERVAL '${days}' DAY
      GROUP BY 1
      ORDER BY 1
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cost timeseries:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/timeseries/latency
 * Latency trends over time
 */
router.get('/timeseries/latency', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await pool.query(`
      SELECT 
        date_trunc('day', start_time) as time,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99,
        COUNT(*) as count
      FROM raw.llm_spans
      WHERE start_time >= CURRENT_DATE - INTERVAL '${days}' DAY
      GROUP BY 1
      ORDER BY 1
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching latency timeseries:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/tools/chains
 * Common tool execution sequences (Trace Level)
 */
router.get('/tools/chains', authenticate, async (req, res, next) => {
  try {
    // Group tool calls by trace_id and order by start_time to form chains
    const result = await pool.query(`
      WITH chains AS (
        SELECT 
          trace_id,
          LIST(tool_name ORDER BY start_time ASC) as tool_chain
        FROM raw.tool_spans
        GROUP BY trace_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        tool_chain,
        COUNT(*) as count
      FROM chains
      GROUP BY tool_chain
      ORDER BY count DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tool chains:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/traces/:trace_id
 * Full trace waterfall data
 */
router.get('/traces/:trace_id', authenticate, async (req, res, next) => {
  try {
    const { trace_id } = req.params;
    
    // Fetch LLM spans
    const llmSpans = await pool.query(`
      SELECT 
        span_id, parent_span_id, trace_id,
        'llm' as type,
        model_name as name,
        start_time, end_time, duration_ms,
        total_tokens, total_cost_usd,
        input_messages, output_messages
      FROM raw.llm_spans
      WHERE trace_id = ?
    `, [trace_id]);
    
    // Fetch Tool spans
    const toolSpans = await pool.query(`
      SELECT 
        span_id, parent_span_id, trace_id,
        'tool' as type,
        tool_name as name,
        start_time, end_time, duration_ms,
        status, tool_arguments, tool_result
      FROM raw.tool_spans
      WHERE trace_id = ?
    `, [trace_id]);
    
    const spans = [...llmSpans.rows, ...toolSpans.rows].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );
    
    res.json(spans);
  } catch (error) {
    console.error('Error fetching trace:', error);
    next(error);
  }
});

module.exports = router;

