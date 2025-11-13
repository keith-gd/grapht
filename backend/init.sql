-- Agent Analytics Platform - Database Schema
-- This file initializes all raw tables, schemas, and indexes

-- Create schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS intermediate;
CREATE SCHEMA IF NOT EXISTS mart;

-- ============================================================================
-- RAW TABLES - OpenTelemetry Data
-- ============================================================================

-- OTel Metrics table (from Claude Code and other OTel-compatible agents)
CREATE TABLE raw.otel_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    metric_name VARCHAR(255),
    metric_value DOUBLE PRECISION,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTel Logs table (session events, tool calls, etc.)
CREATE TABLE raw.otel_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    developer_id VARCHAR(255),
    severity VARCHAR(50),
    body TEXT,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RAW TABLES - Git Commits
-- ============================================================================

CREATE TABLE raw.git_commits (
    id BIGSERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RAW TABLES - Copilot Metrics
-- ============================================================================

CREATE TABLE raw.copilot_metrics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    developer_id VARCHAR(255),
    total_suggestions INTEGER,
    total_acceptances INTEGER,
    total_lines_suggested INTEGER,
    total_lines_accepted INTEGER,
    total_active_users INTEGER,
    language_breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, developer_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- OTel metrics indexes
CREATE INDEX idx_otel_metrics_developer_timestamp 
ON raw.otel_metrics(developer_id, timestamp DESC);

CREATE INDEX idx_otel_metrics_session_id 
ON raw.otel_metrics((attributes->>'session_id'));

CREATE INDEX idx_otel_metrics_metric_name 
ON raw.otel_metrics(metric_name);

-- OTel logs indexes
CREATE INDEX idx_otel_logs_developer_timestamp 
ON raw.otel_logs(developer_id, timestamp DESC);

CREATE INDEX idx_otel_logs_session_id 
ON raw.otel_logs((attributes->>'session_id'));

CREATE INDEX idx_otel_logs_severity 
ON raw.otel_logs(severity);

-- Git commits indexes
CREATE INDEX idx_git_commits_developer 
ON raw.git_commits(developer_id, commit_timestamp DESC);

CREATE INDEX idx_git_commits_agent_assisted 
ON raw.git_commits(agent_assisted, commit_timestamp DESC);

CREATE INDEX idx_git_commits_session_id 
ON raw.git_commits(agent_session_id) 
WHERE agent_session_id IS NOT NULL;

CREATE INDEX idx_git_commits_project 
ON raw.git_commits(project_id, commit_timestamp DESC);

-- Copilot metrics indexes
CREATE INDEX idx_copilot_developer_date 
ON raw.copilot_metrics(developer_id, date DESC);

-- ============================================================================
-- Create Metabase Database (for Metabase's own metadata)
-- ============================================================================

CREATE DATABASE metabase;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT ALL PRIVILEGES ON SCHEMA raw TO dev_user;
GRANT ALL PRIVILEGES ON SCHEMA staging TO dev_user;
GRANT ALL PRIVILEGES ON SCHEMA intermediate TO dev_user;
GRANT ALL PRIVILEGES ON SCHEMA mart TO dev_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA raw TO dev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA raw TO dev_user;
