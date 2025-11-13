# Setup Guide - Agent Analytics Platform

## Local Development Environment Setup

This guide will get you up and running with the Agent Analytics Platform locally in about 30 minutes.

## Prerequisites

**Required Software:**
- **Node.js 18+** (for CLI development)
- **Docker & Docker Compose** (for backend services)
- **Git** (obviously)
- **DuckDB CLI** (optional, for direct database access)
- **dbt CLI** (install via pip)
- **Your favorite code editor** (VS Code, Cursor, etc.)

**Your Machine:**
- MacOS, Linux, or Windows WSL2
- At least 8GB RAM (16GB recommended)
- 10GB free disk space

## Step 1: Project Structure

Create the project directory structure:

```bash
mkdir agent-analytics
cd agent-analytics

# Create subdirectories
mkdir -p cli backend dbt dashboards docs

# Your structure should look like:
# agent-analytics/
# ├── cli/          # Node.js CLI tool
# ├── backend/      # API + OTel Collector
# ├── dbt/          # dbt transformation project
# ├── dashboards/   # Dashboard configs
# └── docs/         # Documentation
```

## Step 2: Backend Services (Docker Compose)

Create `backend/docker-compose.yml`:

```yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: agent-analytics-otel
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Prometheus metrics (for monitoring the collector)
    depends_on:
      api:
        condition: service_started

  api:
    build: ./api
    container_name: agent-analytics-api
    environment:
      DATA_DIR: /app/data
      PORT: 3000
      API_KEY: ${API_KEY:-dev_local_key}
      NODE_ENV: ${NODE_ENV:-development}
    ports:
      - "3000:3000"
    volumes:
      - ./api:/app
      - ./init_duckdb.sql:/app/init_duckdb.sql
      - ./data:/app/data
      - /app/node_modules
    restart: unless-stopped

  metabase:
    image: metabase/metabase:latest
    container_name: agent-analytics-metabase
    environment:
      MB_DB_TYPE: sqlite
      MB_DB_FILE: /metabase-data/metabase.db
    ports:
      - "3001:3000"
    volumes:
      - metabase_data:/metabase-data
    restart: unless-stopped

volumes:
  metabase_data:
```

Create `backend/init_duckdb.sql`:

```sql
-- DuckDB initialization script
-- Note: DuckDB doesn't use schemas the same way as PostgreSQL
-- We'll use table prefixes instead: raw_*, staging_*, intermediate_*, mart_*

-- Create raw tables for OTel data
CREATE TABLE raw_otel_metrics (
    id BIGINT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    metric_name VARCHAR(255),
    metric_value DOUBLE PRECISION,
    attributes JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raw_otel_logs (
    id BIGINT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    severity VARCHAR(50),
    body TEXT,
    attributes JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create raw tables for git and copilot data
CREATE TABLE raw_git_commits (
    id BIGINT PRIMARY KEY,
    commit_hash VARCHAR(40) UNIQUE NOT NULL,
    commit_message TEXT,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    commit_timestamp TIMESTAMPTZ NOT NULL,
    files_changed INTEGER,
    lines_added INTEGER,
    lines_deleted INTEGER,
    agent_assisted BOOLEAN DEFAULT FALSE,
    agent_session_id VARCHAR(255),
    agent_type VARCHAR(50),
    developer_id VARCHAR(255),
    project_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raw_copilot_metrics (
    id BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    developer_id VARCHAR(255),
    total_suggestions INTEGER,
    total_acceptances INTEGER,
    total_lines_suggested INTEGER,
    total_lines_accepted INTEGER,
    total_active_users INTEGER,
    language_breakdown JSON,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, developer_id)
);

-- Create indexes
CREATE INDEX idx_metrics_developer_timestamp ON raw_otel_metrics(developer_id, timestamp DESC);
CREATE INDEX idx_logs_developer_timestamp ON raw_otel_logs(developer_id, timestamp DESC);
CREATE INDEX idx_commits_developer ON raw_git_commits(developer_id, commit_timestamp DESC);
CREATE INDEX idx_copilot_developer_date ON raw_copilot_metrics(developer_id, date DESC);
```

Create `backend/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 100
  
  attributes:
    actions:
      - key: developer_id
        from_context: x-developer-id
        action: upsert

exporters:
  logging:
    loglevel: debug
  
  # For MVP, we'll use the API to insert into DuckDB
  # In production, use a proper exporter
  otlphttp:
    endpoint: http://api:3000/v1/otel
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [logging, otlphttp]
    
    logs:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [logging, otlphttp]
```

Start the backend:

```bash
cd backend
docker-compose up -d

# Check if all services are running
docker-compose ps

# Should see: otel-collector, api, metabase all "Up"

# View logs
docker-compose logs -f
```

## Step 3: API Service

Create `backend/api/package.json`:

