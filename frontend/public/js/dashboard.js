// Main Dashboard Controller

let refreshInterval = null;

// Initialize dashboard
async function initDashboard() {
  console.log('Initializing Agent Analytics Dashboard...');
  
  try {
    // Check API health
    await api.checkHealth();
    console.log('✓ API connection successful');
    
    // Load initial data
    await refreshDashboard();
    
    // Auto-refresh every hour (3600000 ms) to avoid chart animation annoyance
    refreshInterval = setInterval(refreshDashboard, 3600000);
    
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showError('Failed to connect to API. Make sure the backend is running on port 3333.');
  }
}

// Refresh all dashboard data
async function refreshDashboard() {
  console.log('Refreshing dashboard data...');
  
  try {
    // Load all data in parallel
    const [summary, costData, tokenData, comparisonData, sessions, tempoData, varianceData, flowData, latencyData, toolData, tokenDistData] = await Promise.all([
      api.getSummary(),
      api.getCostOverTime(30),
      api.getTokenBreakdown(),
      api.getAgentComparison(),
      api.getRecentSessions(10),
      api.getTempoData(),
      api.getVarianceData(),
      api.getFlowData(),
      api.getLatencyPercentiles(),
      api.getToolUsage(),
      api.getTokenDistribution()
    ]);
    
    // Update summary cards
    updateSummaryCards(summary);
    
    // Render charts
    renderCostChart(costData, 'cost-chart');
    renderTokenChart(tokenData, 'token-chart');
    // renderComparisonChart(comparisonData, 'comparison-chart'); // Replaced by advanced views
    renderTempoChart(tempoData, 'tempo-chart');
    renderVarianceChart(varianceData, 'variance-chart');
    renderFlowChart(flowData, 'flow-chart');
    renderSessionsTable(sessions, 'sessions-table');

    // Render distribution analysis charts
    renderDistributions(tempoData, 'dist');

    // Render new insight charts (use varianceData which has model_name)
    renderModelEfficiencyChart(varianceData, 'model-efficiency-chart');
    renderProductivityScatter(tempoData, 'productivity-scatter');

    // Render Granular Span Charts
    renderLatencyChart(latencyData, 'latency-chart');
    renderToolUsageChart(toolData, 'tool-chart');
    renderTokenDistributionChart(tokenDistData, 'token-dist-chart');
    
    // Update timestamp
    document.getElementById('last-update').textContent = 
      `Last updated: ${new Date().toLocaleTimeString()}`;
    
    console.log('✓ Dashboard refreshed');
    
  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
    showError('Failed to load data. Check console for details.');
  }
}

// Update summary cards
function updateSummaryCards(summary) {
  if (!summary) return;
  
  // Total Cost
  document.getElementById('total-cost').textContent = 
    `$${summary.total_cost.toFixed(2)}`;
  
  // Total Tokens
  document.getElementById('total-tokens').textContent = 
    summary.total_tokens.toLocaleString();
  
  // Total Sessions
  document.getElementById('total-sessions').textContent = 
    summary.total_sessions;
  
  // Avg Cost per Session
  document.getElementById('avg-cost').textContent = 
    `$${summary.avg_cost_per_session.toFixed(3)}`;
}

// Show error message
function showError(message) {
  const dashboard = document.querySelector('.dashboard');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <h3>⚠️ Error</h3>
    <p>${message}</p>
  `;
  errorDiv.style.cssText = `
    background: #fed7d7;
    color: #742a2a;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    text-align: center;
  `;
  dashboard.insertBefore(errorDiv, dashboard.firstChild);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
