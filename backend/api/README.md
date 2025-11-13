# Agent Analytics API

REST API for ingesting agent telemetry and git commit data.

## Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-10T12:00:00.000Z",
  "service": "agent-analytics-api"
}
```

### Git Commits

#### POST /v1/commits

Ingest git commit metadata from CLI git hooks.

**Headers:**
```
Authorization: Bearer <api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "commit_hash": "abc123def456",
  "commit_message": "feat: add new feature",
  "author_name": "John Doe",
  "author_email": "john@example.com",
  "timestamp": 1699632000,
  "files_changed": 5,
  "lines_added": 120,
  "lines_deleted": 30,
  "agent_assisted": true,
  "agent_session_id": "sess_123",
  "agent_type": "claude_code",
  "developer_id": "dev_john",
  "project_id": "proj_myapp"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Commit ingested successfully",
  "data": {
    "id": 1,
    "commit_hash": "abc123def456",
    "commit_timestamp": "2024-11-10T12:00:00.000Z"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/v1/commits \
  -H "Authorization: Bearer dev_local_key" \
  -H "Content-Type: application/json" \
  -d '{
    "commit_hash": "abc123",
    "commit_message": "test commit",
    "author_name": "Test User",
    "author_email": "test@example.com",
    "timestamp": 1699632000,
    "files_changed": 1,
    "lines_added": 10,
    "lines_deleted": 0,
    "developer_id": "dev_test"
  }'
```

#### GET /v1/commits

Retrieve commits (for testing/debugging).

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl http://localhost:3000/v1/commits?limit=5 \
  -H "Authorization: Bearer dev_local_key"
```

### OpenTelemetry Data

#### POST /v1/otel

Ingest OpenTelemetry data from OTel Collector.

**Headers:**
```
Authorization: Bearer <api_key>
Content-Type: application/json
```

**Request Body (OTLP format):**
```json
{
  "resourceMetrics": [
    {
      "resource": {
        "attributes": [
          {
            "key": "developer_id",
            "value": {
              "stringValue": "dev_john"
            }
          }
        ]
      },
      "scopeMetrics": [
        {
          "metrics": [
            {
              "name": "claude_code.tokens.input",
              "sum": {
                "dataPoints": [
                  {
                    "timeUnixNano": "1699632000000000000",
                    "asDouble": 1500,
                    "attributes": [
                      {
                        "key": "session_id",
                        "value": {
                          "stringValue": "sess_123"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {
            "key": "developer_id",
            "value": {
              "stringValue": "dev_john"
            }
          }
        ]
      },
      "scopeLogs": [
        {
          "logRecords": [
            {
              "timeUnixNano": "1699632000000000000",
              "severityText": "INFO",
              "body": {
                "stringValue": "Session started"
              },
              "attributes": [
                {
                  "key": "session_id",
                  "value": {
                    "stringValue": "sess_123"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTel data ingested successfully",
  "metrics_inserted": 1,
  "logs_inserted": 1
}
```

**Note:** This endpoint receives data from the OTel Collector, not directly from agents. Agents send telemetry to the collector, which forwards it here.

#### GET /v1/otel/stats

Get statistics about ingested OTel data.

**Example:**
```bash
curl http://localhost:3000/v1/otel/stats \
  -H "Authorization: Bearer dev_local_key"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_metrics": 150,
    "total_logs": 45,
    "unique_developers": 3
  }
}
```

## Authentication

All endpoints (except `/health`) require authentication via API key.

**Methods:**
1. Authorization header: `Authorization: Bearer <api_key>`
2. Custom header: `x-api-key: <api_key>`

**Default API Key (development):** `dev_local_key`

Set via environment variable:
```bash
export API_KEY=your_api_key_here
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional details (if available)"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid API key)
- `409` - Conflict (duplicate record)
- `500` - Internal Server Error

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run with nodemon (auto-reload)
npm run dev

# Run normally
npm start
```

### Environment Variables

Create `.env` file:
```
DATA_DIR=/app/data
API_KEY=dev_local_key
PORT=3000
NODE_ENV=development
```

**Note:** DuckDB is embedded - no `DATABASE_URL` needed. The database file is created at `DATA_DIR/agent_analytics.duckdb`.

### Testing

```bash
# Health check
curl http://localhost:3000/health

# Test commit ingestion
curl -X POST http://localhost:3000/v1/commits \
  -H "Authorization: Bearer dev_local_key" \
  -H "Content-Type: application/json" \
  -d @test-commit.json

# Check database
duckdb backend/data/agent_analytics.duckdb
SELECT * FROM raw_git_commits ORDER BY created_at DESC LIMIT 5;
.quit
```

## Database Schema

Data is stored in the `raw` schema:

- `raw.git_commits` - Git commit metadata
- `raw.otel_metrics` - OpenTelemetry metrics
- `raw.otel_logs` - OpenTelemetry logs
- `raw.copilot_metrics` - GitHub Copilot metrics (future)

See `../init.sql` for complete schema definition.

## Limitations (MVP)

1. **OTLP Parsing:** Simplified parser - full OTLP compliance requires OpenTelemetry SDK
2. **Rate Limiting:** Not implemented (add for production)
3. **Request Validation:** Basic validation only
4. **Logging:** Console logging only (add structured logging for production)
5. **Monitoring:** No metrics/observability (add Prometheus/DataDog)

## Production Considerations

- Add rate limiting (e.g., express-rate-limit)
- Implement proper API key management (database-backed)
- Add request validation middleware (e.g., express-validator)
- Structured logging (e.g., Winston, Pino)
- Metrics and monitoring (Prometheus, DataDog)
- API versioning strategy
- CORS configuration for production domains
- Database connection pooling tuning
- Error tracking (Sentry, Rollbar)

