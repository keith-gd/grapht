const express = require('express');
const router = express.Router();
const pool = require('../db/duckdb');
const authenticate = require('../middleware/auth');

/**
 * POST /v1/agent-sessions
 * Log a manual agent session
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      session_id,
      developer_id,
      agent_type,
      model_name,
      session_start,
      session_end,
      input_tokens = 0,
      output_tokens = 0,
      cache_creation_tokens = 0,
      cache_read_tokens = 0,
      total_cost = null,
      metadata = {}
    } = req.body;

    // Validation
    if (!session_id || !developer_id || !agent_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id, developer_id, agent_type'
      });
    }

    // Insert into DuckDB
    await pool.query(`
      INSERT INTO raw.agent_sessions (
        session_id,
        developer_id,
        agent_type,
        model_name,
        session_start,
        session_end,
        input_tokens,
        output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
        total_cost,
        metadata,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      session_id,
      developer_id,
      agent_type,
      model_name,
      session_start,
      session_end,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens,
      total_cost,
      JSON.stringify(metadata)
    ]);

    console.log(`✅ Agent session logged: ${session_id} (${agent_type})`);

    res.status(201).json({
      success: true,
      message: 'Agent session logged successfully',
      session_id
    });

  } catch (error) {
    console.error('Error logging agent session:', error);
    next(error);
  }
});

/**
 * GET /v1/agent-sessions
 * Get recent agent sessions
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const developerId = req.query.developer_id;

    let query = 'SELECT * FROM raw.agent_sessions';
    const params = [];

    if (developerId) {
      query += ' WHERE developer_id = ?';
      params.push(developerId);
    }

    query += ' ORDER BY session_start DESC LIMIT ?';
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      sessions: result.rows
    });

  } catch (error) {
    console.error('Error fetching agent sessions:', error);
    next(error);
  }
});

module.exports = router;
