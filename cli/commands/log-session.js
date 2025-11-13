/**
 * Log Session Command
 * Manually log an agent session (for Droid, Cursor, or other agents)
 */

const { readConfig } = require('../lib/config');
const { makeRequest } = require('../lib/api');

async function logSession(options = {}) {
  try {
    const config = readConfig();
    
    if (!config) {
      console.error('❌ Not initialized. Run: agent-analytics init');
      process.exit(1);
    }

    // Build session data
    const sessionData = {
      session_id: options.sessionId || `session_${Date.now()}`,
      developer_id: options.developerId || config.developer_id,
      agent_type: options.agent || 'unknown',
      model_name: options.model || null,
      session_start: options.start || new Date().toISOString(),
      session_end: options.end || new Date().toISOString(),
      input_tokens: parseInt(options.inputTokens) || 0,
      output_tokens: parseInt(options.outputTokens) || 0,
      cache_creation_tokens: parseInt(options.cacheCreationTokens) || 0,
      cache_read_tokens: parseInt(options.cacheReadTokens) || 0,
      total_cost: parseFloat(options.cost) || null,
      metadata: options.metadata ? JSON.parse(options.metadata) : {}
    };

    // Send to API
    const response = await makeRequest(
      config.backend_url,
      '/v1/agent-sessions',
      'POST',
      sessionData,
      config.api_key
    );

    if (response.success) {
      console.log('✅ Session logged successfully!');
      console.log(`   Session ID: ${sessionData.session_id}`);
      console.log(`   Agent: ${sessionData.agent_type}`);
      console.log(`   Tokens: ${sessionData.input_tokens} in, ${sessionData.output_tokens} out`);
    } else {
      console.error('❌ Failed to log session');
      console.error(JSON.stringify(response, null, 2));
    }

  } catch (error) {
    console.error('❌ Error logging session:', error.message);
    process.exit(1);
  }
}

module.exports = logSession;
