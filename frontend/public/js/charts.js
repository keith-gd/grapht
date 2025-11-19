// D3 Chart Components with Sleek Dark Theme

const COLORS = {
  primary: '#818cf8',    // Indigo
  secondary: '#c084fc',  // Purple
  tertiary: '#2dd4bf',   // Teal
  quaternary: '#f472b6', // Pink
  background: 'rgba(255, 255, 255, 0.05)',
  text: '#94a3b8',
  grid: 'rgba(255, 255, 255, 0.05)',
  tooltipBg: 'rgba(15, 23, 42, 0.95)'
};

// Common chart setup
function setupChart(containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();
  
  const rect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = rect.width - margin.left - margin.right;
  const height = rect.height - margin.top - margin.bottom;
  
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
  return { svg, width, height, margin };
}

// Cost Over Time Line Chart (Area Gradient)
function renderCostChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  
  const { svg, width, height } = setupChart(containerId);

  data.forEach(d => {
    d.date = new Date(d.date);
    d.cost = +d.cost;
  });

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.cost) * 1.2])
    .range([height, 0]);

  // Gradients
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", COLORS.primary)
    .attr("stop-opacity", 0.5);
    
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", COLORS.primary)
    .attr("stop-opacity", 0);

  // Area generator
  const area = d3.area()
    .x(d => x(d.date))
    .y0(height)
    .y1(d => y(d.cost))
    .curve(d3.curveMonotoneX);

  // Line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.cost))
    .curve(d3.curveMonotoneX);

  // Add Grid
  addGrid(svg, width, height, y);

  // Add Area
  svg.append("path")
    .datum(data)
    .attr("class", "area")
    .attr("d", area)
    .attr("fill", "url(#area-gradient)");

  // Add Line
  const path = svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", COLORS.primary)
    .attr("stroke-width", 3)
    .attr("d", line);

  // Animate Line
  const totalLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(1500)
    .ease(d3.easeCubicOut)
    .attr("stroke-dashoffset", 0);

  // Add Axes
  addAxes(svg, width, height, x, y, d => `$${d}`);

  // Interactive Overlay
  addInteractiveOverlay(svg, width, height, x, y, data, d => `$${d.cost.toFixed(2)}`, 'date');
}

// Token Breakdown Bar Chart
function renderTokenChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  
  const { svg, width, height } = setupChart(containerId);

  const x = d3.scaleBand()
    .domain(data.map(d => d.agent_type))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total_tokens) * 1.1])
    .range([height, 0]);

  addGrid(svg, width, height, y);

  const color = d3.scaleOrdinal()
    .range([COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary]);

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.agent_type))
    .attr("y", height)
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("fill", (d, i) => color(i))
    .attr("rx", 4)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.8);
      showTooltip(event, `
        <strong>${d.agent_type}</strong><br>
        ${d.total_tokens.toLocaleString()} tokens
      `);
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    })
    .transition()
    .duration(800)
    .attr("y", d => y(d.total_tokens))
    .attr("height", d => height - y(d.total_tokens));

  addAxes(svg, width, height, x, y, d => d >= 1000 ? `${d/1000}k` : d);
}

// Agent Comparison Horizontal Bar Chart
function renderComparisonChart(data, containerId) {
  if (!data || data.length === 0) return renderEmptyState(containerId);
  
  const { svg, width, height } = setupChart(containerId);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.avg_cost_per_session) * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.agent_type))
    .range([0, height])
    .padding(0.3);

  // Grid vertical
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat("").ticks(5))
    .selectAll("line")
    .attr("stroke", COLORS.grid);

  const color = d3.scaleOrdinal()
    .range([COLORS.tertiary, COLORS.secondary, COLORS.primary]);

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d.agent_type))
    .attr("width", 0)
    .attr("height", y.bandwidth())
    .attr("fill", (d, i) => color(i))
    .attr("rx", 4)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.8);
      showTooltip(event, `
        <strong>${d.agent_type}</strong><br>
        Avg Cost: $${d.avg_cost_per_session.toFixed(3)}<br>
        Sessions: ${d.total_sessions}
      `);
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    })
    .transition()
    .duration(800)
    .attr("width", d => x(d.avg_cost_per_session));

  // Value labels
  svg.selectAll(".label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x(d.avg_cost_per_session) + 8)
    .attr("y", d => y(d.agent_type) + y.bandwidth() / 2)
    .attr("dy", ".35em")
    .text(d => `$${d.avg_cost_per_session.toFixed(3)}`)
    .attr("fill", COLORS.text)
    .style("font-size", "12px")
    .style("opacity", 0)
    .transition()
    .delay(500)
    .style("opacity", 1);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `$${d}`))
    .attr("color", COLORS.text)
    .select(".domain").remove();

  svg.append("g")
    .call(d3.axisLeft(y))
    .attr("color", COLORS.text)
    .select(".domain").remove();
}

