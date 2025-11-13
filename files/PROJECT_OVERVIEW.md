# Agent Analytics Platform - MVP Project Overview

## 🎯 Product Vision

**Problem:** Engineering teams are spending $20-50/dev/month on AI coding assistants (Copilot, Claude Code, Cursor, etc.) with zero visibility into ROI, usage patterns, or productivity impact.

**Solution:** A unified analytics dashboard that tracks token consumption, costs, and productivity metrics across multiple AI coding agents, enabling data-driven decisions about AI tool investments.

**Target Users:**
- CTOs and Engineering Managers (budget owners)
- Solo developers and small teams (5-20 engineers)
- DevOps/Platform teams responsible for tool evaluation

## 🎪 MVP Scope

### What We're Building (Week 1-6)

**Core Capabilities:**
1. **Multi-agent token tracking** - Claude Code, GitHub Copilot, Cursor, others
2. **Cost analytics** - Real-time spend tracking with forecasting
3. **Usage patterns** - Session frequency, duration, active users
4. **Git correlation** - Link agent sessions to commits (proxy for productivity)
5. **Dashboard** - 5 key views for executives and developers

### What We're NOT Building (Post-MVP)

- Code quality scoring (requires static analysis)
- Bug attribution (requires long-term tracking)
- Developer effectiveness ratings (too political)
- Real-time streaming (batch every 5 mins is fine)

## 🏗️ Technical Architecture

### Data Flow

```
┌─────────────────┐
│  Developer's    │
│   Local Dev     │
│   Environment   │
└────────┬────────┘
         │
         │ [Agent Analytics CLI installed]
         │
         ├─► Claude Code ──► OpenTelemetry ──┐
         │                                    │
         ├─► GitHub Copilot ──► API ─────────┤
         │                                    │
         └─► Git Hooks ──► Commit Metadata ──┤
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  Data Pipeline  │
                                    │    (DuckDB)     │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  dbt Transform  │
                                    │    (Models)     │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    Dashboard    │
                                    │ (Metabase/Graf) │
                                    └─────────────────┘
```

### Tech Stack

**Data Collection:**
- Custom CLI tool (Node.js/TypeScript)
- OpenTelemetry for agent telemetry
- Git hooks for commit metadata
- GitHub API for Copilot metrics

**Data Storage & Processing:**
- **DuckDB** (local) / **MotherDuck** (cloud) - raw data storage
  - Embedded database, single file at `backend/data/agent_analytics.duckdb`
  - Faster for analytics workloads than traditional databases
  - Can sync to MotherDuck for cloud deployment
- **dbt** - data transformation and modeling
- **Optional:** Airflow/Dagster for orchestration (not needed for MVP)

**Visualization:**
- **Metabase** (open-source, easy setup) OR
- **Grafana** (more powerful, steeper learning curve)
- Fallback: Tableau if you prefer

**Infrastructure:**
- Docker Compose for local development
- Cloud deployment options: AWS (EC2) or DigitalOcean (no separate database server needed)
- OpenTelemetry Collector for agent telemetry aggregation
- DuckDB embedded in API service (no separate database container)

## 📊 Data Models (dbt)

### Core Tables

**Staging Layer:**
```sql
-- Raw agent telemetry events
stg_agent_sessions
stg_agent_tool_calls
stg_agent_token_usage

-- Raw git data
stg_git_commits
stg_git_branches

-- Copilot API data
stg_copilot_metrics
```

**Intermediate Layer:**
```sql
-- Enriched sessions with cost calculations
int_agent_sessions_enriched

-- Commit-session correlation (via timestamp matching)
int_commits_with_agent_context
```

**Mart Layer (Reporting):**
```sql
-- Daily agent usage and costs by developer
fct_daily_agent_usage

-- Git commits flagged as agent-assisted or not
fct_git_commits

-- Agent comparison metrics (efficiency, adoption)
fct_agent_comparison

-- Cost rollups by team/agent/period
fct_agent_costs

-- Developer dimensions
dim_developers

-- Agent dimensions (Copilot, Claude Code, etc.)
dim_agents
```

## 🎨 Dashboard Views

