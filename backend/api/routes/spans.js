const express = require('express');
const router = express.Router();
const pool = require('../db/duckdb');
const authenticate = require('../middleware/auth');

/**
 * POST /v1/spans
 * Ingest raw span data (LLM or Tool executions)
 * 
 * Expected payload:
 * {
 *   "spans": [
 *     {
 *       "type": "llm", // or "tool"
 *       "trace_id": "...",
 *       "span_id": "...",
 *       "parent_span_id": "...",
 *       "session_id": "...", // Optional, for grouping
 *       "start_time": "ISO8601",
 *       "end_time": "ISO8601",
 *       "attributes": { ... } // Dynamic attributes based on type
 *     }
 *   ]
 * }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { spans } = req.body;
    
    if (!spans || !Array.isArray(spans)) {
      return res.status(400).json({ error: 'Invalid payload: "spans" array required' });
    }

    let llmCount = 0;
    let toolCount = 0;

    for (const span of spans) {
      const {
        type,
        trace_id,
        span_id,
        parent_span_id,
        session_id,
        start_time,
        end_time,
        attributes = {}
      } = span;

      // Validate common required fields
      if (!trace_id || !span_id || !start_time || !end_time) {
        console.warn(`Skipping invalid span: ${JSON.stringify(span)}`);
        continue;
      }

      // Calculate duration if not provided
      const start = new Date(start_time);
      const end = new Date(end_time);
      const duration_ms = (end - start);

      if (type === 'llm') {
        await pool.query(`
          INSERT INTO raw.llm_spans (
            span_id, trace_id, parent_span_id, session_id,
            start_time, end_time, duration_ms,
            model_name, provider,
            prompt_tokens, completion_tokens, total_tokens,
            cache_read_tokens, cache_write_tokens,
            prompt_cost_usd, completion_cost_usd, total_cost_usd,
            input_messages, output_messages, invocation_params
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          span_id, trace_id, parent_span_id, session_id,
          start_time, end_time, duration_ms,
          attributes.model_name, attributes.provider || 'custom',
          attributes.prompt_tokens || 0, attributes.completion_tokens || 0, attributes.total_tokens || 0,
          attributes.cache_read_tokens || 0, attributes.cache_write_tokens || 0,
          attributes.prompt_cost_usd || 0, attributes.completion_cost_usd || 0, attributes.total_cost_usd || 0,
          JSON.stringify(attributes.input_messages || {}), JSON.stringify(attributes.output_messages || {}), JSON.stringify(attributes.invocation_params || {})
        ]);
        llmCount++;

      } else if (type === 'tool') {
        await pool.query(`
          INSERT INTO raw.tool_spans (
            span_id, trace_id, parent_span_id,
            tool_name, tool_arguments, tool_result,
            start_time, end_time, duration_ms, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          span_id, trace_id, parent_span_id,
          attributes.tool_name || 'unknown',
          JSON.stringify(attributes.tool_arguments || {}),
          JSON.stringify(attributes.tool_result || {}),
          start_time, end_time, duration_ms,
          attributes.status || 'success'
        ]);
        toolCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Ingested ${llmCount} LLM spans and ${toolCount} tool spans`
    });

  } catch (error) {
    console.error('Error ingesting spans:', error);
    next(error);
  }
});

module.exports = router;

