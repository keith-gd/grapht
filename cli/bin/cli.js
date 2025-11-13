#!/usr/bin/env node

/**
 * Agent Analytics CLI
 * Main entry point for CLI commands
 */

const { Command } = require('commander');
const initCommand = require('../commands/init');
const logCommitCommand = require('../commands/log-commit');

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

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

