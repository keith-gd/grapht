// D3 Chart Components

// Cost Over Time Line Chart
function renderCostChart(data, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!data || data.length === 0) {
    container.append('div')
      .attr('class', 'empty-state')
      .html('<p>No cost data available yet</p>');
    return;
  }

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Parse dates
  data.forEach(d => {
    d.date = new Date(d.date);
    d.cost = +d.cost;
  });

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.cost) * 1.1])
    .range([height, 0]);

  // Line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.cost))
    .curve(d3.curveMonotoneX);

  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .style('color', '#718096');

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d.toFixed(2)}`))
    .style('color', '#718096');

  // Add line
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#667eea')
    .attr('stroke-width', 3)
    .attr('d', line);

  // Add dots
  svg.selectAll('dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.cost))
    .attr('r', 5)
    .attr('fill', '#667eea')
    .on('mouseover', function(event, d) {
      showTooltip(event, `${d.date.toLocaleDateString()}<br>$${d.cost.toFixed(3)}`);
    })
    .on('mouseout', hideTooltip);
}

// Token Breakdown Bar Chart
function renderTokenChart(data, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!data || data.length === 0) {
    container.append('div')
      .attr('class', 'empty-state')
      .html('<p>No token data available yet</p>');
    return;
  }

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleBand()
    .domain(data.map(d => d.agent_type))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total_tokens) * 1.1])
    .range([height, 0]);

  // Color scale
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.agent_type))
    .range(['#667eea', '#764ba2', '#f093fb', '#4facfe']);

  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .style('color', '#718096');

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toLocaleString()))
    .style('color', '#718096');

  // Add bars
  svg.selectAll('bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.agent_type))
    .attr('y', height)
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('fill', d => color(d.agent_type))
    .on('mouseover', function(event, d) {
      showTooltip(event, `${d.agent_type}<br>${d.total_tokens.toLocaleString()} tokens`);
    })
    .on('mouseout', hideTooltip)
    .transition()
    .duration(800)
    .attr('y', d => y(d.total_tokens))
    .attr('height', d => height - y(d.total_tokens));
}

// Agent Comparison Horizontal Bar Chart
function renderComparisonChart(data, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!data || data.length === 0) {
    container.append('div')
      .attr('class', 'empty-state')
      .html('<p>No comparison data available yet</p>');
    return;
  }

  const margin = { top: 20, right: 100, bottom: 40, left: 150 };
  const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
  const height = Math.max(300, data.length * 60) - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.avg_cost_per_session) * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.agent_type))
    .range([0, height])
    .padding(0.2);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.agent_type))
    .range(['#667eea', '#764ba2', '#f093fb', '#4facfe']);

  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `$${d.toFixed(3)}`))
    .style('color', '#718096');

  svg.append('g')
    .call(d3.axisLeft(y))
    .style('color', '#718096');

  // Add bars
  svg.selectAll('bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', d => y(d.agent_type))
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('fill', d => color(d.agent_type))
    .on('mouseover', function(event, d) {
      showTooltip(event, `
        ${d.agent_type}<br>
        Sessions: ${d.total_sessions}<br>
        Avg Cost: $${d.avg_cost_per_session.toFixed(3)}
      `);
    })
    .on('mouseout', hideTooltip)
    .transition()
    .duration(800)
    .attr('width', d => x(d.avg_cost_per_session));

  // Add value labels
  svg.selectAll('label')
    .data(data)
    .enter()
    .append('text')
    .attr('x', d => x(d.avg_cost_per_session) + 5)
    .attr('y', d => y(d.agent_type) + y.bandwidth() / 2)
    .attr('dy', '.35em')
    .style('font-size', '12px')
    .style('fill', '#4a5568')
    .text(d => `$${d.avg_cost_per_session.toFixed(3)}`)
    .style('opacity', 0)
    .transition()
    .delay(800)
    .style('opacity', 1);
}

// Recent Sessions Table
function renderSessionsTable(sessions, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!sessions || sessions.length === 0) {
    container.append('div')
      .attr('class', 'empty-state')
      .html('<p>No sessions recorded yet</p>');
    return;
  }

  const table = container.append('table');
  
  // Header
  const thead = table.append('thead');
  thead.append('tr')
    .selectAll('th')
    .data(['Agent', 'Model', 'Start Time', 'Duration', 'Tokens', 'Cost'])
    .enter()
    .append('th')
    .text(d => d);

  // Body
  const tbody = table.append('tbody');
  const rows = tbody.selectAll('tr')
    .data(sessions)
    .enter()
    .append('tr');

  rows.selectAll('td')
    .data(d => [
      d.agent_type,
      d.model_name || 'N/A',
      new Date(d.session_start).toLocaleString(),
      formatDuration(d.session_start, d.session_end),
      (d.input_tokens + d.output_tokens).toLocaleString(),
      d.total_cost ? `$${d.total_cost.toFixed(3)}` : calculateCost(d.input_tokens, d.output_tokens)
    ])
    .enter()
    .append('td')
    .text(d => d);
}

// Tooltip helpers
function showTooltip(event, html) {
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip show')
    .html(html)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
  d3.selectAll('.tooltip').remove();
}

// Utility functions
function formatDuration(start, end) {
  const duration = new Date(end) - new Date(start);
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function calculateCost(inputTokens, outputTokens) {
  // Claude Sonnet 3.5 pricing: $3/1M input, $15/1M output
  const cost = (inputTokens * 0.003 / 1000) + (outputTokens * 0.015 / 1000);
  return `$${cost.toFixed(3)}`;
}
