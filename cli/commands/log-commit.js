/**
 * Log Commit Command
 * Logs a git commit to the Agent Analytics API
 * Called by git post-commit hook
 */

const chalk = require('chalk');
const { readConfig } = require('../lib/config');
const { sendCommit } = require('../lib/api');

/**
 * Main log-commit command handler
 * @param {Object} options - Command options
 */
async function logCommit(options) {
  try {
    // Read configuration
    const config = readConfig();
    
    if (!config) {
      console.error(chalk.red('❌ Configuration not found. Run "agent-analytics init" first.'));
      process.exit(1);
    }

    // Validate required options
    if (!options.hash) {
      console.error(chalk.red('❌ Commit hash is required'));
      process.exit(1);
    }

    if (!options.timestamp) {
      console.error(chalk.red('❌ Commit timestamp is required'));
      process.exit(1);
    }

    // Build commit data payload
    const commitData = {
      commit_hash: options.hash,
      commit_message: options.message || '',
      author_name: options.author || '',
      author_email: options.email || '',
      timestamp: parseInt(options.timestamp),
      files_changed: options.filesChanged || 0,
      lines_added: options.linesAdded || 0,
      lines_deleted: options.linesDeleted || 0,
      agent_assisted: false, // TODO: Check for recent agent session
      developer_id: config.developer_id,
      project_id: process.cwd() // Use current directory as project ID
    };

    // Send to API
    if (process.env.DEBUG) {
      console.log(chalk.gray(`📤 Logging commit: ${commitData.commit_hash.substring(0, 7)}`));
    }

    const response = await sendCommit(
      commitData,
      config.backend_url,
      config.api_key
    );

    if (process.env.DEBUG) {
      console.log(chalk.green(`✅ Commit logged: ${response.data?.commit_hash || commitData.commit_hash.substring(0, 7)}`));
    }

    // Exit successfully (don't print anything in non-debug mode to avoid git output)
    process.exit(0);

  } catch (error) {
    // Don't fail git commit if logging fails
    if (process.env.DEBUG) {
      console.error(chalk.red('❌ Error logging commit:'), error.message);
    }
    // Exit silently (don't block git commit)
    process.exit(0);
  }
}

module.exports = logCommit;

