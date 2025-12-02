// D3 Chart Components - Precise & Weighty Design
// Following Design Principles: instrument-like, no purple, high contrast

// Accessibility: Check reduced motion preference
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = {
  // Primary palette (no purple!)
  primary: '#3b82f6',    // Blue
  secondary: '#22c55e',  // Green
  tertiary: '#f59e0b',   // Amber
  quaternary: '#ef4444', // Red

  // Background system
  background: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#2a2a2a',

  // Text
  text: '#f5f5f5',
  textSecondary: '#a0a0a0',

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Agent-specific colors
  agents: {
    claude_code: '#3b82f6',
    cursor: '#22c55e',
    copilot: '#f59e0b',
    factory_droid: '#ef4444'
  },

  // Accent (use sparingly)
  highlight: '#fbbf24',

  // Legacy compatibility
  grid: 'rgba(255, 255, 255, 0.08)',
  tooltipBg: 'rgba(15, 15, 15, 0.95)'
};

// Weighted transition timings (feel like precision instruments)
const TIMING = {
  fast: REDUCED_MOTION ? 0 : 100,
  normal: REDUCED_MOTION ? 0 : 200,
  slow: REDUCED_MOTION ? 0 : 300,
  gauge: REDUCED_MOTION ? 0 : 600,  // Analog gauge needle behavior
  easeOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',      // Overshoot for buttons
  easeGauge: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' // Needle inertia
};

// Common chart setup
function setupChart(containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();
  
  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = rect.width - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;
  
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
  return { svg, width, height, margin };
}

// --- Distribution Charts for Analysis ---

// Generic histogram renderer
function renderDistributionChart(values, containerId, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!values || values.length === 0) {
    container.html('<div class="empty-state"><p>No data</p></div>');
    return;
  }

  const {
    label = 'Value',
    format = d => d.toFixed(2),
    color = COLORS.primary,
    bins = 20
  } = options;

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = rect.width - margin.left - margin.right;
  const height = 150 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Create histogram
  const x = d3.scaleLinear()
    .domain([0, d3.max(values) * 1.05])
    .range([0, width]);

  const histogram = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(bins));

  const binsData = histogram(values);

  const y = d3.scaleLinear()
    .domain([0, d3.max(binsData, d => d.length)])
    .range([height, 0]);

  // Draw bars
  svg.selectAll('rect')
    .data(binsData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.x0) + 1)
    .attr('y', d => y(d.length))
    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr('height', d => height - y(d.length))
    .attr('fill', color)
    .attr('opacity', 0.8)
    .attr('rx', 1)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1);
      showTooltip(event, `
        <strong>${format(d.x0)} - ${format(d.x1)}</strong><br>
        Count: ${d.length}
      `);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.8);
      hideTooltip();
    });

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(format))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '11px');
  svg.select('.domain').remove();

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(3))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '11px');
  svg.selectAll('.domain').remove();

  // Label
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '12px')
    .text(label);

  // Stats
  const mean = d3.mean(values);
  const median = d3.median(values);
  svg.append('text')
    .attr('x', width)
    .attr('y', -5)
    .attr('text-anchor', 'end')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text(`μ=${format(mean)} | med=${format(median)}`);
}

// Render all three distribution charts
function renderDistributions(data, containerPrefix) {
  if (!data || data.length === 0) return;

  // Cost distribution
  const costs = data.map(d => d.total_cost || 0).filter(d => d > 0);
  renderDistributionChart(costs, `${containerPrefix}-cost`, {
    label: 'Cost ($)',
    format: d => `$${d.toFixed(2)}`,
    color: COLORS.quaternary  // Red for cost/money
  });

  // Duration distribution
  const durations = data.map(d => {
    if (d.session_start && d.session_end) {
      return (new Date(d.session_end) - new Date(d.session_start)) / 60000;
    }
    return d.duration_minutes || 0;
  }).filter(d => d > 0 && d < 500); // Filter extreme outliers

  renderDistributionChart(durations, `${containerPrefix}-duration`, {
    label: 'Duration (min)',
    format: d => `${d.toFixed(0)}m`,
    color: COLORS.primary  // Blue for time
  });

  // Output/Input Ratio (verbosity)
  const ratios = data.map(d => {
    const inp = d.input_tokens || 0;
    const out = d.output_tokens || 0;
    return inp > 0 ? out / inp : 0;
  }).filter(d => d > 0 && d < 10);

  renderDistributionChart(ratios, `${containerPrefix}-efficiency`, {
    label: 'Output/Input Ratio',
    format: d => d.toFixed(2),
    color: COLORS.secondary,  // Green for efficiency
    bins: 15
  });
}

