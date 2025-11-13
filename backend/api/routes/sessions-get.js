const express = require('express');
const router = express.Router();
const pool = require('../db/duckdb');
const authenticate = require('../middleware/auth');

/**
 * GET /api/sessions/recent
 * Get recent sessions
 */
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await pool.query(`
      SELECT 
        session_id,
        developer_id,
        agent_type,
        model_name,
        session_start,
        session_end,
        input_tokens,
        output_tokens,
        total_cost,
        created_at
      FROM raw.agent_sessions
      ORDER BY session_start DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    next(error);
  }
});

module.exports = router;
