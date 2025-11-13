/**
 * API Client
 * Handles HTTP requests to the backend API
 */

const axios = require('axios');
const chalk = require('chalk');

/**
 * Create API client instance
 * @param {string} baseURL - Base URL for API
 * @param {string} apiKey - API key for authentication
 * @returns {Object} Axios instance
 */
function createClient(baseURL, apiKey) {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      if (process.env.DEBUG) {
        console.log(chalk.gray(`→ ${config.method.toUpperCase()} ${config.url}`));
      }
      return config;
    },
    (error) => {
      console.error(chalk.red('Request error:'), error.message);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      if (process.env.DEBUG) {
        console.log(chalk.gray(`← ${response.status} ${response.config.url}`));
      }
      return response;
    },
    (error) => {
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 401) {
          console.error(chalk.red('❌ Authentication failed. Check your API key.'));
        } else if (status === 400) {
          console.error(chalk.red(`❌ Bad request: ${message}`));
        } else if (status >= 500) {
          console.error(chalk.red(`❌ Server error: ${message}`));
        } else {
          console.error(chalk.red(`❌ Error: ${message}`));
        }
      } else if (error.request) {
        // Request made but no response
        console.error(chalk.red('❌ No response from server. Is the API running?'));
        console.error(chalk.gray(`   URL: ${error.config?.url}`));
      } else {
        // Error setting up request
        console.error(chalk.red(`❌ Request setup error: ${error.message}`));
      }
      
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Send commit data to API
 * @param {Object} commitData - Commit data object
 * @param {string} baseURL - API base URL
 * @param {string} apiKey - API key
 * @returns {Promise<Object>} API response
 */
async function sendCommit(commitData, baseURL, apiKey) {
  const client = createClient(baseURL, apiKey);
  
  try {
    const response = await client.post('/v1/commits', commitData);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check API health
 * @param {string} baseURL - API base URL
 * @returns {Promise<boolean>} True if healthy
 */
async function checkHealth(baseURL) {
  try {
    const client = axios.create({
      baseURL,
      timeout: 5000
    });
    
    const response = await client.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createClient,
  sendCommit,
  checkHealth
};

