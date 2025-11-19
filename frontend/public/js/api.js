// API client for Agent Analytics
const API_BASE = 'http://localhost:3000';
const API_KEY = 'dev_local_key';

class AgentAnalyticsAPI {
  constructor(baseUrl = API_BASE, apiKey = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Summary metrics
  async getSummary() {
    return this.request('/api/metrics/summary');
  }

  // Cost over time
  async getCostOverTime(days = 30) {
    return this.request(`/api/metrics/cost-over-time?days=${days}`);
  }

  // Token breakdown by agent
  async getTokenBreakdown() {
    return this.request('/api/metrics/token-breakdown');
  }

  // Agent comparison
  async getAgentComparison() {
    return this.request('/api/metrics/agent-comparison');
  }

  // Recent sessions
  async getRecentSessions(limit = 10) {
    return this.request(`/api/sessions/recent?limit=${limit}`);
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }
}

// Export singleton instance
const api = new AgentAnalyticsAPI();
