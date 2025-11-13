/**
 * Configuration Management
 * Handles reading and writing CLI configuration
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.agent-analytics');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get configuration file path
 */
function getConfigPath() {
  return CONFIG_FILE;
}

/**
 * Read configuration from file
 * @returns {Object|null} Configuration object or null if not found
 */
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
    return null;
  } catch (error) {
    console.error('Error reading config:', error.message);
    return null;
  }
}

/**
 * Write configuration to file
 * @param {Object} config - Configuration object
 */
function writeConfig(config) {
  try {
    // Ensure config directory exists
    fs.ensureDirSync(CONFIG_DIR);
    
    // Write config file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    // Set appropriate permissions (read/write for user only)
    fs.chmodSync(CONFIG_FILE, 0o600);
    
    return true;
  } catch (error) {
    console.error('Error writing config:', error.message);
    return false;
  }
}

/**
 * Check if configuration exists
 * @returns {boolean}
 */
function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Get default configuration template
 * @returns {Object}
 */
function getDefaultConfig() {
  return {
    api_key: '',
    backend_url: 'http://localhost:3000',
    developer_id: '',
    enabled_agents: [],
    telemetry: {
      export_interval: 60,
      include_prompts: false
    },
    git: {
      track_commits: true,
      correlation_window: 300
    }
  };
}

module.exports = {
  readConfig,
  writeConfig,
  configExists,
  getDefaultConfig,
  getConfigPath,
  CONFIG_DIR,
  CONFIG_FILE
};

