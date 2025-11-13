/**
 * Init Command
 * Initializes Agent Analytics in a project
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { readConfig, writeConfig, getDefaultConfig } = require('../lib/config');
const { checkHealth } = require('../lib/api');

/**
 * Setup git hooks
 */
function setupGitHooks() {
  const projectRoot = process.cwd();
  const gitDir = path.join(projectRoot, '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'post-commit');

  // Check if .git directory exists
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow('⚠️  No .git directory found. Skipping git hook installation.'));
    return false;
  }

  // Ensure hooks directory exists
  fs.ensureDirSync(hooksDir);

  // Read hook template
  const hookTemplate = `#!/bin/bash
# Agent Analytics post-commit hook
# This hook logs commit metadata to the Agent Analytics API

# Capture commit metadata
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_EMAIL=$(git log -1 --pretty=%ae)
COMMIT_TIMESTAMP=$(git log -1 --pretty=%ct)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l | tr -d ' ')
LINES_ADDED=$(git diff HEAD~1 HEAD --numstat 2>/dev/null | awk '{add+=$1} END {print add+0}')
LINES_DELETED=$(git diff HEAD~1 HEAD --numstat 2>/dev/null | awk '{del+=$2} END {print del+0}')

# Call CLI to log commit (run in background to not block git)
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

  // Write hook file
  fs.writeFileSync(hookPath, hookTemplate);
  fs.chmodSync(hookPath, '755');

  return true;
}

/**
 * Print OpenTelemetry environment variables for Claude Code
 * @param {Object} config - Configuration object
 */
function printClaudeCodeSetup(config) {
  console.log(chalk.cyan('\n📝 OpenTelemetry Configuration for Claude Code\n'));
  console.log(chalk.gray('Add these to your shell profile (~/.zshrc or ~/.bashrc):\n'));
  console.log(chalk.white('export CLAUDE_CODE_ENABLE_TELEMETRY=1'));
  console.log(chalk.white('export OTEL_METRICS_EXPORTER=otlp'));
  console.log(chalk.white('export OTEL_LOGS_EXPORTER=otlp'));
  console.log(chalk.white('export OTEL_EXPORTER_OTLP_PROTOCOL=grpc'));
  console.log(chalk.white(`export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`));
  console.log(chalk.white(`export OTEL_EXPORTER_OTLP_HEADERS="x-developer-id=${config.developer_id}"`));
  console.log(chalk.white('export OTEL_METRIC_EXPORT_INTERVAL=60000'));
  console.log(chalk.white('export OTEL_LOGS_EXPORT_INTERVAL=5000'));
  console.log(chalk.gray('\nThen reload your shell: source ~/.zshrc (or ~/.bashrc)\n'));
}

/**
 * Main init command handler
 * @param {Object} options - Command options
 */
async function init(options = {}) {
  console.log(chalk.cyan('\n🚀 Agent Analytics Platform Setup\n'));

  // Check if config already exists
  const existingConfig = readConfig();
  if (existingConfig && !options.force) {
    console.log(chalk.yellow('⚠️  Configuration already exists.'));
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it?',
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.gray('Setup cancelled.'));
      return;
    }
  }

  // Collect configuration via prompts (or use options)
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'api_key',
      message: 'Enter your API key:',
      default: options.apiKey || 'dev_local_key',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'API key is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'backend_url',
      message: 'Enter backend API URL:',
      default: options.backendUrl || 'http://localhost:3000',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Backend URL is required';
        }
        // Basic URL validation
        try {
          new URL(input);
          return true;
        } catch {
          return 'Invalid URL format';
        }
      }
    },
    {
      type: 'input',
      name: 'developer_id',
      message: 'Enter your developer ID (e.g., your email or username):',
      default: options.developerId || '',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Developer ID is required';
        }
        return true;
      }
    },
    {
      type: 'checkbox',
      name: 'enabled_agents',
      message: 'Which AI agents do you use? (select all that apply)',
      choices: [
        { name: 'Claude Code', value: 'claude_code', checked: true },
        { name: 'GitHub Copilot', value: 'github_copilot' },
        { name: 'Cursor', value: 'cursor' }
      ],
      validate: (input) => {
        if (input.length === 0) {
          return 'Select at least one agent';
        }
        return true;
      }
    }
  ]);

  // Build configuration object
  const config = {
    api_key: answers.api_key,
    backend_url: answers.backend_url,
    developer_id: answers.developer_id,
    enabled_agents: answers.enabled_agents,
    telemetry: {
      export_interval: 60,
      include_prompts: false
    },
    git: {
      track_commits: true,
      correlation_window: 300
    }
  };

  // Test API connection
  console.log(chalk.gray('\n🔍 Testing API connection...'));
  const isHealthy = await checkHealth(config.backend_url);
  
  if (!isHealthy) {
    console.log(chalk.yellow('⚠️  Could not connect to API. Make sure the backend is running.'));
    console.log(chalk.gray(`   URL: ${config.backend_url}`));
    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue anyway?',
        default: false
      }
    ]);
    
    if (!continueAnyway) {
      console.log(chalk.gray('Setup cancelled.'));
      return;
    }
  } else {
    console.log(chalk.green('✅ API connection successful!\n'));
  }

  // Save configuration
  if (writeConfig(config)) {
    console.log(chalk.green('✅ Configuration saved to ~/.agent-analytics/config.json\n'));
  } else {
    console.log(chalk.red('❌ Failed to save configuration.'));
    return;
  }

  // Setup git hooks
  if (config.git.track_commits) {
    if (setupGitHooks()) {
      console.log(chalk.green('✅ Git post-commit hook installed\n'));
    }
  }

  // Print OpenTelemetry setup instructions if Claude Code is enabled
  if (config.enabled_agents.includes('claude_code')) {
    printClaudeCodeSetup(config);
  }

  // Success message
  console.log(chalk.green('🎉 Setup complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('1. Configure your agents (see instructions above)'));
  console.log(chalk.gray('2. Start using your AI coding assistants'));
  console.log(chalk.gray('3. Make commits - they will be tracked automatically'));
  console.log(chalk.gray('4. Check the dashboard at http://localhost:3001\n'));
}

module.exports = init;

