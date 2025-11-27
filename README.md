# Agent Analytics Platform - MVP

**ROI visibility for AI coding assistants. Multi-agent token tracking, cost analytics, and productivity insights.**

---

## 🎯 What Is This?

Companies are spending $20-50/dev/month on AI coding tools (Copilot, Claude Code, Cursor) with zero visibility into ROI or usage patterns.

**Agent Analytics Platform** is a unified dashboard that tracks:
- **Token consumption & costs** across multiple AI agents
- **Usage patterns** (who's using what, when, how often)
- **Productivity proxies** (commits correlated with agent sessions)
- **ROI metrics** for executives and engineering managers

**Target Users:** CTOs, Engineering Managers, Platform Teams, Solo Developers

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Git

### Step 1: Start Backend Services

```bash
# Using Makefile (recommended)
make start

# Or manually
cd backend
docker-compose up -d
```

### Step 2: Install CLI

```bash
# Using Makefile
make install-cli

# Or manually
cd cli
npm install
npm link
```

### Step 3: Initialize in Your Project

```bash
cd ~/your-dev-project
agent-analytics init

# Use default values:
# - API key: dev_local_key
# - Backend URL: http://localhost:3000
# - Developer ID: your-email@example.com
```

### Step 4: Configure Claude Code (Optional)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_HEADERS="x-developer-id=<your-dev-id>"
export OTEL_METRIC_EXPORT_INTERVAL=60000
```

Then reload: `source ~/.zshrc`

### Step 5: Access Dashboard

Open http://localhost:3001

**First-time setup:**
1. Create admin account
2. Connect to database:
   - Type: DuckDB
   - Database file: `backend/data/agent_analytics.duckdb`
   - Note: DuckDB is embedded - no separate database server needed

---

## 📁 Project Structure

```
agent-analytics/
├── README.md                    # This file
├── Makefile                     # Helper commands
├── files/                       # Documentation
│   ├── PROJECT_OVERVIEW.md      # High-level vision and roadmap
│   ├── TECHNICAL_SPEC.md        # Detailed architecture
│   ├── SETUP_GUIDE.md           # Step-by-step local dev setup
│   ├── DBT_MODELS.md            # dbt transformation SQL
│   └── ACTION_PLAN.md           # Development roadmap
├── cli/                         # Node.js CLI tool
│   ├── package.json
│   ├── bin/cli.js
│   ├── commands/
│   ├── lib/
│   └── README.md
├── backend/                     # Docker Compose services
│   ├── docker-compose.yml       # OTel Collector, API, Metabase
│   ├── init_duckdb.sql          # Database schema
│   ├── data/                    # DuckDB database files
│   │   └── agent_analytics.duckdb
│   ├── otel-collector-config.yaml
│   └── api/                     # Express.js REST API
│       ├── package.json
│       ├── index.js
│       ├── routes/
│       ├── middleware/
│       └── README.md
└── dbt/                         # dbt transformation project (future)
    └── agent_analytics/
```

---

## 🛠️ Makefile Commands

```bash
make start       # Start all backend services
make stop        # Stop all backend services
make restart     # Restart all services
make logs        # View logs from all services
make status      # Check service status
make clean       # Stop and remove volumes (WARNING: deletes data)
make test-api    # Test API health endpoint
make install-cli # Install CLI tool globally
make setup       # First-time setup (start services + install CLI)
```

---

## 📊 What You'll Track

### 1. Token & Cost Metrics
- Total tokens consumed (input + output)
- Cost per agent (Claude Code, Copilot, etc.)
- Cost per session
- Daily/weekly/monthly spend

### 2. Usage Patterns
- Active users per agent
- Session frequency and duration
- Peak usage hours
- Tool usage (which MCP tools are called)

### 3. Productivity Proxies
- Commits with agent assistance vs. without
- Time from agent session → commit
- Lines of code per session
- Files changed patterns

### 4. ROI Calculations
- Estimated time saved (based on commit velocity)
- Cost per commit
- License utilization (active vs. inactive users)

---

## 🏗️ Architecture

### Data Flow

```
Developer's Local Machine
  ├─► Claude Code → OpenTelemetry → OTel Collector → DuckDB
  ├─► Git Commits → Git Hook → CLI → API → DuckDB
  └─► Copilot (via API) → CLI → API → DuckDB

DuckDB (raw data)
  └─► dbt transformations (future)
        └─► Staging → Intermediate → Marts
              └─► Metabase Dashboard
```

### Tech Stack

**Data Collection:**
- Custom CLI (Node.js)
- OpenTelemetry for agent telemetry
- Git hooks for commit metadata
- GitHub API for Copilot metrics (future)

**Storage & Processing:**
- DuckDB (raw data - embedded, single file at `backend/data/agent_analytics.duckdb`)
- dbt (transformations - future)

**Visualization:**
- Metabase (recommended for MVP)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| `files/PROJECT_OVERVIEW.md` | Product vision, MVP scope, roadmap, success criteria |
| `files/TECHNICAL_SPEC.md` | Detailed architecture, schemas, data flows |
| `files/SETUP_GUIDE.md` | Step-by-step local development setup |
| `files/DBT_MODELS.md` | SQL for all dbt models (staging → marts) |
| `files/ACTION_PLAN.md` | Development roadmap and weekly tasks |
| `backend/README.md` | Backend services documentation |
| `backend/api/README.md` | API endpoint documentation |
| `cli/README.md` | CLI tool documentation |

**Start here:** Read `files/PROJECT_OVERVIEW.md` → `files/TECHNICAL_SPEC.md` → `files/SETUP_GUIDE.md`

---

## 🧪 Testing

### Test API

```bash
# Health check
curl http://localhost:3000/health

# Test commit ingestion
curl -X POST http://localhost:3000/v1/commits \
  -H "Authorization: Bearer dev_local_key" \
  -H "Content-Type: application/json" \
  -d '{
    "commit_hash": "test123",
    "commit_message": "test commit",
    "author_name": "Test User",
    "author_email": "test@example.com",
    "timestamp": '$(date +%s)',
    "developer_id": "dev_test"
  }'
