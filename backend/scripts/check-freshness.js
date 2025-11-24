const duckdb = require('duckdb');
const path = require('path');
require('dotenv').config();

// Determine database path
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

console.log(`🔌 Connecting to database: ${dbPath}`);

// Initialize DuckDB connection with explicit path and read_only=false
const db = new duckdb.Database(dbPath);
// Just use the database object directly if connection object fails, or ensure connection is ready
const connection = db.connect();

function query(sql) {
  return new Promise((resolve, reject) => {
    // Retry logic for connection issues
    const execute = (retries = 3) => {
      connection.all(sql, (err, result) => {
        if (err) {
          if (retries > 0 && (err.message.includes('Connection') || err.message.includes('closed'))) {
            console.log('   Retrying connection...');
            setTimeout(() => execute(retries - 1), 500);
          } else {
            reject(err);
          }
        } else {
          resolve(result || []);
        }
      });
    };
    execute();
  });
}

async function checkFreshness() {
  try {
    console.log('🔍 Checking data freshness...');
    
    const sessions = await query('SELECT MAX(session_start) as last_session FROM raw.agent_sessions');
    const commits = await query('SELECT MAX(commit_timestamp) as last_commit FROM raw.git_commits');
    
    console.log('--------------------------------------------------');
    console.log(`Last Agent Session: ${sessions[0].last_session}`);
    console.log(`Last Git Commit:    ${commits[0].last_commit}`);
    console.log('--------------------------------------------------');
    
    if (!sessions[0].last_session) {
      console.log('⚠️  No session data found.');
    } else {
      const lastDate = new Date(sessions[0].last_session);
      const now = new Date();
      const diffHours = (now - lastDate) / (1000 * 60 * 60);
      console.log(`Session lag: ${diffHours.toFixed(1)} hours`);
    }

  } catch (err) {
    console.error('❌ Error checking freshness:', err.message);
  } finally {
    connection.close();
    db.close();
  }
}

checkFreshness();

