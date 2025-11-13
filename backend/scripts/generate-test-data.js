#!/usr/bin/env node

/**
 * Test Data Generator for Agent Analytics Platform
 * 
 * Generates realistic test data for:
 * - 100 agent sessions (with OTel logs and metrics)
 * - 50 git commits (mix of agent-assisted and manual)
 * - 7 days of Copilot metrics
 */

const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Claude Code models (realistic model names)
const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

// Agent types
const AGENT_TYPES = ['claude_code', 'cursor', 'github_copilot'];

// Programming languages for Copilot metrics
const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'php'];

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
 * Generate realistic token counts for a Claude Code session
 */
function generateTokenCounts() {
  // Realistic token ranges based on actual Claude Code usage
  const inputTokens = randomInt(1000, 50000);  // 1K-50K input tokens
  const outputTokens = randomInt(500, 20000);   // 500-20K output tokens
  
  // Cache tokens are typically 10-30% of input tokens
  const cacheCreationTokens = Math.floor(inputTokens * randomFloat(0.1, 0.3));
  const cacheReadTokens = Math.floor(inputTokens * randomFloat(0.05, 0.25));
  
  return {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
  };
}

/**
 * Generate realistic session duration in seconds
 * Typical sessions: 5 minutes to 1 hour
 */
function generateSessionDuration() {
  return randomInt(300, 3600); // 5 minutes to 1 hour
}

/**
 * Generate 100 agent sessions with OTel logs and metrics
 */
