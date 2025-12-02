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

// ============================================
// Archive Wall Endpoints (Personal Data Stories)
// ============================================

/**
 * GET /api/analytics/archive/first-session
 * "Your First Session" - Personal hook for Archive Wall
 */
router.get('/archive/first-session', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        session_id,
        session_start,
        session_end,
        agent_type,
        model_name,
        total_cost,
        input_tokens,
        output_tokens,
        (input_tokens + output_tokens) as total_tokens,
        EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0 as duration_minutes
      FROM raw.agent_sessions
      WHERE session_start IS NOT NULL
      ORDER BY session_start ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ found: false, message: 'No sessions yet' });
    }

    const session = result.rows[0];
    const dateStr = new Date(session.session_start).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    res.json({
      found: true,
      session,
      story: {
        headline: 'Your First Session',
        subhead: 'It all started on ' + dateStr,
        insight: 'You used ' + (session.agent_type || 'an agent') + ' and spent $' + (session.total_cost || 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching first session:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/archive/most-expensive-day
 * Pattern revelation - which day cost the most?
 */
router.get('/archive/most-expensive-day', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        CAST(session_start AS DATE) as date,
        COUNT(*) as session_count,
        SUM(total_cost) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens,
        array_agg(DISTINCT agent_type) as agents_used
      FROM raw.agent_sessions
      WHERE session_start IS NOT NULL
      GROUP BY CAST(session_start AS DATE)
      ORDER BY total_cost DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ found: false, message: 'No session data yet' });
    }

    const day = result.rows[0];
    res.json({
      found: true,
      day,
      story: {
        headline: 'Your Most Expensive Day',
        subhead: new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        insight: 'You ran ' + day.session_count + ' sessions costing $' + (day.total_cost || 0).toFixed(2) + ' total',
        tokens: day.total_tokens,
        agents: day.agents_used
      }
    });
  } catch (error) {
    console.error('Error fetching most expensive day:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/archive/favorite-agent
 * Behavioral insight - which agent do you use most?
 */
router.get('/archive/favorite-agent', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        agent_type,
        COUNT(*) as session_count,
        SUM(total_cost) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0) as avg_duration_minutes,
        MIN(session_start) as first_used,
        MAX(session_start) as last_used
      FROM raw.agent_sessions
      WHERE agent_type IS NOT NULL
      GROUP BY agent_type
      ORDER BY session_count DESC
    `);

    if (result.rows.length === 0) {
      return res.json({ found: false, message: 'No agent data yet' });
    }

    const favorite = result.rows[0];
    const allAgents = result.rows;
    const totalSessions = allAgents.reduce((sum, a) => sum + parseInt(a.session_count), 0);
    const percentage = ((favorite.session_count / totalSessions) * 100).toFixed(0);

    res.json({
      found: true,
      favorite,
      allAgents,
      story: {
        headline: 'Your Favorite Agent',
        subhead: favorite.agent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        insight: percentage + '% of your sessions (' + favorite.session_count + ' total)',
        breakdown: allAgents.map(a => ({
          agent: a.agent_type,
          count: parseInt(a.session_count),
          percentage: ((a.session_count / totalSessions) * 100).toFixed(1)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching favorite agent:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/archive/biggest-win
 * Commit with the most impact (lines added)
 */
router.get('/archive/biggest-win', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.commit_hash,
        c.commit_message,
        c.commit_timestamp,
        c.files_changed,
        c.lines_added,
        c.lines_deleted,
        c.repository,
        c.author_name,
        s.agent_type,
        s.total_cost as session_cost,
        s.session_id
      FROM raw.git_commits c
      LEFT JOIN raw.agent_sessions s ON c.agent_session_id = s.session_id
      WHERE c.lines_added > 0
      ORDER BY c.lines_added DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ found: false, message: 'No commits with code additions yet' });
    }

    const commit = result.rows[0];
    const netLines = (commit.lines_added || 0) - (commit.lines_deleted || 0);

    res.json({
      found: true,
      commit,
      story: {
        headline: 'Your Biggest Win',
        subhead: '+' + commit.lines_added + ' lines in one commit',
        insight: commit.commit_message || 'No commit message',
        details: {
          repository: commit.repository,
          filesChanged: commit.files_changed,
          netLines,
          agent: commit.agent_type,
          date: commit.commit_timestamp
        }
      }
    });
  } catch (error) {
    console.error('Error fetching biggest win:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/archive/summary
 * All Archive Wall data in one call (for efficiency)
 */
router.get('/archive/summary', authenticate, async (req, res, next) => {
  try {
    // Run all queries in parallel
    const [firstSession, expensiveDay, favoriteAgent, biggestWin, totals] = await Promise.all([
      pool.query(`
        SELECT session_id, session_start, agent_type, total_cost
        FROM raw.agent_sessions
        WHERE session_start IS NOT NULL
        ORDER BY session_start ASC LIMIT 1
      `),
      pool.query(`
        SELECT CAST(session_start AS DATE) as date, COUNT(*) as sessions, SUM(total_cost) as cost
        FROM raw.agent_sessions WHERE session_start IS NOT NULL
        GROUP BY CAST(session_start AS DATE) ORDER BY cost DESC LIMIT 1
      `),
      pool.query(`
        SELECT agent_type, COUNT(*) as count
        FROM raw.agent_sessions WHERE agent_type IS NOT NULL
        GROUP BY agent_type ORDER BY count DESC LIMIT 1
      `),
      pool.query(`
        SELECT commit_hash, lines_added, commit_message, commit_timestamp
        FROM raw.git_commits WHERE lines_added > 0
        ORDER BY lines_added DESC LIMIT 1
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_sessions,
          SUM(total_cost) as total_cost,
          SUM(input_tokens + output_tokens) as total_tokens
        FROM raw.agent_sessions
      `)
    ]);

    res.json({
      firstSession: firstSession.rows[0] || null,
      mostExpensiveDay: expensiveDay.rows[0] || null,
      favoriteAgent: favoriteAgent.rows[0] || null,
      biggestWin: biggestWin.rows[0] || null,
      totals: totals.rows[0] || { total_sessions: 0, total_cost: 0, total_tokens: 0 }
    });
  } catch (error) {
    console.error('Error fetching archive summary:', error);
    next(error);
  }
});

module.exports = router;

