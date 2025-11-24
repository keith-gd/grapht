const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/v1/spans';
const API_KEY = 'dev_local_key';

// Generate granular spans for Copilot
async function injectCopilotSpans() {
  const now = new Date();
  const session_id = `copilot_session_${now.getTime()}`;
  const trace_id = `trace_${now.getTime()}_copilot`;
  
  const spans = [];
  
  // 1. Suggestion Trigger
  spans.push({
    type: 'tool',
    trace_id: trace_id,
    span_id: `span_${now.getTime()}_trigger`,
    parent_span_id: null,
    start_time: new Date(now.getTime() - 5000).toISOString(),
    end_time: new Date(now.getTime() - 4900).toISOString(),
    attributes: {
      tool_name: 'copilot_trigger',
      tool_arguments: { context_lines: 50, language: 'javascript' },
      status: 'success'
    }
  });

  // 2. LLM Generation (Completion)
  spans.push({
    type: 'llm',
    trace_id: trace_id,
    span_id: `span_${now.getTime()}_completion`,
    parent_span_id: `span_${now.getTime()}_trigger`,
    session_id: session_id,
    start_time: new Date(now.getTime() - 4800).toISOString(),
    end_time: new Date(now.getTime() - 4500).toISOString(), // 300ms latency
    attributes: {
      model_name: 'copilot-codex',
      provider: 'github',
      prompt_tokens: 500,
      completion_tokens: 50,
      total_tokens: 550,
      // Copilot doesn't expose per-call cost, but we can estimate or leave 0
      total_cost_usd: 0.00, 
      invocation_params: { temperature: 0.1 }
    }
  });

  console.log(`Injecting Copilot spans for session: ${session_id}`);

  try {
    const response = await axios.post(API_URL, { spans }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Copilot Data Ingested:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Generate granular spans for Factory Droid
async function injectDroidSpans() {
  const now = new Date();
  const session_id = `droid_session_${now.getTime()}`;
  const trace_id = `trace_${now.getTime()}_droid`;
  
  const spans = [];
  
  // 1. Task Planning (LLM)
  const span1_id = `span_${now.getTime()}_plan`;
  spans.push({
    type: 'llm',
    trace_id: trace_id,
    span_id: span1_id,
    parent_span_id: null,
    session_id: session_id,
    start_time: new Date(now.getTime() - 10000).toISOString(),
    end_time: new Date(now.getTime() - 8000).toISOString(),
    attributes: {
      model_name: 'gpt-4-turbo',
      provider: 'openai',
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
      total_cost_usd: 0.03,
      input_messages: [{ role: 'user', content: 'Refactor this component' }]
    }
  });

  // 2. Tool Execution (File Read)
  spans.push({
    type: 'tool',
    trace_id: trace_id,
    span_id: `span_${now.getTime()}_read`,
    parent_span_id: span1_id,
    start_time: new Date(now.getTime() - 7000).toISOString(),
    end_time: new Date(now.getTime() - 6800).toISOString(),
    attributes: {
      tool_name: 'read_file',
      tool_arguments: { path: 'src/components/Button.tsx' },
      status: 'success'
    }
  });

  console.log(`Injecting Droid spans for session: ${session_id}`);

  try {
    const response = await axios.post(API_URL, { spans }, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Droid Data Ingested:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function run() {
  await injectCopilotSpans();
  await injectDroidSpans();
}

run();