async function generateAgentSessions() {
  console.log('📊 Generating 100 agent sessions...');
  
  const sessions = [];
  const now = new Date();
  
  // Generate sessions over the last 30 days
  for (let i = 0; i < 100; i++) {
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
    timestamp: s.sessionStart,
    developer_id: s.developerId,
    severity: 'INFO',
    body: `session_start: ${s.sessionId}`,
    attributes: {
      session_id: s.sessionId,
      agent_type: s.agentType,
      model: s.modelName,
    },
  }));
  
  // Insert in batches using a client transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const log of startLogs) {
      await client.query(`
        INSERT INTO raw.otel_logs (timestamp, developer_id, severity, body, attributes)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `, [log.timestamp, log.developer_id, log.severity, log.body, JSON.stringify(log.attributes)]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  
  // Insert session end logs
  console.log('  → Inserting session end logs...');
  const endLogs = sessions.map(s => ({
    timestamp: s.sessionEnd,
    developer_id: s.developerId,
    severity: 'INFO',
    body: `session_end: ${s.sessionId}`,
    attributes: {
      session_id: s.sessionId,
    },
  }));
  
  const client2 = await pool.connect();
  try {
    await client2.query('BEGIN');
    for (const log of endLogs) {
      await client2.query(`
        INSERT INTO raw.otel_logs (timestamp, developer_id, severity, body, attributes)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `, [log.timestamp, log.developer_id, log.severity, log.body, JSON.stringify(log.attributes)]);
    }
    await client2.query('COMMIT');
  } catch (err) {
    await client2.query('ROLLBACK');
    throw err;
  } finally {
    client2.release();
  }
  
  // Insert token metrics for Claude Code sessions only
  console.log('  → Inserting token usage metrics...');
  const claudeSessions = sessions.filter(s => s.agentType === 'claude_code');
  const metrics = [];
  
  for (const session of claudeSessions) {
    const tokens = generateTokenCounts();
    
    // Distribute tokens across multiple metric events during the session
    const numEvents = randomInt(3, 10); // 3-10 metric events per session
    const timeStep = session.duration / numEvents;
    
    for (let i = 0; i < numEvents; i++) {
      const eventTime = new Date(session.sessionStart.getTime() + i * timeStep * 1000);
      const eventTokens = {
        input: Math.floor(tokens.inputTokens / numEvents),
        output: Math.floor(tokens.outputTokens / numEvents),
        cacheCreation: Math.floor(tokens.cacheCreationTokens / numEvents),
        cacheRead: Math.floor(tokens.cacheReadTokens / numEvents),
      };
      
      // Input tokens
      metrics.push({
        timestamp: eventTime,
        developer_id: session.developerId,
        metric_name: 'claude_code.tokens.input',
        metric_value: eventTokens.input,
        attributes: {
          session_id: session.sessionId,
          agent_type: session.agentType,
          model: session.modelName,
        },
      });
      
      // Output tokens
      metrics.push({
        timestamp: eventTime,
        developer_id: session.developerId,
        metric_name: 'claude_code.tokens.output',
        metric_value: eventTokens.output,
        attributes: {
          session_id: session.sessionId,
          agent_type: session.agentType,
          model: session.modelName,
        },
      });
      
      // Cache creation tokens (less frequent)
      if (i % 2 === 0) {
        metrics.push({
          timestamp: eventTime,
          developer_id: session.developerId,
          metric_name: 'claude_code.tokens.cache_creation',
          metric_value: eventTokens.cacheCreation,
          attributes: {
            session_id: session.sessionId,
            agent_type: session.agentType,
            model: session.modelName,
          },
        });
      }
      
      // Cache read tokens
      if (i % 3 === 0) {
        metrics.push({
          timestamp: eventTime,
          developer_id: session.developerId,
          metric_name: 'claude_code.tokens.cache_read',
          metric_value: eventTokens.cacheRead,
          attributes: {
            session_id: session.sessionId,
            agent_type: session.agentType,
            model: session.modelName,
          },
        });
      }
    }
  }
  
  // Insert metrics in batches using transactions
  const batchSize = 100;
  for (let i = 0; i < metrics.length; i += batchSize) {
    const batch = metrics.slice(i, i + batchSize);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const metric of batch) {
        await client.query(`
          INSERT INTO raw.otel_metrics (timestamp, developer_id, metric_name, metric_value, attributes)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `, [metric.timestamp, metric.developer_id, metric.metric_name, metric.metric_value, JSON.stringify(metric.attributes)]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  console.log(`  ✅ Generated ${sessions.length} sessions with ${metrics.length} metric events`);
  return sessions;
}

/**
 * Generate 50 git commits (mix of agent-assisted and manual)
 */
async function generateGitCommits(sessions) {
  console.log('📝 Generating 50 git commits...');
  
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
  for (let i = 0; i < 50; i++) {
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
      commit_message: faker.helpers.arrayElement(commitMessages),
      author_name: faker.person.fullName(),
      author_email: faker.internet.email(),
      commit_timestamp: commitTime,
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
  
  // Insert commits in batches using transactions
  const batchSize = 20;
  for (let i = 0; i < commits.length; i += batchSize) {
    const batch = commits.slice(i, i + batchSize);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const commit of batch) {
        await client.query(`
          INSERT INTO raw.git_commits (
            commit_hash, commit_message, author_name, author_email, commit_timestamp,
            files_changed, lines_added, lines_deleted, agent_assisted,
            agent_session_id, agent_type, developer_id, project_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          commit.commit_hash, commit.commit_message, commit.author_name, commit.author_email, commit.commit_timestamp,
          commit.files_changed, commit.lines_added, commit.lines_deleted, commit.agent_assisted,
          commit.agent_session_id, commit.agent_type, commit.developer_id, commit.project_id,
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  const agentAssistedCount = commits.filter(c => c.agent_assisted).length;
  console.log(`  ✅ Generated ${commits.length} commits (${agentAssistedCount} agent-assisted, ${commits.length - agentAssistedCount} manual)`);
  return commits;
}

/**
 * Generate 7 days of Copilot metrics
 */
async function generateCopilotMetrics() {
  console.log('🤖 Generating 7 days of Copilot metrics...');
  
  const metrics = [];
  const now = new Date();
  const developers = new Set();
  
  // Generate unique developers
  for (let i = 0; i < 15; i++) {
    developers.add(`dev_${faker.string.alphanumeric(8)}`);
  }
  
  // Generate metrics for the last 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    
    // Each day, 5-12 developers are active
    const activeDevelopers = Array.from(developers)
      .sort(() => Math.random() - 0.5)
      .slice(0, randomInt(5, 12));
    
    for (const developerId of activeDevelopers) {
      // Realistic Copilot usage ranges
      const totalSuggestions = randomInt(50, 500);
      const acceptanceRate = randomFloat(0.25, 0.45); // 25-45% acceptance rate
      const totalAcceptances = Math.floor(totalSuggestions * acceptanceRate);
      
      // Lines suggested/accepted (average 5-15 lines per suggestion)
      const avgLinesPerSuggestion = randomFloat(5, 15);
      const totalLinesSuggested = Math.floor(totalSuggestions * avgLinesPerSuggestion);
      const totalLinesAccepted = Math.floor(totalAcceptances * avgLinesPerSuggestion);
      
      // Language breakdown (realistic distribution)
      const languageBreakdown = {};
      const numLanguages = randomInt(2, 5);
      const selectedLanguages = faker.helpers.arrayElements(LANGUAGES, numLanguages);
      
      let remainingSuggestions = totalSuggestions;
      selectedLanguages.forEach((lang, idx) => {
        if (idx === selectedLanguages.length - 1) {
          languageBreakdown[lang] = remainingSuggestions;
        } else {
          const langSuggestions = Math.floor(remainingSuggestions * randomFloat(0.2, 0.4));
          languageBreakdown[lang] = langSuggestions;
          remainingSuggestions -= langSuggestions;
        }
      });
      
      metrics.push({
        date: date.toISOString().split('T')[0],
        developer_id: developerId,
        total_suggestions: totalSuggestions,
        total_acceptances: totalAcceptances,
        total_lines_suggested: totalLinesSuggested,
        total_lines_accepted: totalLinesAccepted,
        total_active_users: activeDevelopers.length,
        language_breakdown: languageBreakdown,
      });
    }
  }
  
  // Insert metrics using transactions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const metric of metrics) {
      await client.query(`
        INSERT INTO raw.copilot_metrics (
          date, developer_id, total_suggestions, total_acceptances,
          total_lines_suggested, total_lines_accepted, total_active_users, language_breakdown
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (date, developer_id) DO NOTHING
      `, [
        metric.date, metric.developer_id, metric.total_suggestions, metric.total_acceptances,
        metric.total_lines_suggested, metric.total_lines_accepted, metric.total_active_users,
        JSON.stringify(metric.language_breakdown),
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  
  console.log(`  ✅ Generated metrics for ${metrics.length} developer-days`);
  return metrics;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting test data generation...\n');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Generate data
    const sessions = await generateAgentSessions();
    console.log('');
    
    await generateGitCommits(sessions);
    console.log('');
    
    await generateCopilotMetrics();
    console.log('');
    
    console.log('✨ Test data generation complete!');
    console.log('\nSummary:');
    console.log('  - 100 agent sessions with OTel logs and metrics');
    console.log('  - 50 git commits (mix of agent-assisted and manual)');
    console.log('  - 7 days of Copilot metrics');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateAgentSessions, generateGitCommits, generateCopilotMetrics };

