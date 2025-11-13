# Agent Analytics CLI

Command-line tool for tracking AI coding assistant usage, costs, and productivity.

## Installation

### Global Installation (Recommended)

```bash
cd cli
npm install
npm link  # Makes 'agent-analytics' available globally
```

### Verify Installation

```bash
agent-analytics --version
```

## Commands

### init

Initialize Agent Analytics in your project.

```bash
agent-analytics init
```

**What it does:**
1. Prompts for API key, developer ID, and agent preferences
2. Saves configuration to `~/.agent-analytics/config.json`
3. Installs git post-commit hook in `.git/hooks/post-commit`
4. Prints OpenTelemetry configuration for Claude Code

**Options:**
- `--api-key <key>` - Pre-set API key (skips prompt)
- `--developer-id <id>` - Pre-set developer ID (skips prompt)
- `--backend-url <url>` - Backend API URL (default: http://localhost:3000)

**Example:**
```bash
agent-analytics init --api-key dev_local_key --developer-id dev_john
```

### log-commit

Log a git commit to the Agent Analytics API. This command is typically called automatically by the git post-commit hook.

```bash
agent-analytics log-commit \
  --hash <commit-hash> \
  --message <commit-message> \
  --author <author-name> \
  --email <author-email> \
  --timestamp <unix-timestamp> \
  --files-changed <n> \
  --lines-added <n> \
  --lines-deleted <n>
```

**Options:**
- `--hash` - Commit hash (required)
- `--message` - Commit message
- `--author` - Author name
- `--email` - Author email
- `--timestamp` - Unix timestamp (required)
- `--files-changed` - Number of files changed
- `--lines-added` - Lines added
- `--lines-deleted` - Lines deleted

**Note:** This command runs silently (no output) unless `DEBUG=1` is set, to avoid interfering with git output.

## Configuration

Configuration is stored in `~/.agent-analytics/config.json`:

```json
{
  "api_key": "dev_local_key",
  "backend_url": "http://localhost:3000",
  "developer_id": "dev_john",
  "enabled_agents": ["claude_code", "github_copilot"],
  "telemetry": {
    "export_interval": 60,
    "include_prompts": false
  },
  "git": {
    "track_commits": true,
    "correlation_window": 300
  }
}
```

## Git Hooks

The CLI automatically installs a post-commit hook that logs all commits to the API.

**Hook location:** `.git/hooks/post-commit`

**Manual installation:**
```bash
# Copy template
cp cli/templates/post-commit.sh .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

## OpenTelemetry Configuration

For Claude Code, add these environment variables to your shell profile:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_HEADERS="x-developer-id=<your-developer-id>"
export OTEL_METRIC_EXPORT_INTERVAL=60000
export OTEL_LOGS_EXPORT_INTERVAL=5000
```

Then reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

## Usage Workflow

1. **Initialize in your project:**
   ```bash
   cd ~/my-project
   agent-analytics init
   ```

2. **Configure Claude Code** (if using):
   - Add OTel env vars to shell profile (see above)
   - Reload shell

3. **Use your AI coding assistants normally:**
   - Claude Code will send telemetry automatically
   - Make commits as usual

4. **Commits are tracked automatically:**
   - Git hook logs each commit
   - No manual steps required

5. **View data in dashboard:**
   - Open http://localhost:3001
   - Connect to database (see backend/README.md)

## Troubleshooting

### CLI command not found

```bash
# Reinstall globally
cd cli
npm unlink
npm link
```

### Git hook not working

```bash
# Check hook exists and is executable
ls -la .git/hooks/post-commit
chmod +x .git/hooks/post-commit

# Test manually
.git/hooks/post-commit
```

### API connection errors

```bash
# Check backend is running
curl http://localhost:3000/health

# Check configuration
cat ~/.agent-analytics/config.json

# Test with debug mode
DEBUG=1 agent-analytics log-commit --hash test --timestamp $(date +%s)
```

### Configuration issues

```bash
# View current config
cat ~/.agent-analytics/config.json

# Reinitialize
agent-analytics init
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run CLI directly
node bin/cli.js init

# Or use npm link for global access
npm link
```

### Debug Mode

Set `DEBUG=1` to see detailed output:

```bash
DEBUG=1 agent-analytics log-commit --hash abc123 --timestamp 1699632000
```

## API Integration

The CLI communicates with the backend API at `/v1/commits`:

- **Authentication:** Bearer token via `Authorization` header
- **Content-Type:** `application/json`
- **Error Handling:** Silent failures (doesn't block git operations)

See `../backend/api/README.md` for API documentation.

## Limitations (MVP)

1. **Agent Session Correlation:** Not yet implemented (all commits marked as `agent_assisted: false`)
2. **Error Handling:** Fails silently to avoid blocking git operations
3. **Rate Limiting:** Not implemented
4. **Offline Mode:** Not supported (requires API connection)

## Next Steps

- Add agent session detection and correlation
- Implement offline queue for commits
- Add support for more git hooks (pre-commit, post-merge)
- Add CLI commands for viewing local stats
- Add support for GitHub Copilot API integration