### 1. Executive ROI Dashboard
**Audience:** CTOs, Engineering Directors

**Key Metrics:**
- Total monthly spend by agent
- Cost per commit (proxy for productivity)
- License utilization (active users vs. seats)
- Spend trend (MoM growth/decline)
- ROI calculation: `(Estimated time saved × avg hourly rate) - tool costs`

### 2. Agent Comparison
**Audience:** Platform teams

**Key Metrics:**
- Token efficiency (tokens per commit)
- Average session duration
- Adoption rate by agent
- Tool usage patterns (which MCP tools are popular)

### 3. Team Activity
**Audience:** Engineering managers

**Key Metrics:**
- Who's using which agents
- Usage trends over time (daily/weekly)
- Peak usage hours
- Inactive users (have license, not using it)

### 4. Git Integration View
**Audience:** DevOps, curious developers

**Key Metrics:**
- % of commits with agent assistance
- Average time from agent session → commit
- Commit frequency (agent-assisted vs. manual)
- File change patterns

### 5. Cost Tracking & Forecasting
**Audience:** Finance, CTOs

**Key Metrics:**
- Daily/weekly/monthly spend by agent
- Forecast next 30 days based on trends
- Per-developer costs
- Budget alerts (approaching limits)

## 🚀 MVP Development Roadmap

### Phase 1: Data Collection (Week 1-2)

**Deliverables:**
1. CLI tool that developers install: `npm install -g agent-analytics-cli`
2. Configuration wizard: `agent-analytics init`
3. OpenTelemetry exporter for Claude Code
4. Git hooks for commit metadata capture
5. GitHub API integration for Copilot metrics
6. Data ingestion endpoint (simple REST API writing to DuckDB)

**Developer Experience:**
```bash
# Install CLI globally
npm install -g agent-analytics-cli

# Initialize in project
cd ~/my-project
agent-analytics init --api-key=<your-key>

# CLI configures:
# - Claude Code OpenTelemetry exports
# - Git post-commit hooks
# - (Optional) Copilot API connection

# Done! Data starts flowing
```

### Phase 2: Data Pipeline (Week 3-4)

**Deliverables:**
1. DuckDB schema for raw data
2. OpenTelemetry Collector config (receives agent telemetry)
3. dbt project with core models:
   - Staging layer (raw → clean)
   - Intermediate layer (enrichment, correlation)
   - Mart layer (reporting-ready tables)
4. Automated tests (dbt tests on key models)
5. Documentation (dbt docs generate)

**dbt Models to Build:**
- `stg_agent_sessions` - Clean telemetry events
- `int_sessions_with_costs` - Add cost calculations
- `int_commits_with_agent_flag` - Correlate commits to sessions
- `fct_daily_agent_usage` - Daily rollups for dashboards
- `dim_agents` - Agent metadata

### Phase 3: Dashboard (Week 5-6)

**Deliverables:**
1. Metabase setup (or Grafana)
2. 5 core dashboard views (listed above)
3. Sample data loaded for demo
4. Dashboard templates exportable for new users
5. Embedding/sharing capabilities (if Metabase)

**Dashboard Stack:**
- **Option A (Recommended):** Metabase
  - Pros: Easy setup, great UX, built-in sharing
  - Cons: Less customizable than Grafana
  
- **Option B:** Grafana
  - Pros: Highly customizable, powerful
  - Cons: Steeper learning curve, requires more config

### Phase 4: Documentation & Polish (Week 6)

**Deliverables:**
1. README with quick start guide
2. Developer onboarding flow documentation
3. Data model ERD (entity relationship diagram)
4. Dashboard user guide (what each metric means)
5. Troubleshooting guide (CLI not working, data not flowing, etc.)

## 🧪 Testing with Your Own Data

**To validate the MVP, you'll instrument your own development:**

1. **Install your CLI on your machine**
2. **Configure it to track:**
   - Your Claude Code sessions
   - Your GitHub Copilot usage (if you have access to the API)
   - Your git commits
3. **Use agents normally for 1-2 weeks** (build dbt pipelines, write code, etc.)
4. **Review dashboards** - do the insights make sense?
5. **Iterate on metrics** based on what's actually useful