// Recent Sessions Table
function renderSessionsTable(sessions, containerId) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  if (!sessions || sessions.length === 0) return renderEmptyState(containerId);

  const table = container.append('table');
  
  const thead = table.append('thead');
  thead.append('tr')
    .selectAll('th')
    .data(['Agent', 'Model', 'Start Time', 'Duration', 'Tokens', 'Cost'])
    .enter()
    .append('th')
    .text(d => d);

  const tbody = table.append('tbody');
  const rows = tbody.selectAll('tr')
    .data(sessions)
    .enter()
    .append('tr')
    .style('opacity', 0)
    .transition()
    .duration(300)
    .delay((d, i) => i * 50)
    .style('opacity', 1);

  // Use selection to append cells
  tbody.selectAll('tr').each(function(d) {
    const row = d3.select(this);
    
    row.append('td').html(`<span style="color: ${COLORS.primary}">●</span> ${d.agent_type}`);
    row.append('td').text(d.model_name || 'N/A').style('font-family', 'monospace').style('font-size', '0.8em');
    row.append('td').text(new Date(d.session_start).toLocaleString());
    row.append('td').text(formatDuration(d.session_start, d.session_end));
    row.append('td').text((d.input_tokens + d.output_tokens).toLocaleString());
    
    const cost = d.total_cost || calculateCost(d.input_tokens, d.output_tokens);
    row.append('td').text(typeof cost === 'string' ? cost : `$${cost.toFixed(3)}`)
       .style('font-weight', 'bold').style('color', COLORS.tertiary);
  });
}

// --- Helper Functions ---

function addGrid(svg, width, height, yScale) {
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat("")
    )
    .selectAll("line")
    .attr("stroke", COLORS.grid);
  
  svg.selectAll(".domain").remove();
}

function addAxes(svg, width, height, x, y, yFormat) {
  // X Axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .attr("color", COLORS.text)
    .select(".domain").remove();

  // Y Axis
  svg.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(yFormat))
    .attr("color", COLORS.text)
    .select(".domain").remove();
}

function renderEmptyState(containerId) {
  d3.select(`#${containerId}`)
    .html('<div class="empty-state"><p>Waiting for data...</p></div>');
}

function addInteractiveOverlay(svg, width, height, x, y, data, valFormat, xKey) {
  const bisect = d3.bisector(d => d[xKey]).left;
  
  const focus = svg.append("g")
    .style("display", "none");

  focus.append("circle")
    .attr("r", 6)
    .attr("fill", COLORS.background)
    .attr("stroke", COLORS.primary)
    .attr("stroke-width", 2);

  focus.append("line")
    .attr("class", "x-hover-line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", COLORS.grid)
    .attr("stroke-dasharray", "3,3");

  svg.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", () => focus.style("display", null))
    .on("mouseout", () => {
      focus.style("display", "none");
      hideTooltip();
    })
    .on("mousemove", function(event) {
      const x0 = x.invert(d3.pointer(event)[0]);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const d = x0 - d0[xKey] > d1[xKey] - x0 ? d1 : d0;
      
      focus.attr("transform", `translate(${x(d[xKey])},${y(d.cost)})`);
      
      showTooltip(event, `
        <strong>${d[xKey].toLocaleDateString()}</strong><br>
        Cost: <span style="color:${COLORS.tertiary}">${valFormat(d)}</span>
      `);
    });
}

function showTooltip(event, html) {
  let tooltip = d3.select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div').attr('class', 'tooltip');
  }
  
  tooltip.classed('show', true)
    .html(html)
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 15) + 'px');
}

function hideTooltip() {
  d3.select('.tooltip').classed('show', false);
}

function formatDuration(start, end) {
  const duration = new Date(end) - new Date(start);
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function calculateCost(input, output) {
  // Approximate cost
  return (input * 3 / 1000000) + (output * 15 / 1000000);
}
