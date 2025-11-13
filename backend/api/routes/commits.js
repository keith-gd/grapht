const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');

/**
 * POST /v1/commits
 * Ingests git commit metadata from CLI git hooks
 * 
 * Request body:
 * {
 *   commit_hash: string (required),
 *   commit_message: string,
 *   author_name: string,
 *   author_email: string,
 *   timestamp: number (Unix timestamp),
 *   files_changed: number,
 *   lines_added: number,
 *   lines_deleted: number,
 *   agent_assisted: boolean,
 *   agent_session_id: string,
 *   agent_type: string,
 *   developer_id: string,
 *   project_id: string
 * }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      commit_hash,
      commit_message,
      author_name,
      author_email,
      timestamp,
      files_changed,
      lines_added,
      lines_deleted,
      agent_assisted = false,
      agent_session_id,
      agent_type,
      developer_id,
      project_id
    } = req.body;

    // Validate required fields
    if (!commit_hash) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'commit_hash is required'
      });
    }

    if (!timestamp) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'timestamp is required'
      });
    }

    // Convert Unix timestamp to PostgreSQL timestamp
    const commitTimestamp = new Date(timestamp * 1000).toISOString();

    // Check if commit already exists (DuckDB doesn't support ON CONFLICT the same way)
    const checkQuery = `SELECT id, commit_hash, commit_timestamp FROM raw.git_commits WHERE commit_hash = ?`;
    const existing = await pool.query(checkQuery, [commit_hash]);

    if (existing.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Commit already exists',
        commit_hash
      });
    }

    // Insert commit into database
    const query = `
      INSERT INTO raw.git_commits (
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
        project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      commit_hash,
      commit_message || null,
      author_name || null,
      author_email || null,
      commitTimestamp,
      files_changed || null,
      lines_added || null,
      lines_deleted || null,
      agent_assisted,
      agent_session_id || null,
      agent_type || null,
      developer_id || null,
      project_id || null
    ];

    await pool.query(query, values);

    // Fetch the inserted row
    const result = await pool.query(checkQuery, [commit_hash]);

    console.log(`✅ Commit ingested: ${commit_hash} (${result.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: 'Commit ingested successfully',
      data: {
        id: result.rows[0].id,
        commit_hash: result.rows[0].commit_hash,
        commit_timestamp: result.rows[0].commit_timestamp
      }
    });

  } catch (error) {
    console.error('Error ingesting commit:', error);
    next(error);
  }
});

/**
 * GET /v1/commits
 * Retrieve commits (for testing/debugging)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT 
        id,
        commit_hash,
        commit_message,
        author_name,
        author_email,
        commit_timestamp,
        files_changed,
        lines_added,
        lines_deleted,
        agent_assisted,
        agent_type,
        developer_id,
        project_id,
        created_at
      FROM raw.git_commits
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching commits:', error);
    next(error);
  }
});

module.exports = router;

