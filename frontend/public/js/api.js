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

  // Analytics: Session Tempo
  async getTempoData() {
    return this.request('/api/analytics/tempo');
  }

  // Analytics: Cost Variance
  async getVarianceData() {
    return this.request('/api/analytics/variance');
  }

  // Analytics: Session Flow
  async getFlowData() {
    return this.request('/api/analytics/flow');
  }

  // Spans: Recent Spans
  async getSpans(limit = 100) {
    return this.request(`/api/analytics/spans?limit=${limit}`);
  }

  // Spans: Token Distribution
  async getTokenDistribution() {
    return this.request('/api/analytics/tokens/distribution');
  }

  // Spans: Latency Percentiles
  async getLatencyPercentiles() {
    return this.request('/api/analytics/latency/percentiles');
  }

  // Spans: Tool Usage
  async getToolUsage() {
    return this.request('/api/analytics/tools/usage');
  }

  // Spans: Cost Breakdown
  async getCostBreakdown() {
    return this.request('/api/analytics/cost/breakdown');
  }

  // Advanced: Cost Timeseries (Heatmap)
  async getCostTimeseries(days = 90) {
    return this.request(`/api/analytics/timeseries/cost?days=${days}`);
  }

  // Advanced: Tool Chains
  async getToolChains() {
    return this.request('/api/analytics/tools/chains');
  }

  // Advanced: Trace Detail
  async getTrace(traceId) {
    return this.request(`/api/analytics/traces/${traceId}`);
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }

  // Advanced Metrics
  // async getTimeline(days = 30) {
  //   return this.request(`/api/metrics/timeline?days=${days}`);
  // }

  // async getScatter(days = 30) {
  //   return this.request(`/api/metrics/scatter?days=${days}`);
  // }

  // async getFlow(days = 30) {
  //   return this.request(`/api/metrics/flow?days=${days}`);
  // }
}

// Export singleton instance
const api = new AgentAnalyticsAPI();