// --- Model Cost Efficiency Chart ---
function renderModelEfficiencyChart(data, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!data || data.length === 0) {
    container.html('<div class="empty-state"><p>No data</p></div>');
    return;
  }

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const width = rect.width - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Aggregate by model
  const models = {};
  data.forEach(d => {
    const m = d.model_name || 'unknown';
    if (!models[m]) models[m] = { cost: 0, tokens: 0, count: 0 };
    models[m].cost += d.total_cost || 0;
    models[m].tokens += (d.input_tokens || 0) + (d.output_tokens || 0);
    models[m].count++;
  });

  const modelData = Object.entries(models)
    .map(([name, v]) => ({
      name: name.replace('claude-', '').replace('-20240', '').replace('-20241', ''),
      costPer1k: v.tokens > 0 ? (v.cost / v.tokens * 1000) : 0,
      count: v.count
    }))
    .filter(d => d.costPer1k > 0)
    .sort((a, b) => a.costPer1k - b.costPer1k);

  if (modelData.length === 0) {
    container.html('<div class="empty-state"><p>No model data</p></div>');
    return;
  }

  const x = d3.scaleBand()
    .domain(modelData.map(d => d.name))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(modelData, d => d.costPer1k) * 1.1])
    .range([height, 0]);

  // Bars
  svg.selectAll('rect')
    .data(modelData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.name))
    .attr('y', d => y(d.costPer1k))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.costPer1k))
    .attr('fill', '#10b981')
    .attr('rx', 3)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill', '#34d399');
      showTooltip(event, `<strong>${d.name}</strong><br>$${d.costPer1k.toFixed(4)}/1k tokens<br>${d.count} sessions`);
    })
    .on('mouseout', function() {
      d3.select(this).attr('fill', '#10b981');
      hideTooltip();
    });

  // Value labels on bars
  svg.selectAll('.bar-label')
    .data(modelData)
    .enter()
    .append('text')
    .attr('x', d => x(d.name) + x.bandwidth() / 2)
    .attr('y', d => y(d.costPer1k) - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '10px')
    .text(d => `$${d.costPer1k.toFixed(3)}`);

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '10px')
    .attr('transform', 'rotate(-20)')
    .attr('text-anchor', 'end');

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => `$${d.toFixed(3)}`))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '11px');

  svg.selectAll('.domain').remove();
}

