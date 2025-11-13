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

## 📁 Project Structure

```
agent-analytics/
├── README.md                    # This file
├── docs/
│   ├── PROJECT_OVERVIEW.md      # High-level vision and roadmap
│   ├── TECHNICAL_SPEC.md        # Detailed architecture
│   ├── SETUP_GUIDE.md           # Step-by-step local dev setup
│   ├── DBT_MODELS.md            # dbt transformation SQL
│   └── DASHBOARD_SPEC.md        # Dashboard layouts and queries
├── cli/                         # Node.js CLI tool
│   ├── package.json
│   ├── bin/cli.js
│   └── README.md
├── backend/                     # Docker Compose services
│   ├── docker-compose.yml       # Postgres, OTel Collector, API, Metabase
│   ├── init.sql                 # Database schema
│   ├── otel-collector-config.yaml
│   └── api/                     # Express.js REST API
│       ├── package.json
│       ├── index.js
│       └── Dockerfile
├── dbt/                         # dbt transformation project
│   └── agent_analytics/
│       ├── dbt_project.yml
│       ├── models/
│       │   ├── staging/         # Clean raw data
│       │   ├── intermediate/    # Enrichment and correlation
│       │   └── marts/           # Analytics-ready tables
│       └── tests/
└── dashboards/                  # Dashboard configs
    ├── metabase/
    └── grafana/
```

---

## 🚀 Quick Start (30 minutes)

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.8+ (for dbt)
- Git

### Step 1: Clone and Setup

```bash
# Clone repo (or create from scratch)
git clone <your-repo>
cd agent-analytics

# Start backend services
cd backend
docker-compose up -d

# Wait for services to be healthy (~30 seconds)
docker-compose ps
```

### Step 2: Install CLI

```bash
cd ../cli
npm install
npm link  # Makes 'agent-analytics' available globally
```

### Step 3: Initialize in Your Project

```bash
cd ~/your-dev-project
agent-analytics init

# Follow prompts:
# - Enter API key (use "dev_local_key" for local testing)
# - Enter developer ID (your email or username)
# - Select which agents you use

# CLI will:
# ✅ Create ~/.agent-analytics/config.json
# ✅ Install git post-commit hook
# ✅ Print OpenTelemetry env vars for Claude Code
```

### Step 4: Configure Claude Code

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

Then reload:
```bash
source ~/.zshrc
```

### Step 5: Setup dbt

```bash
# Install dbt
pip install dbt-postgres

# Initialize dbt project
cd ../dbt
dbt init agent_analytics
cd agent_analytics

# Configure connection (edit ~/.dbt/profiles.yml)
# See SETUP_GUIDE.md for details

# Test connection
dbt debug

# Run transformations
dbt run
```

### Step 6: Access Dashboard

Open Metabase: http://localhost:3001

**First-time setup:**
1. Create admin account
2. Connect to database:
   - Type: PostgreSQL
   - Host: `postgres`
   - Port: `5432`
   - Database: `agent_analytics`
   - Username: `dev_user`
   - Password: `dev_password`
3. Start exploring data!

---

## 🧪 Generate Test Data

Want to see the dashboard in action without waiting for real agent usage?

```bash
cd backend
psql -h localhost -U dev_user -d agent_analytics -f test_data.sql

# Then run dbt
cd ../dbt/agent_analytics
dbt run
```

Check Metabase - you should now see data in the `mart` schema tables.

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
  ├─► Claude Code → OpenTelemetry → OTel Collector → Postgres
  ├─► Git Commits → Git Hook → CLI → API → Postgres
  └─► Copilot (via API) → CLI → API → Postgres

Postgres (raw data)
  └─► dbt transformations
        └─► Staging → Intermediate → Marts
              └─► Metabase Dashboard
