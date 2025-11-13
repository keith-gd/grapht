// DuckDB connection pool (wrapper for compatibility)
const { query, run } = require('./duckdb');

// Export query function for compatibility with existing code
// DuckDB doesn't need a traditional pool, but we maintain the same interface
const pool = {
  query: query,
  run: run
};

module.exports = pool;