```

### DuckDB Database Location

The DuckDB database file is located at:
- **Path:** `backend/data/agent_analytics.duckdb`
- **Backup:** Simply copy this file to backup your data
- **Benefits:** Single file database, faster analytics queries, no separate database server needed

### Test CLI

```bash
# Check version
agent-analytics --version

# Initialize (interactive)
agent-analytics init

# Test commit logging (debug mode)
DEBUG=1 agent-analytics log-commit \
  --hash test123 \
  --message "test" \
  --author "Test" \
  --email "test@example.com" \
  --timestamp $(date +%s)
```

---

## 🚧 Current Status

### ✅ Completed (MVP)
- [x] Docker Compose setup (OTel Collector, API, Metabase)
- [x] Database schema (DuckDB - raw tables, indexes)
- [x] REST API (commits and OTel endpoints)
- [x] CLI tool (init and log-commit commands)
- [x] Git hooks integration
- [x] Error handling and logging

### 🚧 In Progress / TODO
- [ ] dbt transformation models (staging → marts)
- [ ] Metabase dashboard setup
- [ ] Agent session correlation logic
- [ ] GitHub Copilot API integration
- [ ] Production deployment guide

---

## 🚧 Known Limitations (MVP)

**What This MVP Won't Do:**
- Real-time dashboards (5-minute batch latency)
- Code quality analysis (no static analysis)
- Developer effectiveness scoring (avoiding politics)
- Multi-tenancy (single-user or single-org)
- Mobile app (web only)

**Known Technical Debt:**
- Manual CLI installation (no auto-discovery)
- Timestamp-based commit correlation (not 100% accurate)
- No agent-specific git commit tagging yet
- Simplified OTel parsing (not full spec compliance)

---

## 📅 Roadmap

### Phase 1: MVP (Weeks 1-6) ← **YOU ARE HERE**
- [x] Project structure and documentation
- [x] CLI tool (init, git hooks, OTel config)
- [x] Backend (DuckDB, OTel Collector, API)
- [ ] dbt models (staging → marts)
- [ ] Basic Metabase dashboards
- [ ] Test with your own agent usage

### Phase 2: Beta (Weeks 7-10)
- [ ] Improved OTel parsing (full Claude Code support)
- [ ] GitHub Copilot API integration
- [ ] Cursor agent support (if possible)
- [ ] Advanced dbt models (cost forecasting, trends)
- [ ] Polished dashboards with drill-downs
- [ ] 5-10 beta users

### Phase 3: Launch (Weeks 11-12)
- [ ] Cloud deployment (AWS or DigitalOcean)
- [ ] User signup and API key management
- [ ] Dashboard embedding for self-service
- [ ] Documentation site (docs.agent-analytics.io)
- [ ] Launch on Product Hunt / Hacker News

---

## 🤝 Contributing

This is currently a solo project, but contributions welcome!

**How to Contribute:**
1. Read `files/PROJECT_OVERVIEW.md` to understand the vision
2. Pick a component to work on (CLI, API, dbt, dashboards)
3. Create a branch and submit a PR

**Good First Issues:**
- Add tests for CLI commands
- Implement dbt models
- Create Metabase dashboard templates
- Add support for more AI agents (Windsurf, etc.)

---

## 📝 License

MIT License - feel free to use this for commercial or personal projects.

---

## 🙏 Acknowledgments

**Built with:**
- OpenTelemetry (for agent telemetry)
- dbt (for data transformations)
- Metabase (for dashboards)
- Docker (for easy local dev)

**Inspired by:**
- Langfuse, Arize Phoenix (LLM observability platforms)
- GitHub Copilot Metrics Dashboard
- Azure AI Foundry best practices

---

## 🔥 Ready to Build?

Start here:
1. **Read** `files/PROJECT_OVERVIEW.md` (10 min)
2. **Setup** following `files/SETUP_GUIDE.md` (30 min)
3. **Use** Claude Code or Cursor to help implement each component
4. **Ship** MVP in 6 weeks!

Let's make AI tool spending transparent. 🚀

---

## 🎨 Visualization Showcase

In addition to the agent analytics platform, grapht includes a component library and data stories demonstrating beautiful data visualization.

### Component Library (`/frontend-v2`)
Reusable Svelte + D3 components for:
- Scrollytelling
- Choropleth maps
- Timeline visualizations
- Interactive charts

### Data Stories (`/data-stories`)
In-depth data journalism pieces:
- **Storm × Overdose**: Do opioid deaths spike after weather disasters?
- *(more coming)*

### Dataset Discovery (`/tools/dataset-discovery`)
A curated catalog of government datasets with AI-powered collision suggestions.

## 📖 Design System

See `/docs/design/` for:
- `DESIGN_PRINCIPLES.md` - Our visual philosophy
- `RESOURCES.md` - Curated design resources

