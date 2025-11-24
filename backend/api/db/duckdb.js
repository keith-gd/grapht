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

// Global connection state
let db = null;
let connection = null;

function connect() {
  try {
    if (connection) return connection;
    
    console.log(`🔌 Connecting to DuckDB: ${dbPath}`);
    db = new duckdb.Database(dbPath, (err) => {
      if (err) console.error('❌ Database open error:', err);
    });
    
    connection = db.connect();
    console.log('✅ DuckDB connected');
    return connection;
  } catch (err) {
    console.error('❌ Failed to connect to DuckDB:', err);
    // Don't throw, let query handle it
    return null;
  }
}

// Initialize connection immediately
connect();

// Promisify DuckDB query execution with Retry Logic
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const execute = (retryCount = 0) => {
      const conn = connect();
      
      if (!conn) {
        return reject(new Error('No database connection available'));
      }

      const cb = (err, result) => {
        if (err) {
          const errMsg = err.message || '';
          // Retry on connection errors
          if (retryCount < 2 && (errMsg.includes('Connection') || errMsg.includes('closed') || errMsg.includes('locked'))) {
            console.warn(`⚠️ Query failed (${errMsg}), retrying connection...`);
            connection = null; // Force reconnect
            setTimeout(() => execute(retryCount + 1), 100); // Slight delay
            return;
          }
          reject(err);
        } else {
          resolve({ rows: result || [] });
        }
      };

      try {
        if (params && params.length > 0) {
          conn.all(sql, ...params, cb);
        } else {
          conn.all(sql, cb);
        }
      } catch (err) {
        // Catch sync errors (like "db is not open")
        if (retryCount < 2) {
           console.warn(`⚠️ Query execution error, retrying...`);
           connection = null;
           setTimeout(() => execute(retryCount + 1), 100);
        } else {
           reject(err);
        }
      }
    };
    
    execute();
  });
}

// Execute a query without returning results (for DDL statements)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const execute = (retryCount = 0) => {
      const conn = connect();
      
      if (!conn) {
        return reject(new Error('No database connection available'));
      }

      const cb = (err) => {
        if (err) {
          const errMsg = err.message || '';
          if (retryCount < 2 && (errMsg.includes('Connection') || errMsg.includes('closed'))) {
            console.warn(`⚠️ Run failed (${errMsg}), retrying connection...`);
            connection = null;
            setTimeout(() => execute(retryCount + 1), 100);
            return;
          }
          reject(err);
        } else {
          resolve();
        }
      };

      try {
        if (params && params.length > 0) {
          conn.run(sql, ...params, cb);
        } else {
          conn.run(sql, cb);
        }
      } catch (err) {
         if (retryCount < 2) {
           connection = null;
           setTimeout(() => execute(retryCount + 1), 100);
         } else {
           reject(err);
         }
      }
    };

    execute();
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
              // console.warn('Schema initialization warning:', err.message);
            }
          }
        }
      }
      console.log('✅ DuckDB schema initialized');
    } else {
      console.warn('⚠️  init_duckdb.sql not found in any expected location, skipping schema initialization');
    }
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    // Don't throw fatal error, allow app to start (db might be fine)
  }
}

// Test connection
async function testConnection() {
  try {
    const result = await query('SELECT CURRENT_TIMESTAMP as now');
    console.log('✅ DuckDB connection test passed');
    return true;
  } catch (error) {
    console.error('❌ DuckDB connection test failed:', error.message);
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
