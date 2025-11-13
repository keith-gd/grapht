const duckdb = require('duckdb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || '/app/data';
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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
        resolve({ rows: result || [] });
      }
    });
  });
}

// Execute a query without returning results (for DDL statements)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.run(sql, params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Initialize schema on startup
async function initializeSchema() {
  try {
    // Try multiple possible paths for the init SQL file
    const possiblePaths = [
      path.join(__dirname, '../../init_duckdb.sql'),  // From api/db/ relative to backend/
      path.join(process.cwd(), 'init_duckdb.sql'),   // From project root
      '/app/init_duckdb.sql'                          // Docker absolute path
    ];
    
    let initSqlPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        initSqlPath = possiblePath;
        break;
      }
    }
    
    if (initSqlPath) {
      console.log(`📄 Loading schema from: ${initSqlPath}`);
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      // Split by semicolon and execute each statement
      // Handle multi-line statements better
      const statements = initSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            await run(statement);
          } catch (err) {
            // Some statements might fail if they already exist, that's okay
            const errMsg = err.message.toLowerCase();
            if (!errMsg.includes('already exists') && 
                !errMsg.includes('duplicate') &&
                !errMsg.includes('does not exist')) {
              console.warn('Schema initialization warning:', err.message);
              console.warn('Statement:', statement.substring(0, 100));
            }
          }
        }
      }
      console.log('✅ DuckDB schema initialized');
    } else {
      console.warn('⚠️  init_duckdb.sql not found in any expected location, skipping schema initialization');
      console.warn('   Tried paths:', possiblePaths);
    }
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    throw error;
  }
}

// Test connection
async function testConnection() {
  try {
    const result = await query('SELECT CURRENT_TIMESTAMP as now');
    console.log('✅ DuckDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ DuckDB connection failed:', error.message);
    return false;
  }
}

// Initialize on module load
(async () => {
  await testConnection();
  await initializeSchema();
})();

module.exports = {
  query,
  run,
  connection,
  testConnection,
  initializeSchema
};

