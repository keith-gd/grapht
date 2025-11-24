const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/v1/agent-sessions';
const API_KEY = 'dev_local_key';

// Generate recent session
async function injectRecentSession() {
  const now = new Date();
  const session_id = `session_${now.getTime()}`;
  
  const payload = {
    session_id: session_id,
    developer_id: "dev_local_user",
    agent_type: "claude_code",
    model_name: "claude-3-5-sonnet-20241022",
    session_start: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // Started 30 mins ago
    session_end: now.toISOString(),
    input_tokens: 1500,
    output_tokens: 450,
    total_cost: 0.015,
    metadata: {
      project: "agent-analytics",
      task: "freshness-check"
    }
  };

  console.log(`Injecting session: ${session_id}`);

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

injectRecentSession();


