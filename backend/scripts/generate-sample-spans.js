const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/v1/spans';
const API_KEY = 'dev_local_key';
const BATCH_SIZE = 50;

// Helper to generate random number in range
const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));

// Models and pricing (mock)
const MODELS = [
  { name: 'claude-3-opus-20240229', provider: 'anthropic', input_cost: 15, output_cost: 75, weight: 0.1 },
  { name: 'claude-3-sonnet-20240229', provider: 'anthropic', input_cost: 3, output_cost: 15, weight: 0.6 },
  { name: 'claude-3-haiku-20240307', provider: 'anthropic', input_cost: 0.25, output_cost: 1.25, weight: 0.3 }
];

// Tools
const TOOLS = ['read_file', 'write_file', 'bash', 'grep', 'file_search', 'ls'];

// Generate a random model based on weights
function getWeightedModel() {
  const r = Math.random();
  let sum = 0;
  for (const model of MODELS) {
    sum += model.weight;
    if (r <= sum) return model;
  }
  return MODELS[0];
}

// Generate realistic span data
async function generateSpans(count = 1000) {
  console.log(`Generating ${count} sample spans...`);
  
  const spans = [];
  const sessionCount = 50;
  const sessions = Array.from({ length: sessionCount }, (_, i) => `session_${Date.now()}_${i}`);
  
  // Generate data over last 7 days
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < count; i++) {
    const session_id = sessions[randomInt(0, sessionCount)];
    const model = getWeightedModel();
    
    // Random time in last 7 days
    const startTime = new Date(now - random(0, 7 * oneDay));
    const duration = Math.exp(random(Math.log(50), Math.log(5000))); // Log-normal distribution for latency
    const endTime = new Date(startTime.getTime() + duration);
    
    // Trace ID
    const trace_id = `trace_${startTime.getTime()}_${i}`;
    const span_id = `span_${startTime.getTime()}_${i}`;
    
    // Tokens
    const prompt_tokens = Math.floor(random(100, 4000)); // Normal-ish distribution simulation
    const completion_tokens = Math.floor(random(10, 2000));
    const total_tokens = prompt_tokens + completion_tokens;
    
    // Costs
    const prompt_cost_usd = (prompt_tokens / 1000000) * model.input_cost;
    const completion_cost_usd = (completion_tokens / 1000000) * model.output_cost;
    const total_cost_usd = prompt_cost_usd + completion_cost_usd;
    
    // Create LLM Span
    spans.push({
      type: 'llm',
      trace_id,
      span_id,
      parent_span_id: null,
      session_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      attributes: {
        model_name: model.name,
        provider: model.provider,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        prompt_cost_usd,
        completion_cost_usd,
        total_cost_usd,
        input_messages: [{ role: 'user', content: 'Sample prompt...' }],
        output_messages: [{ role: 'assistant', content: 'Sample response...' }],
        invocation_params: { temperature: 0.7 }
      }
    });
    
    // 40% chance of tool calls
    if (Math.random() < 0.4) {
      const toolCount = randomInt(1, 4);
      let toolStartTime = new Date(endTime.getTime() + 100);
      
      for (let t = 0; t < toolCount; t++) {
        const toolName = TOOLS[randomInt(0, TOOLS.length)];
        const toolDuration = random(100, 1000);
        const toolEndTime = new Date(toolStartTime.getTime() + toolDuration);
        
        spans.push({
          type: 'tool',
          trace_id,
          span_id: `${span_id}_tool_${t}`,
          parent_span_id: span_id,
          start_time: toolStartTime.toISOString(),
          end_time: toolEndTime.toISOString(),
          attributes: {
            tool_name: toolName,
            tool_arguments: { path: '/some/file/path' },
            tool_result: { status: 'ok' },
            status: Math.random() > 0.05 ? 'success' : 'error' // 5% error rate
          }
        });
        
        toolStartTime = new Date(toolEndTime.getTime() + 100);
      }
    }
  }
  
  // Send in batches
  for (let i = 0; i < spans.length; i += BATCH_SIZE) {
    const batch = spans.slice(i, i + BATCH_SIZE);
    try {
      await axios.post(API_URL, { spans: batch }, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      process.stdout.write('.');
    } catch (error) {
      console.error('\nError sending batch:', error.message);
    }
  }
  
  console.log('\n✅ Sample data generation complete!');
}

// Run
generateSpans().catch(console.error);
