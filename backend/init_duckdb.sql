-- Agent Analytics Platform - DuckDB Schema
-- This file initializes all raw tables, schemas, and indexes for DuckDB

-- Create schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS intermediate;
CREATE SCHEMA IF NOT EXISTS mart;

-- ============================================================================
-- SEQUENCES for Auto-increment IDs
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS raw.otel_metrics_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS raw.otel_logs_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS raw.git_commits_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS raw.copilot_metrics_id_seq START 1;

-- ============================================================================
-- RAW TABLES - OpenTelemetry Data
-- ============================================================================

-- OTel Metrics table (from Claude Code and other OTel-compatible agents)
CREATE TABLE IF NOT EXISTS raw.otel_metrics (
    id INTEGER PRIMARY KEY DEFAULT nextval('raw.otel_metrics_id_seq'),
    timestamp TIMESTAMP NOT NULL,
    developer_id VARCHAR(255),
    metric_name VARCHAR(255),
    metric_value DOUBLE,
    attributes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTel Logs table (session events, tool calls, etc.)
CREATE TABLE IF NOT EXISTS raw.otel_logs (
    id INTEGER PRIMARY KEY DEFAULT nextval('raw.otel_logs_id_seq'),
    timestamp TIMESTAMP NOT NULL,
    developer_id VARCHAR(255),
    severity VARCHAR(50),
    body TEXT,
    attributes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RAW TABLES - Git Commits
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw.git_commits (
    id INTEGER PRIMARY KEY DEFAULT nextval('raw.git_commits_id_seq'),
    commit_hash VARCHAR(40) UNIQUE NOT NULL,
    commit_message TEXT,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    commit_timestamp TIMESTAMP NOT NULL,
    files_changed INTEGER,
    lines_added INTEGER,
    lines_deleted INTEGER,
    agent_assisted BOOLEAN DEFAULT FALSE,
    agent_session_id VARCHAR(255),
    agent_type VARCHAR(50),
    developer_id VARCHAR(255),
    project_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RAW TABLES - Agent Sessions (Manual Logging)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS raw.agent_sessions_id_seq START 1;

CREATE TABLE IF NOT EXISTS raw.agent_sessions (
    id INTEGER PRIMARY KEY DEFAULT nextval('raw.agent_sessions_id_seq'),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    developer_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(255),
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 4),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RAW TABLES - Copilot Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw.copilot_metrics (
    id INTEGER PRIMARY KEY DEFAULT nextval('raw.copilot_metrics_id_seq'),
    date DATE NOT NULL,
    developer_id VARCHAR(255),
    total_suggestions INTEGER,
    total_acceptances INTEGER,
    total_lines_suggested INTEGER,
    total_lines_accepted INTEGER,
    total_active_users INTEGER,
    language_breakdown JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, developer_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- OTel metrics indexes
CREATE INDEX IF NOT EXISTS idx_otel_metrics_developer_timestamp 
ON raw.otel_metrics(developer_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_otel_metrics_metric_name 
ON raw.otel_metrics(metric_name);

-- OTel logs indexes
CREATE INDEX IF NOT EXISTS idx_otel_logs_developer_timestamp 
ON raw.otel_logs(developer_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_otel_logs_severity 
ON raw.otel_logs(severity);

-- Git commits indexes
CREATE INDEX IF NOT EXISTS idx_git_commits_developer 
ON raw.git_commits(developer_id, commit_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_git_commits_agent_assisted 
ON raw.git_commits(agent_assisted, commit_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_git_commits_session_id 
ON raw.git_commits(agent_session_id);

CREATE INDEX IF NOT EXISTS idx_git_commits_project 
ON raw.git_commits(project_id, commit_timestamp DESC);

-- Agent sessions indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_developer 
ON raw.agent_sessions(developer_id, session_start DESC);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type 
ON raw.agent_sessions(agent_type, session_start DESC);

-- Copilot metrics indexes
CREATE INDEX IF NOT EXISTS idx_copilot_developer_date 
ON raw.copilot_metrics(developer_id, date DESC);

