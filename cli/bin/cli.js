#!/usr/bin/env node

/**
 * Agent Analytics CLI
 * Main entry point for CLI commands
 */

const { Command } = require('commander');
const initCommand = require('../commands/init');
const logCommitCommand = require('../commands/log-commit');
const logSessionCommand = require('../commands/log-session');

const program = new Command();

program
  .name('agent-analytics')
  .description('CLI tool for Agent Analytics Platform - Track AI coding assistant usage, costs, and productivity')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize Agent Analytics in this project')
  .option('--api-key <key>', 'API key for backend authentication')
  .option('--developer-id <id>', 'Developer ID (email or username)')
  .option('--backend-url <url>', 'Backend API URL', 'http://localhost:3000')
  .action(async (options) => {
    await initCommand(options);
  });

// Log commit command (called by git hook)
program
  .command('log-commit')
  .description('Log a git commit (called by post-commit hook)')
  .option('--hash <hash>', 'Commit hash')
  .option('--message <message>', 'Commit message')
  .option('--author <author>', 'Author name')
  .option('--email <email>', 'Author email')
  .option('--timestamp <timestamp>', 'Commit timestamp (Unix)')
  .option('--files-changed <n>', 'Number of files changed', parseInt)
  .option('--lines-added <n>', 'Lines added', parseInt)
  .option('--lines-deleted <n>', 'Lines deleted', parseInt)
  .action(async (options) => {
    await logCommitCommand(options);
  });

// Log session command (manually log agent sessions)
program
  .command('log-session')
  .description('Manually log an agent session (Droid, Cursor, etc.)')
  .option('--agent <type>', 'Agent type (factory_droid, cursor, claude_code, github_copilot)')
  .option('--model <name>', 'Model name (e.g., claude-sonnet-4.5)')
  .option('--input-tokens <count>', 'Input tokens used', parseInt)
  .option('--output-tokens <count>', 'Output tokens generated', parseInt)
  .option('--cache-creation-tokens <count>', 'Cache creation tokens', parseInt)
  .option('--cache-read-tokens <count>', 'Cache read tokens', parseInt)
  .option('--cost <amount>', 'Total cost in USD', parseFloat)
  .option('--start <iso-date>', 'Session start time (ISO 8601)')
  .option('--end <iso-date>', 'Session end time (ISO 8601)')
  .option('--session-id <id>', 'Custom session ID')
  .option('--developer-id <id>', 'Developer ID (overrides config)')
  .option('--metadata <json>', 'Additional metadata as JSON string')
  .action(async (options) => {
    await logSessionCommand(options);
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