**Expected Data Volume (for you alone):**
- ~20-50 agent sessions per week
- ~50-100 commits per week
- ~500-1000 token usage events per week
- Total data: <1MB/week (very manageable)

## 📦 Deliverables After MVP

**What You'll Have:**
1. **Working CLI tool** - developers can install and start collecting data
2. **Data pipeline** - processes raw telemetry into analytics-ready tables
3. **5 dashboards** - ready to show potential customers
4. **Documentation** - setup guides, data dictionary, troubleshooting
5. **Your own usage data** - 2+ weeks of real data to demo with

**What You Can Demo:**
- "Here's my own AI tool usage over the past month"
- "I spent $X on Claude Code and got Y commits"
- "My token efficiency improved 20% after week 2"
- "This dashboard shows exactly where my AI budget is going"

## 🎯 Success Criteria

**MVP is successful if:**
1. ✅ You can install the CLI on your machine in <5 minutes
2. ✅ Agent telemetry flows to DuckDB without manual intervention
3. ✅ Git commits are correctly correlated with agent sessions
4. ✅ Dashboards load in <3 seconds with your data
5. ✅ Cost calculations are accurate (within 5% of actual API bills)
6. ✅ You can export/share a dashboard with someone else
7. ✅ 5 developer friends say "I would use this"

## 💰 Business Model (Post-MVP)

**Freemium SaaS:**
- **Free Tier:** Solo developer, local-only data, basic dashboards
- **Team Tier ($29/mo):** Up to 5 devs, cloud storage, advanced analytics
- **Organization Tier ($99/mo):** Unlimited devs, team management, SSO
- **Enterprise:** Custom pricing, on-prem, compliance features

**Key Revenue Drivers:**
- Saving orgs money on unused AI licenses (show them who's not using tools)
- Helping prove ROI to CFOs (justify AI tool budgets)
- Enabling data-driven decisions (which agent to standardize on)

## 🚧 Known Limitations & Constraints

**What This MVP Won't Do:**
1. **Real-time dashboards** - 5-minute batch latency is fine
2. **Code quality analysis** - no static analysis, no bug tracking
3. **Developer scoring** - avoid political/privacy issues
4. **Multi-tenancy** - single-user or single-team for MVP
5. **Mobile app** - web dashboard only

**Technical Debt We're Taking On:**
- CLI is Node.js only (no Python/Go versions yet)
- Manual CLI installation (no auto-discovery of agents)
- Timestamp-based commit correlation (not 100% accurate)
- No agent-specific tagging in git commits (future enhancement)

## 📚 Resources & References

**OpenTelemetry:**
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [Claude Code Monitoring Guide](https://docs.claude.com/en/docs/claude-code/monitoring-usage)

**GitHub APIs:**
- [Copilot Metrics API](https://docs.github.com/en/copilot/managing-copilot/managing-copilot-as-an-individual-subscriber/viewing-your-copilot-usage)
- [GitHub REST API](https://docs.github.com/en/rest)

**dbt:**
- [dbt Best Practices](https://docs.getdbt.com/best-practices)
- [dbt Project Structure](https://docs.getdbt.com/guides/best-practices/how-we-structure/1-guide-overview)

**Observability:**
- [Azure Agent Observability Best Practices](https://azure.microsoft.com/en-us/blog/agent-factory-top-5-agent-observability-best-practices-for-reliable-ai/)

---

## 🏁 Next Steps

**To start building:**
1. Review this overview with Claude Code/Cursor
2. Read the companion docs:
   - `TECHNICAL_SPEC.md` (detailed architecture)
   - `CLI_DESIGN.md` (CLI tool implementation plan)
   - `DBT_MODELS.md` (data modeling guide)
   - `DASHBOARD_SPEC.md` (dashboard requirements)
3. Set up local dev environment (see `SETUP_GUIDE.md`)
4. Start with Phase 1: Build the CLI tool

**Questions to Answer Before Starting:**
- [ ] DuckDB local or MotherDuck for cloud?
- [ ] Metabase or Grafana for dashboards?
- [ ] Self-hosted or cloud infrastructure?
- [ ] What agents do YOU currently use? (start with those)