// --- Productivity Scatter (tokens/min vs cost) ---
function renderProductivityScatter(data, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!data || data.length === 0) {
    container.html('<div class="empty-state"><p>No data</p></div>');
    return;
  }

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 100, bottom: 50, left: 60 };
  const width = rect.width - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Calculate tokens/min for each session
  const scatterData = data.map(d => {
    const tokens = (d.input_tokens || 0) + (d.output_tokens || 0);
    let duration;
    if (d.session_start && d.session_end) {
      duration = (new Date(d.session_end) - new Date(d.session_start)) / 60000;
    } else {
      duration = d.duration_minutes || 1;
    }
    return {
      tokensPerMin: duration > 0 ? tokens / duration : 0,
      cost: d.total_cost || 0,
      agent: d.agent_type || 'unknown',
      tokens
    };
  }).filter(d => d.tokensPerMin > 0 && d.tokensPerMin < 5000 && d.cost > 0);

  const colorMap = COLORS.agents;

  const x = d3.scaleLinear()
    .domain([0, d3.max(scatterData, d => d.tokensPerMin) * 1.1])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(scatterData, d => d.cost) * 1.1])
    .range([height, 0]);

  // Grid
  addGrid(svg, width, height, y);

  // Points
  svg.selectAll('circle')
    .data(scatterData)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.tokensPerMin))
    .attr('cy', d => y(d.cost))
    .attr('r', 5)
    .attr('fill', d => colorMap[d.agent] || COLORS.primary)
    .attr('opacity', 0.7)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 8).attr('opacity', 1);
      showTooltip(event, `
        <strong>${d.agent}</strong><br>
        ${d.tokensPerMin.toFixed(0)} tokens/min<br>
        $${d.cost.toFixed(3)}
      `);
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 5).attr('opacity', 0.7);
      hideTooltip();
    });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d >= 1000 ? `${d/1000}k` : d))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '11px');

  svg.append('g')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => `$${d.toFixed(2)}`))
    .attr('color', COLORS.text)
    .selectAll('text')
    .style('font-size', '11px');

  svg.selectAll('.domain').remove();

  // Axis labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('Tokens/min');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -45)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('Cost ($)');

  // Legend
  const agents = [...new Set(scatterData.map(d => d.agent))];
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 10}, 10)`);

  agents.forEach((agent, i) => {
    const g = legend.append('g')
      .attr('transform', `translate(0, ${i * 18})`);

    g.append('circle')
      .attr('r', 4)
      .attr('fill', colorMap[agent] || COLORS.primary);

    g.append('text')
      .attr('x', 8)
      .attr('y', 4)
      .attr('fill', COLORS.text)
      .style('font-size', '10px')
      .text(agent.replace('_', ' '));
  });
}

// --- 1. Session Tempo / Rhythm Chart ---
// GitHub-style contribution heatmap
function renderTempoChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);

  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 30, bottom: 30, left: 40 };
  const width = rect.width - margin.left - margin.right;
  const height = 140 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // GitHub-style: aggregate by date (last 30 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create date map for last 30 days
  const dateMap = new Map();
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dateMap.set(key, { date, count: 0, cost: 0, tokens: 0 });
  }

  // Aggregate sessions by date
  data.forEach(d => {
    const date = new Date(d.session_start);
    const key = date.toISOString().split('T')[0];
    if (dateMap.has(key)) {
      const entry = dateMap.get(key);
      entry.count++;
      entry.cost += d.total_cost || 0;
      entry.tokens += (d.input_tokens || 0) + (d.output_tokens || 0);
    }
  });

  const heatmapData = Array.from(dateMap.values());

  // GitHub green color scale
  const maxCount = d3.max(heatmapData, d => d.count) || 1;
  const colorScale = d3.scaleQuantize()
    .domain([0, maxCount])
    .range(['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']);

  // Calculate cell size based on container
  const cellSize = Math.min(12, (width - 20) / 30);
  const cellPadding = 2;

  // Group by week (columns)
  const weeks = [];
  let currentWeek = [];
  heatmapData.forEach((d, i) => {
    const dayOfWeek = d.date.getDay();
    if (i > 0 && dayOfWeek === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push({ ...d, dayOfWeek });
  });
  if (currentWeek.length) weeks.push(currentWeek);

  // Draw cells
  weeks.forEach((week, weekIndex) => {
    week.forEach(d => {
      svg.append('rect')
        .attr('x', weekIndex * (cellSize + cellPadding))
        .attr('y', d.dayOfWeek * (cellSize + cellPadding))
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', d.count === 0 ? '#161b22' : colorScale(d.count))
        .attr('rx', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
          const dateStr = d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          showTooltip(event, `
            <strong>${dateStr}</strong><br>
            ${d.count} session${d.count !== 1 ? 's' : ''}<br>
            $${d.cost.toFixed(2)} • ${d.tokens.toLocaleString()} tokens
          `);
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke', 'none');
          hideTooltip();
        });
    });
  });

  // Day labels (Mon, Wed, Fri)
  [1, 3, 5].forEach(day => {
    svg.append('text')
      .attr('x', -8)
      .attr('y', day * (cellSize + cellPadding) + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', COLORS.text)
      .style('font-size', '11px')
      .text(days[day].substring(0, 3));
  });

  // Legend
  const legendX = width - 100;
  svg.append('text')
    .attr('x', legendX - 8)
    .attr('y', height + 18)
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('Less');

  const legendColors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
  legendColors.forEach((color, i) => {
    svg.append('rect')
      .attr('x', legendX + i * (cellSize + 3))
      .attr('y', height + 8)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('fill', color)
      .attr('rx', 2);
  });

  svg.append('text')
    .attr('x', legendX + 5 * (cellSize + 3) + 8)
    .attr('y', height + 18)
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('More');
}

// --- 2. Cost Variance Explorer (Scatter) ---
// Simplified: Cleaner scatter with uniform circle sizes, grouped by agent
function renderVarianceChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);

  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 30, right: 120, bottom: 50, left: 60 };
  const width = rect.width - margin.left - margin.right;
  const height = 280 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Filter outliers: use 95th percentile as cutoff for duration
  const durations = data.map(d => d.duration_minutes || 0).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);
  const durationCutoff = durations[p95Index] * 1.5; // 1.5x the 95th percentile

  const filteredData = data.filter(d => (d.duration_minutes || 0) <= durationCutoff);
  const outliers = data.filter(d => (d.duration_minutes || 0) > durationCutoff);

  // Get unique agent types
  const agentTypes = [...new Set(filteredData.map(d => d.agent_type))];

  const colorMap = COLORS.agents;

  const color = d3.scaleOrdinal()
    .domain(agentTypes)
    .range(agentTypes.map(t => colorMap[t] || COLORS.primary));

  // Scales - use filtered data for better distribution
  const x = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => d.duration_minutes || 0) * 1.1])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => d.total_cost || 0) * 1.1])
    .range([height, 0]);

  // Show outlier note if any were removed
  if (outliers.length > 0) {
    const outlierText = outliers.map(o =>
      `${o.agent_type}: ${Math.round(o.duration_minutes)}min, $${(o.total_cost || 0).toFixed(2)}`
    ).join('; ');

    svg.append('text')
      .attr('x', width)
      .attr('y', -10)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .style('font-size', '9px')
      .text(`⚠️ ${outliers.length} outlier${outliers.length > 1 ? 's' : ''} removed (>${Math.round(durationCutoff)}min)`);
  }

  // Add grid
  addGrid(svg, width, height, y);

  // Add trend line - use filtered data
  const validData = filteredData.filter(d => d.duration_minutes && d.total_cost);
  if (validData.length > 2) {
    const xMean = d3.mean(validData, d => d.duration_minutes);
    const yMean = d3.mean(validData, d => d.total_cost);

    let num = 0, den = 0;
    validData.forEach(d => {
      num += (d.duration_minutes - xMean) * (d.total_cost - yMean);
      den += (d.duration_minutes - xMean) ** 2;
    });
    const slope = num / den;
    const intercept = yMean - slope * xMean;

    svg.append('line')
      .attr('x1', x(0))
      .attr('y1', y(Math.max(0, intercept)))
      .attr('x2', x(d3.max(validData, d => d.duration_minutes)))
      .attr('y2', y(slope * d3.max(validData, d => d.duration_minutes) + intercept))
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
  }

  // Draw circles - uniform size for clarity (filtered data only)
  const circles = svg.selectAll('circle')
    .data(filteredData)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.duration_minutes || 0))
    .attr('cy', d => y(d.total_cost || 0))
    .attr('r', 6)
    .attr('fill', d => color(d.agent_type))
    .attr('opacity', 0.7)
    .attr('stroke', 'rgba(0,0,0,0.3)')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer');

  // Interactions
  circles
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 10)
        .attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      showTooltip(event, `
        <div style="text-align:left">
          <strong style="color:${color(d.agent_type)}">${d.agent_type}</strong>
          <hr style="border-color:#4a5568;margin:4px 0">
          ⏱️ ${(d.duration_minutes || 0).toFixed(0)} min<br>
          💰 $${(d.total_cost || 0).toFixed(2)}<br>
          🎯 ${(d.total_tokens || 0).toLocaleString()} tokens
        </div>
      `);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 6)
        .attr('opacity', 0.7)
        .attr('stroke', 'rgba(0,0,0,0.3)')
        .attr('stroke-width', 1);
      hideTooltip();
    });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}m`))
    .attr('color', COLORS.text)
    .select('.domain').remove();

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d.toFixed(2)}`))
    .attr('color', COLORS.text)
    .select('.domain').remove();

  // Axis labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('Duration (minutes)');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -45)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .text('Cost ($)');

  // Simple legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 10}, 10)`);

  agentTypes.forEach((agent, i) => {
    const g = legend.append('g')
      .attr('transform', `translate(0, ${i * 20})`)
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        circles.attr('opacity', d => d.agent_type === agent ? 1 : 0.15);
      })
      .on('mouseout', function() {
        circles.attr('opacity', 0.7);
      });

    g.append('circle')
      .attr('r', 5)
      .attr('fill', color(agent));

    g.append('text')
      .attr('x', 10)
      .attr('y', 4)
      .attr('fill', COLORS.text)
      .style('font-size', '9px')
      .text(agent.replace('_', ' '));
  });
}

// --- 3. Session Flow (Sankey Diagram) ---
// Enhanced: True Sankey with d3-sankey showing session outcomes
function renderFlowChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);

  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width = rect.width - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Aggregate data
  const totalSessions = data.length;
  const withCommits = data.filter(d => d.commit_count > 0);
  const noCommits = data.filter(d => d.commit_count === 0);

  const totalFiles = d3.sum(withCommits, d => d.files_changed || 0);
  const totalLines = d3.sum(withCommits, d => d.lines_added || 0);
  const productiveCost = d3.sum(withCommits, d => d.total_cost || 0);
  const wastedCost = d3.sum(noCommits, d => d.total_cost || 0);

  // Group by agent type for more detail
  const agentGroups = d3.group(data, d => d.agent_type);
  const agentStats = Array.from(agentGroups, ([agent, sessions]) => ({
    agent,
    count: sessions.length,
    withCommits: sessions.filter(s => s.commit_count > 0).length,
    noCommits: sessions.filter(s => s.commit_count === 0).length,
    cost: d3.sum(sessions, s => s.total_cost || 0)
  }));

  // Build Sankey data structure
  const nodes = [
    { name: 'All Sessions', id: 0 },
    { name: 'With Commits', id: 1 },
    { name: 'No Commits', id: 2 },
    { name: 'Files Changed', id: 3 },
    { name: 'Lines Added', id: 4 },
    { name: 'Exploration', id: 5 }
  ];

  const links = [
    { source: 0, target: 1, value: withCommits.length },
    { source: 0, target: 2, value: noCommits.length || 1 },
    { source: 1, target: 3, value: Math.max(1, totalFiles / 10) },
    { source: 1, target: 4, value: Math.max(1, totalLines / 100) },
    { source: 2, target: 5, value: noCommits.length || 1 }
  ];

  // Create Sankey generator
  const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[0, 0], [width, height]]);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  // Color scheme
  const nodeColors = {
    0: COLORS.primary,
    1: COLORS.tertiary,
    2: COLORS.quaternary,
    3: '#10b981',
    4: '#34d399',
    5: '#f59e0b'
  };

  // Draw links
  const link = svg.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(sankeyLinks)
    .enter()
    .append('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => nodeColors[d.source.id])
    .attr('stroke-width', d => Math.max(2, d.width))
    .attr('opacity', 0.4)
    .style('mix-blend-mode', 'screen');

  // Link hover
  link.on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 0.7);
      showTooltip(event, `
        <strong>${d.source.name} → ${d.target.name}</strong><br>
        Flow: ${d.value.toFixed(0)}
      `);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.4);
      hideTooltip();
    });

  // Draw nodes
  const node = svg.append('g')
    .selectAll('g')
    .data(sankeyNodes)
    .enter()
    .append('g');

  // Node rectangles
  node.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => Math.max(1, d.y1 - d.y0))
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => nodeColors[d.id])
    .attr('rx', 3)
    .attr('opacity', 0.9)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1);

      let details = '';
      if (d.id === 0) {
        details = `Total: ${totalSessions} sessions<br>Cost: $${(productiveCost + wastedCost).toFixed(2)}`;
      } else if (d.id === 1) {
        details = `${withCommits.length} sessions (${((withCommits.length/totalSessions)*100).toFixed(0)}%)<br>Cost: $${productiveCost.toFixed(2)}`;
      } else if (d.id === 2) {
        details = `${noCommits.length} sessions (${((noCommits.length/totalSessions)*100).toFixed(0)}%)<br>Cost: $${wastedCost.toFixed(2)}`;
      } else if (d.id === 3) {
        details = `${totalFiles} files modified`;
      } else if (d.id === 4) {
        details = `${totalLines.toLocaleString()} lines added`;
      } else if (d.id === 5) {
        details = `Debugging, research, exploration<br>Not all sessions need commits!`;
      }

      showTooltip(event, `<strong>${d.name}</strong><br>${details}`);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.9);
      hideTooltip();
    });

  // Node labels
  node.append('text')
    .attr('x', d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
    .attr('fill', COLORS.text)
    .style('font-size', '11px')
    .style('font-weight', '500')
    .text(d => d.name);

  // Value labels
  node.append('text')
    .attr('x', d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr('y', d => (d.y1 + d.y0) / 2 + 14)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
    .attr('fill', COLORS.text)
    .attr('opacity', 0.7)
    .style('font-size', '10px')
    .text(d => {
      if (d.id === 0) return `${totalSessions} sessions`;
      if (d.id === 1) return `${withCommits.length} (${((withCommits.length/totalSessions)*100).toFixed(0)}%)`;
      if (d.id === 2) return `${noCommits.length} ($${wastedCost.toFixed(2)})`;
      if (d.id === 3) return `${totalFiles} files`;
      if (d.id === 4) return `${totalLines.toLocaleString()} lines`;
      if (d.id === 5) return 'exploration';
      return '';
    });

  // Summary stats at bottom
  const summary = svg.append('g')
    .attr('transform', `translate(${width/2}, ${height + 5})`);

  const commitRate = ((withCommits.length / totalSessions) * 100).toFixed(0);
  const efficiency = productiveCost > 0 ? (totalLines / productiveCost).toFixed(0) : 0;

  summary.append('text')
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.text)
    .attr('opacity', 0.6)
    .style('font-size', '10px')
    .text(`Commit Rate: ${commitRate}% • Lines/$ (productive): ${efficiency}`);
}

// --- Existing Charts ---
// Cost Chart
function renderCostChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  const { svg, width, height } = setupChart(containerId);
  data.forEach(d => { d.date = new Date(d.date); d.cost = +d.cost; });
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.cost) * 1.2]).range([height, 0]);
  
  const area = d3.area().x(d => x(d.date)).y0(height).y1(d => y(d.cost)).curve(d3.curveMonotoneX);
  svg.append("path").datum(data).attr("fill", COLORS.primary).attr("opacity", 0.2).attr("d", area);
  svg.append("path").datum(data).attr("fill", "none").attr("stroke", COLORS.primary).attr("stroke-width", 2).attr("d", d3.line().x(d => x(d.date)).y(d => y(d.cost)).curve(d3.curveMonotoneX));
  addAxes(svg, width, height, x, y, d => `$${d}`);
  addGrid(svg, width, height, y);
}

// Token Chart
function renderTokenChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  const { svg, width, height } = setupChart(containerId);
  const x = d3.scaleBand().domain(data.map(d => d.agent_type)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.total_tokens) * 1.1]).range([height, 0]);
  const color = d3.scaleOrdinal().range([COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary]);
  
  addGrid(svg, width, height, y);
  svg.selectAll("rect").data(data).enter().append("rect")
    .attr("x", d => x(d.agent_type)).attr("y", d => y(d.total_tokens))
    .attr("width", x.bandwidth()).attr("height", d => height - y(d.total_tokens))
    .attr("fill", (d, i) => color(i)).attr("rx", 4)
    .on("mouseover", (event, d) => showTooltip(event, `${d.agent_type}<br>${d.total_tokens.toLocaleString()} tokens`))
    .on("mouseout", hideTooltip);
  addAxes(svg, width, height, x, y, d => d >= 1000 ? `${d/1000}k` : d);
}

// Comparison Chart
function renderComparisonChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  const { svg, width, height } = setupChart(containerId);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.avg_cost_per_session) * 1.1]).range([0, width]);
  const y = d3.scaleBand().domain(data.map(d => d.agent_type)).range([0, height]).padding(0.3);
  const color = d3.scaleOrdinal().range([COLORS.tertiary, COLORS.secondary, COLORS.primary]);

  svg.selectAll("rect").data(data).enter().append("rect")
    .attr("x", 0).attr("y", d => y(d.agent_type))
    .attr("width", d => x(d.avg_cost_per_session)).attr("height", y.bandwidth())
    .attr("fill", (d, i) => color(i)).attr("rx", 4)
    .on("mouseover", (event, d) => showTooltip(event, `${d.agent_type}<br>Avg Cost: $${d.avg_cost_per_session.toFixed(2)}`))
    .on("mouseout", hideTooltip);
  addAxes(svg, width, height, x, y, d => `$${d}`);
}

// Sessions Table - Show all available data
function renderSessionsTable(sessions, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();
  if (!sessions || sessions.length === 0) return renderEmptyState(containerId);

  // Make container scrollable for wide table
  container.style('overflow-x', 'auto');

  const table = container.append('table');
  table.style('min-width', '100%').style('font-size', '11px');

  // All available columns
  const columns = [
    { key: 'session_id', label: 'Session ID', format: d => d ? d.substring(0, 8) + '...' : '-' },
    { key: 'agent_type', label: 'Agent', format: d => d || '-' },
    { key: 'model_name', label: 'Model', format: d => d || '-' },
    { key: 'session_start', label: 'Start', format: d => d ? new Date(d).toLocaleString() : '-' },
    { key: 'session_end', label: 'End', format: d => d ? new Date(d).toLocaleTimeString() : '-' },
    { key: 'duration', label: 'Duration', format: (d, row) => {
      if (row.session_start && row.session_end) {
        const mins = (new Date(row.session_end) - new Date(row.session_start)) / 60000;
        return mins < 1 ? `${(mins * 60).toFixed(0)}s` : `${mins.toFixed(1)}m`;
      }
      return '-';
    }},
    { key: 'input_tokens', label: 'In Tokens', format: d => d ? d.toLocaleString() : '0' },
    { key: 'output_tokens', label: 'Out Tokens', format: d => d ? d.toLocaleString() : '0' },
    { key: 'total_tokens', label: 'Total', format: (d, row) => ((row.input_tokens || 0) + (row.output_tokens || 0)).toLocaleString() },
    { key: 'total_cost', label: 'Cost', format: d => `$${d ? d.toFixed(4) : '0.0000'}` },
    { key: 'cache_read_tokens', label: 'Cache Read', format: d => d ? d.toLocaleString() : '-' },
    { key: 'cache_write_tokens', label: 'Cache Write', format: d => d ? d.toLocaleString() : '-' }
  ];

  // Header
  table.append('thead').append('tr')
    .selectAll('th')
    .data(columns)
    .enter()
    .append('th')
    .text(d => d.label)
    .style('white-space', 'nowrap')
    .style('padding', '6px 8px');

  // Body
  const tbody = table.append('tbody');
  tbody.selectAll('tr').data(sessions).enter().append('tr').each(function(d) {
    const row = d3.select(this);
    columns.forEach(col => {
      row.append('td')
        .text(col.format(d[col.key], d))
        .style('white-space', 'nowrap')
        .style('padding', '4px 8px');
    });
  });
}

// --- Helpers ---
function addGrid(svg, width, height, yScale) {
  svg.append("g").attr("class", "grid").call(d3.axisLeft(yScale).tickSize(-width).tickFormat("")).selectAll("line").attr("stroke", COLORS.grid);
  svg.selectAll(".domain").remove();
}
function addAxes(svg, width, height, x, y, yFormat) {
  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5)).attr("color", COLORS.text).select(".domain").remove();
  svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(yFormat)).attr("color", COLORS.text).select(".domain").remove();
}
function renderEmptyState(containerId) {
  d3.select(`#${containerId}`).html('<div class="empty-state"><p>Waiting for data...</p></div>');
}
function showTooltip(event, html) {
  let tooltip = d3.select('.tooltip');
  if (tooltip.empty()) tooltip = d3.select('body').append('div').attr('class', 'tooltip');
  tooltip.classed('show', true).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
}
function hideTooltip() { d3.select('.tooltip').classed('show', false); }
