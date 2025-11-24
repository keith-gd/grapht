# Custom Agent Granular Data Ingestion

You can ingest granular span data (LLM calls and Tool executions) from your own custom agents using the `/v1/spans` endpoint.

## Endpoint

`POST /v1/spans`

**Auth:** Bearer Token (default: `dev_local_key`)

## Payload Format

The endpoint expects a JSON object with a `spans` array. Each span can be of type `llm` or `tool`.

```json
{
  "spans": [
    {
      "type": "llm",
      "trace_id": "trace_12345",
      "span_id": "span_abcde",
      "parent_span_id": null,
      "session_id": "session_xyz", 
      "start_time": "2023-10-27T10:00:00Z",
      "end_time": "2023-10-27T10:00:05Z",
      "attributes": {
        "model_name": "gpt-4",
        "provider": "openai",
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150,
        "total_cost_usd": 0.0045,
        "input_messages": [{"role": "user", "content": "Hello"}],
        "output_messages": [{"role": "assistant", "content": "Hi there!"}]
      }
    },
    {
      "type": "tool",
      "trace_id": "trace_12345",
      "span_id": "span_tool_1",
      "parent_span_id": "span_abcde",
      "start_time": "2023-10-27T10:00:02Z",
      "end_time": "2023-10-27T10:00:03Z",
      "attributes": {
        "tool_name": "calculator",
        "tool_arguments": {"expression": "2 + 2"},
        "tool_result": {"result": 4},
        "status": "success"
      }
    }
  ]
}
```

## Python Example

```python
import requests
import time
import uuid

API_URL = "http://localhost:3000/v1/spans"
API_KEY = "dev_local_key"

def log_llm_call(model, messages, response, start_time, end_time, tokens, cost):
    span_id = str(uuid.uuid4())
    trace_id = str(uuid.uuid4())
    
    payload = {
        "spans": [{
            "type": "llm",
            "trace_id": trace_id,
            "span_id": span_id,
            "start_time": start_time, # ISO format
            "end_time": end_time,     # ISO format
            "attributes": {
                "model_name": model,
                "input_messages": messages,
                "output_messages": response,
                "total_tokens": tokens,
                "total_cost_usd": cost
            }
        }]
    }
    
    requests.post(
        API_URL, 
        json=payload, 
        headers={"Authorization": f"Bearer {API_KEY}"}
    )

# Usage
start = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
# ... make LLM call ...
end = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

log_llm_call("gpt-4", [{"role":"user", "content":"hi"}], [{"role":"assistant", "content":"hello"}], start, end, 150, 0.003)
```

