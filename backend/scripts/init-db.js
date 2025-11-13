#!/usr/bin/env node

/**
 * Initialize DuckDB Database
 * 
 * Reads and executes init_duckdb.sql to create all tables and schemas.
 * Usage: node backend/scripts/init-db.js
 */

const duckdb = require('duckdb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine database path
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📁 Created data directory: ${dataDir}`);
}

// Initialize DuckDB connection
const db = new duckdb.Database(dbPath);
const connection = db.connect();

// Promisify DuckDB query execution
function run(sql) {
  return new Promise((resolve, reject) => {
    connection.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Promisify DuckDB query execution (for SELECT)
function query(sql) {
  return new Promise((resolve, reject) => {
    connection.all(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result || []);
      }
    });
  });
}

async function initializeDatabase() {
  try {
    console.log(`🔌 Connecting to database: ${dbPath}`);
    
    // Test connection
    await query('SELECT CURRENT_TIMESTAMP as now');
    console.log('✅ Database connection successful\n');
    
    // Find init_duckdb.sql file
    const possiblePaths = [
      path.join(__dirname, '../init_duckdb.sql'),  // From scripts/ relative to backend/
      path.join(process.cwd(), 'init_duckdb.sql'),  // From project root
      path.join(__dirname, '../../init_duckdb.sql'), // Alternative path
    ];
    
    let initSqlPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        initSqlPath = possiblePath;
        break;
      }
    }
    
    if (!initSqlPath) {
      throw new Error(`init_duckdb.sql not found. Tried paths: ${possiblePaths.join(', ')}`);
    }
    
    console.log(`📄 Loading schema from: ${initSqlPath}`);
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    // Remove comment lines and block comments, then split by semicolon
    const cleanedSql = initSql
      .split('\n')
      .map(line => {
        // Remove inline comments (-- style)
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter(line => line.length > 0 && !line.match(/^\/\*/) && !line.match(/\*\/$/))
      .join('\n');
    
    // Split by semicolon and filter out empty statements
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' '))
      .filter(s => s.length > 0 && !s.match(/^\/\*/));
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        // Print statement before executing (truncate for readability)
        const statementPreview = statement.length > 80 
          ? statement.substring(0, 80) + '...' 
          : statement;
        console.log(`[${i + 1}/${statements.length}] ${statementPreview}`);
        
        try {
          await run(statement);
          successCount++;
        } catch (err) {
          const errMsg = err.message.toLowerCase();
          // Only ignore "already exists" / "duplicate" errors
          if (errMsg.includes('already exists') || 
              errMsg.includes('duplicate key') ||
              errMsg.includes('duplicate constraint')) {
            skipCount++;
            console.log(`   ⏭️  Skipped (already exists)`);
          } else {
            // Show ALL other errors - these are real problems
            errorCount++;
            errors.push({ statement: statementPreview, error: err.message });
            console.error(`   ❌ ERROR: ${err.message}`);
            console.error(`   Full statement: ${statement}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ ${successCount} statements executed successfully`);
    if (skipCount > 0) {
      console.log(`   ⏭️  ${skipCount} statements skipped (already exist)`);
    }
    if (errorCount > 0) {
      console.error(`   ❌ ${errorCount} statements FAILED`);
      console.error(`\n❌ Critical errors occurred during initialization:`);
      errors.forEach((e, idx) => {
        console.error(`\n   Error ${idx + 1}:`);
        console.error(`   Statement: ${e.statement}`);
        console.error(`   Error: ${e.error}`);
      });
      throw new Error(`Schema initialization failed with ${errorCount} error(s)`);
    }
    
    console.log(`✅ Schema initialization complete!`);
    
    // Count tables in each schema
    console.log('\n📊 Database tables:');
    const schemas = ['raw', 'staging', 'intermediate', 'mart'];
    
    for (const schema of schemas) {
      try {
        const tables = await query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${schema}'
          ORDER BY table_name
        `);
        
        if (tables.length > 0) {
          console.log(`   ${schema}: ${tables.length} table(s)`);
          tables.forEach(t => {
            console.log(`      - ${t.table_name}`);
          });
        }
      } catch (err) {
        // Schema might not exist yet, that's okay
      }
    }
    
    // Get total table count
    const allTables = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema IN ('raw', 'staging', 'intermediate', 'mart')
    `);
    
    console.log(`\n✨ Total tables created: ${allTables[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    connection.close();
    db.close();
  }
}

// Run if executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };


