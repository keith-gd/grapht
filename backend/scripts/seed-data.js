#!/usr/bin/env node

/**
 * Seed Test Data for DuckDB
 * 
 * Generates realistic test data for the last 30 days:
 * - 50 agent sessions (claude_code, copilot, cursor)
 * - 75 git commits (some with agent_session_id)
 * - 200 otel_metrics tied to sessions
 * 
 * Usage: node backend/scripts/seed-data.js
 */

const duckdb = require('duckdb');
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

// Determine database path
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

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

// Agent types
const AGENT_TYPES = ['claude_code', 'copilot', 'cursor'];

// Claude Code models
const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

/**
 * Generate a random number between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate realistic session duration in seconds
 */
function generateSessionDuration() {
  return randomInt(300, 3600); // 5 minutes to 1 hour
}

/**
 * Generate 50 agent sessions
 */
async function generateAgentSessions() {
  console.log('📊 Generating 50 agent sessions...');
  
  const sessions = [];
  const now = new Date();
  
  // Generate sessions over the last 30 days
  for (let i = 0; i < 50; i++) {
    const sessionId = `session_${faker.string.uuid()}`;
    const developerId = `dev_${faker.string.alphanumeric(8)}`;
    const agentType = faker.helpers.arrayElement(AGENT_TYPES);
    const modelName = agentType === 'claude_code' 
      ? faker.helpers.arrayElement(CLAUDE_MODELS)
      : null;
    
    // Session start time (random time in last 30 days)
    const daysAgo = randomInt(0, 30);
    const hoursAgo = randomInt(0, 23);
    const minutesAgo = randomInt(0, 59);
    const sessionStart = new Date(now);
    sessionStart.setDate(sessionStart.getDate() - daysAgo);
    sessionStart.setHours(sessionStart.getHours() - hoursAgo);
    sessionStart.setMinutes(sessionStart.getMinutes() - minutesAgo);
    
    const duration = generateSessionDuration();
    const sessionEnd = new Date(sessionStart.getTime() + duration * 1000);
    
    sessions.push({
      sessionId,
      developerId,
      agentType,
      modelName,
      sessionStart,
      sessionEnd,
      duration,
    });
  }
  
  // Insert session start logs
  console.log('  → Inserting session start logs...');
  const startLogs = sessions.map(s => ({
    timestamp: s.sessionStart.toISOString(),
    developer_id: s.developerId,
    severity: 'INFO',
    body: `session_start: ${s.sessionId}`,
    attributes: JSON.stringify({
      session_id: s.sessionId,
      agent_type: s.agentType,
      model: s.modelName,
    }),
  }));
  
  // Bulk insert using DuckDB's INSERT INTO ... VALUES
  if (startLogs.length > 0) {
    const values = startLogs.map(log => 
      `('${log.timestamp}', '${log.developer_id}', '${log.severity}', '${log.body.replace(/'/g, "''")}', '${log.attributes.replace(/'/g, "''")}')`
    ).join(', ');
    
    await run(`
      INSERT INTO raw.otel_logs (timestamp, developer_id, severity, body, attributes)
      VALUES ${values}
    `);
  }
  
  // Insert session end logs
  console.log('  → Inserting session end logs...');
  const endLogs = sessions.map(s => ({
    timestamp: s.sessionEnd.toISOString(),
    developer_id: s.developerId,
    severity: 'INFO',
    body: `session_end: ${s.sessionId}`,
    attributes: JSON.stringify({
      session_id: s.sessionId,
    }),
  }));
  
  if (endLogs.length > 0) {
    const values = endLogs.map(log => 
      `('${log.timestamp}', '${log.developer_id}', '${log.severity}', '${log.body.replace(/'/g, "''")}', '${log.attributes.replace(/'/g, "''")}')`
    ).join(', ');
    
    await run(`
      INSERT INTO raw.otel_logs (timestamp, developer_id, severity, body, attributes)
      VALUES ${values}
    `);
  }
  
  console.log(`  ✅ Generated ${sessions.length} sessions`);
  return sessions;
}

/**
 * Generate 200 OTel metrics tied to sessions
 */
async function generateOtelMetrics(sessions) {
  console.log('📈 Generating 200 OTel metrics...');
  
  const metrics = [];
  const claudeSessions = sessions.filter(s => s.agentType === 'claude_code');
  
  // Generate token metrics for Claude Code sessions
  let metricCount = 0;
  const targetMetrics = 200;
  
  for (const session of claudeSessions) {
    if (metricCount >= targetMetrics) break;
    
    // Generate realistic token counts
    const inputTokens = randomInt(1000, 50000);
    const outputTokens = randomInt(500, 20000);
    const cacheCreationTokens = Math.floor(inputTokens * randomFloat(0.1, 0.3));
    const cacheReadTokens = Math.floor(inputTokens * randomFloat(0.05, 0.25));
    
    // Distribute metrics across session duration
    const numEvents = randomInt(2, 5);
    const timeStep = session.duration / numEvents;
    
    for (let i = 0; i < numEvents && metricCount < targetMetrics; i++) {
      const eventTime = new Date(session.sessionStart.getTime() + i * timeStep * 1000);
      const eventTokens = {
        input: Math.floor(inputTokens / numEvents),
        output: Math.floor(outputTokens / numEvents),
        cacheCreation: Math.floor(cacheCreationTokens / numEvents),
        cacheRead: Math.floor(cacheReadTokens / numEvents),
      };
      
      const attributes = JSON.stringify({
        session_id: session.sessionId,
        agent_type: session.agentType,
        model: session.modelName,
      });
      
      // Input tokens
      metrics.push({
        timestamp: eventTime.toISOString(),
        developer_id: session.developerId,
        metric_name: 'claude_code.tokens.input',
        metric_value: eventTokens.input,
        attributes: attributes.replace(/'/g, "''"),
      });
      metricCount++;
      
      // Output tokens
      if (metricCount < targetMetrics) {
        metrics.push({
          timestamp: eventTime.toISOString(),
          developer_id: session.developerId,
          metric_name: 'claude_code.tokens.output',
          metric_value: eventTokens.output,
          attributes: attributes.replace(/'/g, "''"),
        });
        metricCount++;
      }
      
      // Cache creation tokens (less frequent)
      if (i % 2 === 0 && metricCount < targetMetrics) {
        metrics.push({
          timestamp: eventTime.toISOString(),
          developer_id: session.developerId,
          metric_name: 'claude_code.tokens.cache_creation',
          metric_value: eventTokens.cacheCreation,
          attributes: attributes.replace(/'/g, "''"),
        });
        metricCount++;
      }
      
      // Cache read tokens
      if (i % 3 === 0 && metricCount < targetMetrics) {
        metrics.push({
          timestamp: eventTime.toISOString(),
          developer_id: session.developerId,
          metric_name: 'claude_code.tokens.cache_read',
          metric_value: eventTokens.cacheRead,
          attributes: attributes.replace(/'/g, "''"),
        });
        metricCount++;
      }
    }
  }
  
  // Bulk insert metrics
  if (metrics.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      const values = batch.map(m => 
        `('${m.timestamp}', '${m.developer_id}', '${m.metric_name}', ${m.metric_value}, '${m.attributes}')`
      ).join(', ');
      
      await run(`
        INSERT INTO raw.otel_metrics (timestamp, developer_id, metric_name, metric_value, attributes)
        VALUES ${values}
      `);
    }
  }
  
  console.log(`  ✅ Generated ${metrics.length} metrics`);
  return metrics;
}

/**
 * Generate 75 git commits (some with agent_session_id)
 */
async function generateGitCommits(sessions) {
  console.log('📝 Generating 75 git commits...');
  
  const commits = [];
  const now = new Date();
  
  // Create a map of session IDs to developer IDs for correlation
  const sessionMap = new Map();
  sessions.forEach(s => {
    sessionMap.set(s.sessionId, {
      developerId: s.developerId,
      agentType: s.agentType,
      sessionStart: s.sessionStart,
      sessionEnd: s.sessionEnd,
    });
  });
  
  // Generate commits over the last 30 days
  for (let i = 0; i < 75; i++) {
    // Generate a realistic git commit SHA (40 hex characters)
    const commitHash = faker.string.hexadecimal({ length: 40, prefix: '' });
    const daysAgo = randomInt(0, 30);
    const hoursAgo = randomInt(0, 23);
    const commitTime = new Date(now);
    commitTime.setDate(commitTime.getDate() - daysAgo);
    commitTime.setHours(commitTime.getHours() - hoursAgo);
    
    // 60% chance of being agent-assisted
    const isAgentAssisted = Math.random() < 0.6;
    
    let agentSessionId = null;
    let agentType = null;
    let developerId = null;
    
    if (isAgentAssisted && sessions.length > 0) {
      // Find a session that could have led to this commit
      // Commit should be within 5 minutes after session end
      const candidateSessions = sessions.filter(s => {
        const timeDiff = (commitTime - s.sessionEnd) / 1000; // seconds
        return timeDiff >= 0 && timeDiff <= 300; // 0-5 minutes after session
      });
      
      if (candidateSessions.length > 0) {
        const session = faker.helpers.arrayElement(candidateSessions);
        agentSessionId = session.sessionId;
        agentType = session.agentType;
        developerId = session.developerId;
      }
    }
    
    // If not agent-assisted, generate a random developer
    if (!developerId) {
      developerId = `dev_${faker.string.alphanumeric(8)}`;
    }
    
    // Agent-assisted commits tend to have more changes
    const filesChanged = isAgentAssisted 
      ? randomInt(3, 15) 
      : randomInt(1, 8);
    
    const linesAdded = isAgentAssisted
      ? randomInt(50, 500)
      : randomInt(10, 200);
    
    const linesDeleted = isAgentAssisted
      ? randomInt(20, 300)
      : randomInt(5, 100);
    
    // Generate realistic commit messages
    const commitMessages = [
      `fix: ${faker.hacker.phrase()}`,
      `feat: ${faker.hacker.phrase()}`,
      `refactor: ${faker.hacker.phrase()}`,
      `docs: ${faker.hacker.phrase()}`,
      `test: ${faker.hacker.phrase()}`,
      `chore: ${faker.hacker.phrase()}`,
      `perf: ${faker.hacker.phrase()}`,
    ];
    
    commits.push({
      commit_hash: commitHash,
      commit_message: faker.helpers.arrayElement(commitMessages).replace(/'/g, "''"),
      author_name: faker.person.fullName().replace(/'/g, "''"),
      author_email: faker.internet.email(),
      commit_timestamp: commitTime.toISOString(),
      files_changed: filesChanged,
      lines_added: linesAdded,
      lines_deleted: linesDeleted,
      agent_assisted: isAgentAssisted,
      agent_session_id: agentSessionId,
      agent_type: agentType,
      developer_id: developerId,
      project_id: `proj_${faker.string.alphanumeric(8)}`,
    });
  }
  
  // Bulk insert commits
  if (commits.length > 0) {
    const batchSize = 25;
    for (let i = 0; i < commits.length; i += batchSize) {
      const batch = commits.slice(i, i + batchSize);
      const values = batch.map(c => 
        `('${c.commit_hash}', '${c.commit_message}', '${c.author_name}', '${c.author_email}', '${c.commit_timestamp}', ${c.files_changed}, ${c.lines_added}, ${c.lines_deleted}, ${c.agent_assisted}, ${c.agent_session_id ? `'${c.agent_session_id}'` : 'NULL'}, ${c.agent_type ? `'${c.agent_type}'` : 'NULL'}, '${c.developer_id}', '${c.project_id}')`
      ).join(', ');
      
      await run(`
        INSERT INTO raw.git_commits (
          commit_hash, commit_message, author_name, author_email, commit_timestamp,
          files_changed, lines_added, lines_deleted, agent_assisted,
          agent_session_id, agent_type, developer_id, project_id
        )
        VALUES ${values}
      `);
    }
  }
  
  const agentAssistedCount = commits.filter(c => c.agent_assisted).length;
  console.log(`  ✅ Generated ${commits.length} commits (${agentAssistedCount} agent-assisted, ${commits.length - agentAssistedCount} manual)`);
  return commits;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting test data generation...\n');
    
    // Test database connection
    await query('SELECT CURRENT_TIMESTAMP as now');
    console.log('✅ Database connection successful\n');
    
    // Generate data
    const sessions = await generateAgentSessions();
    console.log('');
    
    const metrics = await generateOtelMetrics(sessions);
    console.log('');
    
    const commits = await generateGitCommits(sessions);
    console.log('');
    
    console.log('✨ Test data generation complete!');
    console.log('\nSummary:');
    console.log(`  - ${sessions.length} agent sessions`);
    console.log(`  - ${commits.length} git commits`);
    console.log(`  - ${metrics.length} OTel metrics`);
    
  } catch (error) {
    console.error('❌ Error generating test data:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    connection.close();
    db.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateAgentSessions, generateOtelMetrics, generateGitCommits };

