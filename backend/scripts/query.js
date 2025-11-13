#!/usr/bin/env node

/**
 * DuckDB Query CLI Tool
 * 
 * Executes ad-hoc SQL queries against DuckDB and formats results as a table.
 * Usage: node backend/scripts/query.js "SELECT COUNT(*) FROM raw.git_commits"
 */

const duckdb = require('duckdb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine database path
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found: ${dbPath}`);
  console.error('   Run init-db.js first to create the database.');
  process.exit(1);
}

// Initialize DuckDB connection
const db = new duckdb.Database(dbPath);
const connection = db.connect();

// Promisify DuckDB query execution
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.all(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result || []);
      }
    });
  });
}

/**
 * Format query results as a table using console.table
 */
function formatTable(rows) {
  if (rows.length === 0) {
    console.log('(no rows)');
    return;
  }
  
  // Use built-in console.table for nice formatting
  console.table(rows);
}

async function executeQuery(sqlQuery) {
  try {
    // Check if running in non-interactive mode (for scripts)
    const isScriptMode = process.env.QUERY_SCRIPT_MODE === '1' || !process.stdout.isTTY;
    
    if (!isScriptMode) {
      console.log(`🔍 Executing query...\n`);
      console.log(`SQL: ${sqlQuery}\n`);
    }
    
    const startTime = Date.now();
    const results = await query(sqlQuery);
    const duration = Date.now() - startTime;
    
    // For simple COUNT queries or single-value queries, output just the value
    if (isScriptMode && results.length === 1) {
      const row = results[0];
      const keys = Object.keys(row);
      if (keys.length === 1) {
        console.log(row[keys[0]]);
        // Don't return early - let finally block close connections
      } else {
        // In script mode, output JSON for easier parsing
        console.log(JSON.stringify(results));
      }
    } else if (!isScriptMode) {
      formatTable(results);
      console.log(`\n✅ Query executed successfully (${results.length} row(s), ${duration}ms)`);
    } else {
      // In script mode, output JSON for easier parsing
      console.log(JSON.stringify(results));
    }
    
  } catch (error) {
    console.error(`❌ Query failed: ${error.message}`);
    process.exit(1);
  } finally {
    connection.close();
    db.close();
  }
}

// Main
const sqlQuery = process.argv[2];

if (!sqlQuery) {
  console.error('❌ Error: SQL query is required');
  console.error('\nUsage: node backend/scripts/query.js "SELECT COUNT(*) FROM raw.git_commits"');
  process.exit(1);
}

executeQuery(sqlQuery);