```json
{
  "name": "agent-analytics-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Create `backend/api/index.js`:

```javascript
const express = require('express');
const Database = require('better-sqlite3'); // Using better-sqlite3 for DuckDB compatibility
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// DuckDB connection (using better-sqlite3-compatible API)
const dataDir = process.env.DATA_DIR || '/app/data';
const dbPath = path.join(dataDir, 'agent_analytics.duckdb');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize DuckDB connection
// Note: In production, use the DuckDB Node.js client
const db = new Database(dbPath);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// POST /v1/commits - From git hook
app.post('/v1/commits', async (req, res) => {
  try {
    const {
      commit_hash, commit_message, author_name, author_email,
      timestamp, files_changed, lines_added, lines_deleted,
      agent_assisted, agent_session_id, agent_type,
      developer_id, project_id
    } = req.body;

    // DuckDB insert (using prepared statement)
    const stmt = db.prepare(`
      INSERT INTO raw_git_commits (
        commit_hash, commit_message, author_name, author_email,
        commit_timestamp, files_changed, lines_added, lines_deleted,
        agent_assisted, agent_session_id, agent_type,
        developer_id, project_id
      ) VALUES (?, ?, ?, ?, to_timestamp(?), ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (commit_hash) DO NOTHING
    `);
    
    stmt.run(
      commit_hash, commit_message, author_name, author_email,
      timestamp, files_changed, lines_added, lines_deleted,
      agent_assisted, agent_session_id, agent_type,
      developer_id, project_id
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error inserting commit:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/otel - From OTel Collector
app.post('/v1/otel', async (req, res) => {
  try {
    const { resourceMetrics, resourceLogs } = req.body;

    // Parse OTel format and insert into raw tables
    // (This is simplified - real implementation needs full OTel parsing)

    if (resourceMetrics) {
      for (const metric of resourceMetrics) {
        // Extract and insert metrics
        // TODO: Implement OTel metrics parsing
      }
    }

    if (resourceLogs) {
      for (const log of resourceLogs) {
        // Extract and insert logs
        // TODO: Implement OTel logs parsing
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing OTel data:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

Create `backend/api/Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

Build and run:

```bash
cd backend/api
npm install

# If using Docker Compose, it will build automatically
# Otherwise:
docker build -t agent-analytics-api .
```

## Step 4: dbt Project

Install dbt:

```bash
pip install dbt-duckdb
```

Initialize dbt project:

```bash
cd ../dbt
dbt init agent_analytics

cd agent_analytics
```

Update `dbt_project.yml`:

```yaml
name: 'agent_analytics'
version: '1.0.0'
config-version: 2

profile: 'agent_analytics'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  agent_analytics:
    staging:
      +schema: staging
      +materialized: view
    intermediate:
      +schema: intermediate
      +materialized: view
    marts:
      +schema: mart
      +materialized: table
```

Update `profiles.yml` (in `~/.dbt/profiles.yml`):

```yaml
agent_analytics:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: ../backend/data/agent_analytics.duckdb
      schema: main
      threads: 4
```

**Note:** You'll need to install `dbt-duckdb` adapter:
```bash
pip install dbt-duckdb
```

Test connection:

```bash
dbt debug

# Should see: "All checks passed!"
```

Create your first model `models/staging/stg_git_commits.sql`:

```sql
SELECT
    commit_hash,
    commit_message,
    author_name,
    author_email,
    commit_timestamp,
    files_changed,
    lines_added,
    lines_deleted,
    agent_assisted,
    agent_session_id,
    agent_type,
    developer_id,
    project_id,
    created_at
FROM {{ source('raw', 'git_commits') }}
```

Create `models/staging/sources.yml`:

```yaml
version: 2

sources:
  - name: raw
    database: agent_analytics
    schema: raw
    tables:
      - name: git_commits
      - name: otel_metrics
      - name: otel_logs
      - name: copilot_metrics
```

Run dbt:

```bash
dbt run

# Should see: "Completed successfully"

dbt test  # Run tests (none yet, but good practice)
```

## Step 5: CLI Tool

Create `cli/package.json`:

```json
{
  "name": "@agent-analytics/cli",
  "version": "0.1.0",
  "bin": {
    "agent-analytics": "./bin/cli.js"
  },
  "scripts": {
    "dev": "node bin/cli.js"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^9.2.0",
    "axios": "^1.4.0",
    "yaml": "^2.3.0",
    "chalk": "^5.3.0"
  }
}
```

Create `cli/bin/cli.js`:

```javascript
#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');

const program = new Command();
const CONFIG_PATH = path.join(os.homedir(), '.agent-analytics', 'config.json');

program
  .name('agent-analytics')
  .description('CLI tool for Agent Analytics Platform')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize Agent Analytics in this project')
  .action(async () => {
    console.log('🚀 Welcome to Agent Analytics!\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your API key:',
        validate: (input) => input.length > 0
      },
      {
        type: 'input',
        name: 'developerId',
        message: 'Enter your developer ID (e.g., your email):',
        validate: (input) => input.length > 0
      },
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Which AI agents do you use?',
        choices: [
          { name: 'Claude Code', value: 'claude_code', checked: true },
          { name: 'GitHub Copilot', value: 'github_copilot' },
          { name: 'Cursor', value: 'cursor' }
        ]
      }
    ]);

    // Save config
    const config = {
      apiKey: answers.apiKey,
      developerId: answers.developerId,
      backendUrl: 'http://localhost:3000',  // For local dev
      enabledAgents: answers.agents,
      telemetry: {
        exportInterval: 60,
        includePrompts: false
      },
      git: {
        trackCommits: true,
        correlationWindow: 300
      }
    };

    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log('\n✅ Configuration saved!\n');

    // Set up git hooks
    if (config.git.trackCommits) {
      setupGitHooks();
    }

    // Print OTel env vars for Claude Code
    if (config.enabledAgents.includes('claude_code')) {
      printClaudeCodeSetup(config);
    }

    console.log('\n🎉 Setup complete! Start using your AI agents and check the dashboard.');
  });

// Log commit command (called by git hook)
program
  .command('log-commit')
  .description('Log a git commit (called by post-commit hook)')
  .option('--hash <hash>', 'Commit hash')
  .option('--message <message>', 'Commit message')
  .option('--author <author>', 'Author name')
  .option('--email <email>', 'Author email')
  .option('--timestamp <timestamp>', 'Commit timestamp')
  .option('--files-changed <n>', 'Number of files changed', parseInt)
  .option('--lines-added <n>', 'Lines added', parseInt)
  .option('--lines-deleted <n>', 'Lines deleted', parseInt)
  .action(async (options) => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

      const commitData = {
        commit_hash: options.hash,
        commit_message: options.message,
        author_name: options.author,
        author_email: options.email,
        timestamp: parseInt(options.timestamp),
        files_changed: options.filesChanged,
        lines_added: options.linesAdded,
        lines_deleted: options.linesDeleted,
        developer_id: config.developerId,
        project_id: process.cwd() // Use current directory as project ID
      };

      // Check if there was a recent agent session
      // (For MVP, we'll skip this check - just log all commits)
      commitData.agent_assisted = false; // TODO: Check recent sessions

      await axios.post(`${config.backendUrl}/v1/commits`, commitData, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      console.log('✅ Commit logged');
    } catch (error) {
      console.error('❌ Error logging commit:', error.message);
    }
  });

program.parse();

// Helper functions
function setupGitHooks() {
  const hookPath = path.join(process.cwd(), '.git', 'hooks', 'post-commit');
  const hookScript = `#!/bin/bash
# Agent Analytics post-commit hook

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_EMAIL=$(git log -1 --pretty=%ae)
COMMIT_TIMESTAMP=$(git log -1 --pretty=%ct)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l | tr -d ' ')
LINES_ADDED=$(git diff HEAD~1 HEAD --numstat | awk '{add+=$1} END {print add}')
LINES_DELETED=$(git diff HEAD~1 HEAD --numstat | awk '{del+=$2} END {print del}')

agent-analytics log-commit \\
  --hash "$COMMIT_HASH" \\
  --message "$COMMIT_MSG" \\
  --author "$COMMIT_AUTHOR" \\
  --email "$COMMIT_EMAIL" \\
  --timestamp "$COMMIT_TIMESTAMP" \\
  --files-changed "$FILES_CHANGED" \\
  --lines-added "$LINES_ADDED" \\
  --lines-deleted "$LINES_DELETED" \\
  2>/dev/null &
`;

  fs.writeFileSync(hookPath, hookScript);
  fs.chmodSync(hookPath, '755');
  console.log('✅ Git post-commit hook installed');
}

function printClaudeCodeSetup(config) {
  console.log('\n📝 Add these to your shell profile (~/.zshrc or ~/.bashrc):\n');
  console.log('export CLAUDE_CODE_ENABLE_TELEMETRY=1');
  console.log('export OTEL_METRICS_EXPORTER=otlp');
  console.log('export OTEL_LOGS_EXPORTER=otlp');
  console.log('export OTEL_EXPORTER_OTLP_PROTOCOL=grpc');
  console.log('export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317');
  console.log(`export OTEL_EXPORTER_OTLP_HEADERS="x-developer-id=${config.developerId}"`);
  console.log('export OTEL_METRIC_EXPORT_INTERVAL=60000');
}
```

Install and test CLI:

```bash
cd cli
npm install
npm link  # Make it globally available as 'agent-analytics'

# Test it
agent-analytics --version
agent-analytics init
```

## Step 6: Verify Everything Works

**6.1 Check Backend:**
```bash
# Check all services are running
cd backend
docker-compose ps

# Test API
curl http://localhost:3000/health
# Should return: {"status":"healthy"}
```

**6.2 Check Database:**
```bash
# Install DuckDB CLI (optional)
# macOS: brew install duckdb
# Or download from https://duckdb.org/docs/installation/

# Connect to DuckDB
duckdb backend/data/agent_analytics.duckdb

# Inside DuckDB:
SHOW TABLES;
# Should see: raw_git_commits, raw_otel_metrics, raw_otel_logs, raw_copilot_metrics

SELECT COUNT(*) FROM raw_git_commits;

.quit
```

**6.3 Check dbt:**
```bash
cd dbt/agent_analytics
dbt run
dbt test

# Should complete successfully
```

**6.4 Check Metabase:**
Open browser: http://localhost:3001

First time setup:
1. Create account
2. Connect to database:
   - Database type: DuckDB (or use JDBC connection)
   - Database file path: `/app/data/agent_analytics.duckdb` (from container perspective)
   - Or use JDBC URL: `jdbc:duckdb:/app/data/agent_analytics.duckdb`
   
   **Note:** Metabase may require DuckDB JDBC driver. Check Metabase documentation for DuckDB support.

**6.5 Generate Test Data:**

Create `backend/test_data.sql`:

```sql
-- Insert fake commit
INSERT INTO raw.git_commits (
  commit_hash, commit_message, author_name, author_email,
  commit_timestamp, files_changed, lines_added, lines_deleted,
  agent_assisted, agent_type, developer_id, project_id
) VALUES (
  'abc123', 'feat: add new feature', 'Keith', 'keith@example.com',
  NOW(), 5, 120, 30, true, 'claude_code', 'dev_keith', 'proj_test'
);

-- Insert fake OTel metric
INSERT INTO raw.otel_metrics (
  timestamp, developer_id, metric_name, metric_value, attributes
) VALUES (
  NOW(), 'dev_keith', 'claude_code.tokens.input', 1500,
  '{"session_id": "sess_123", "model": "claude-sonnet-4"}'::jsonb
);
```

Run it:
```bash
duckdb backend/data/agent_analytics.duckdb < test_data.sql
```

Run dbt to transform:
```bash
cd dbt/agent_analytics
dbt run
```

Check in Metabase that you see data!

## Step 7: Your First Agent Session

**Now instrument your own Claude Code usage:**

1. Add OTel env vars to your shell:
```bash
echo '
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_HEADERS="x-developer-id=dev_keith"
export OTEL_METRIC_EXPORT_INTERVAL=60000
' >> ~/.zshrc  # or ~/.bashrc

source ~/.zshrc
```

2. Initialize CLI in a test project:
```bash
cd ~/test-project
agent-analytics init
```

3. Run Claude Code:
```bash
claude
# (use it for something)
```

4. Make a commit:
```bash
echo "test" > test.txt
git add test.txt
git commit -m "test: agent analytics setup"
```

5. Check that data flowed:
```bash
duckdb backend/data/agent_analytics.duckdb
SELECT * FROM raw_otel_metrics ORDER BY created_at DESC LIMIT 5;
SELECT * FROM raw_git_commits ORDER BY created_at DESC LIMIT 5;
.quit
```

6. Run dbt:
```bash
cd dbt/agent_analytics
dbt run
```

7. Check dashboard in Metabase!

## Common Issues & Troubleshooting

**Docker services won't start:**
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
```

**DuckDB file not found:**
```bash
# Ensure data directory exists
mkdir -p backend/data

# Check if DuckDB file exists
ls -lh backend/data/agent_analytics.duckdb

# The file will be created automatically on first API request
```

**dbt can't connect:**
- Check `profiles.yml` has correct DuckDB path
- Ensure `dbt-duckdb` adapter is installed: `pip install dbt-duckdb`
- Run `dbt debug` to diagnose

**CLI not found after npm link:**
```bash
npm unlink @agent-analytics/cli
cd cli
npm link
```

**No data in OTel Collector:**
- Check Claude Code env vars are set: `env | grep OTEL`
- Check OTel Collector logs: `docker-compose logs otel-collector`
- Try console exporter first: `export OTEL_METRICS_EXPORTER=console`

## Next Steps

Once everything is working locally:

1. Review the dbt models in `DBT_MODELS.md`
2. Build out the full staging → intermediate → marts pipeline
3. Create dashboards based on `DASHBOARD_SPEC.md`
4. Add more test data or use it with real agent sessions for a week
5. Get feedback from developer friends!

---

**You're ready to start building!** 🚀

Hand this setup guide to Claude Code or Cursor and ask them to help you implement each component.