```

### Tech Stack

**Data Collection:**
- Custom CLI (Node.js)
- OpenTelemetry for agent telemetry
- Git hooks for commit metadata
- GitHub API for Copilot metrics

**Storage & Processing:**
- PostgreSQL (raw data)
- dbt (transformations)

**Visualization:**
- Metabase (recommended for MVP)
- OR Grafana (more advanced)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| `PROJECT_OVERVIEW.md` | Product vision, MVP scope, roadmap, success criteria |
| `TECHNICAL_SPEC.md` | Detailed architecture, schemas, data flows |
| `SETUP_GUIDE.md` | Step-by-step local development setup |
| `DBT_MODELS.md` | SQL for all dbt models (staging → marts) |
| `DASHBOARD_SPEC.md` | Dashboard layouts, queries, and metrics |

**Start here:** Read `PROJECT_OVERVIEW.md` → `TECHNICAL_SPEC.md` → `SETUP_GUIDE.md`

---

## 🛠️ Development Workflow

### Daily Development

```bash
# Start backend services
cd backend && docker-compose up -d

# Make CLI changes
cd cli
npm run dev

# Make API changes
cd backend/api
npm run dev  # (or restart docker-compose)

# Make dbt changes
cd dbt/agent_analytics
dbt run --models <model_name>

# View dashboard
open http://localhost:3001
```

### Testing Changes

```bash
# Test CLI
cd cli
npm test

# Test dbt models
cd dbt/agent_analytics
dbt test

# Test API
cd backend/api
npm test
```

### Database Migrations

```bash
# Connect to Postgres
psql -h localhost -U dev_user -d agent_analytics

# Or use a migration tool (e.g., Flyway, Alembic)
# For MVP, manual SQL migrations in backend/init.sql are fine
```

---

## 🎨 Using with Cursor / Claude Code

This project is designed to be built collaboratively with AI coding assistants.

### Example Prompts for Cursor

**Start a coding session:**
```
I want to implement the CLI initialization command.
Read docs/TECHNICAL_SPEC.md section 1.1 and implement
the config wizard using inquirer.js. Follow the exact
config schema specified.
```

**Build a dbt model:**
```
I need to create the fct_daily_agent_usage model.
Read docs/DBT_MODELS.md and implement the SQL for this model.
Include proper comments and tests.
```

**Create a dashboard:**
```
Build a Metabase dashboard query for the "ROI Dashboard" view.
Use the spec from docs/DASHBOARD_SPEC.md section 1.
Return the SQL query and visualization config.
```

### Example Prompts for Claude Code (Terminal)

```bash
# In your project directory
claude

# Then in Claude Code session:
# "Read SETUP_GUIDE.md and help me set up the backend services"
# "I'm getting an error in docker-compose, help debug"
# "Create a test script that inserts fake agent session data"
```

---

## 🚧 Current Limitations (MVP)

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
- [ ] CLI tool (init, git hooks, OTel config)
- [ ] Backend (Postgres, OTel Collector, API)
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

This is currently a solo project (Keith's side project), but contributions welcome!

**How to Contribute:**
1. Read `PROJECT_OVERVIEW.md` to understand the vision
2. Pick a component to work on (CLI, API, dbt, dashboards)
3. Create a branch and submit a PR
4. Tag @keith in the PR description

**Good First Issues:**
- Add tests for CLI commands
- Implement additional dbt models
- Create Grafana dashboard templates
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

**Special thanks:**
- Claude (Anthropic) for helping build this with me 😄

---

## 📧 Contact

**Keith** - Director of Data Analytics @ Green Dot
- LinkedIn: [your-linkedin]
- Email: [your-email]
- Twitter: [@your-handle]

**Questions?** Open an issue or start a discussion!

---

## 🔥 Ready to Build?

Start here:
1. **Read** `docs/PROJECT_OVERVIEW.md` (10 min)
2. **Setup** following `docs/SETUP_GUIDE.md` (30 min)
3. **Use** Claude Code or Cursor to help implement each component
4. **Ship** MVP in 6 weeks!

Let's make AI tool spending transparent. 🚀
