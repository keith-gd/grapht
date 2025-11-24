// Span Analytics Charts using D3.js

/**
 * Render Latency Percentiles Chart
 * @param {Object} data - Object with p50, p95, p99 keys
 * @param {string} containerId - ID of the container element
 */
function renderLatencyChart(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data) return;
  
  container.innerHTML = '';
  
  const width = container.clientWidth;
  const height = container.clientHeight || 300;
  const margin = { top: 20, right: 20, bottom: 30, left: 60 };
  
  const chartData = [
    { label: 'P50', value: data.p50 || 0 },
    { label: 'P95', value: data.p95 || 0 },
    { label: 'P99', value: data.p99 || 0 }
  ];
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  const x = d3.scaleBand()
    .range([margin.left, width - margin.right])
    .domain(chartData.map(d => d.label))
    .padding(0.3);
    
  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([0, d3.max(chartData, d => d.value) * 1.1]);
    
  // Add X Axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px");
    
  // Add Y Axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll("text")
    .style("font-size", "12px");
    
  // Add Y Axis Label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 15)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "10px")
    .text("Latency (ms)");
    
  // Add Bars
  svg.selectAll('.bar')
    .data(chartData)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.value))
    .attr('height', d => height - margin.bottom - y(d.value))
    .attr('fill', '#69b3a2')
    .attr('rx', 4); // Rounded corners
    
  // Add Labels
  svg.selectAll('.label')
    .data(chartData)
    .enter().append('text')
    .attr('class', 'label')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.value) - 5)
    .attr('text-anchor', 'middle')
    .style("font-size", "12px")
    .text(d => `${Math.round(d.value)}ms`);
}

/**
 * Render Tool Usage Horizontal Bar Chart
 * @param {Array} data - Array of {tool_name, usage_count}
 * @param {string} containerId - ID of the container element
 */
function renderToolUsageChart(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!data || !data.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No tool usage data available</div>';
    return;
  }
  
  const width = container.clientWidth;
  const height = container.clientHeight || 300;
  const margin = { top: 20, right: 40, bottom: 30, left: 120 };
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  const x = d3.scaleLinear()
    .range([margin.left, width - margin.right])
    .domain([0, d3.max(data, d => parseInt(d.usage_count)) * 1.1]);
    
  const y = d3.scaleBand()
    .range([margin.top, height - margin.bottom])
    .domain(data.map(d => d.tool_name))
    .padding(0.2);
    
  // Add X Axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5));
    
  // Add Y Axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "11px");
    
  // Add Bars
  svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', margin.left)
    .attr('y', d => y(d.tool_name))
    .attr('width', d => x(d.usage_count) - margin.left)
    .attr('height', y.bandwidth())
    .attr('fill', '#4096ff')
    .attr('rx', 2);
    
  // Add Values
  svg.selectAll('.value')
    .data(data)
    .enter().append('text')
    .attr('class', 'value')
    .attr('x', d => x(d.usage_count) + 5)
    .attr('y', d => y(d.tool_name) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .style("font-size", "10px")
    .text(d => d.usage_count);
}

/**
 * Render Token Distribution Histogram
 * @param {Array} data - Array of {token_bin, count}
 * @param {string} containerId - ID of the container element
 */
function renderTokenDistributionChart(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!data || !data.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No token data available</div>';
    return;
  }
  
  const width = container.clientWidth;
  const height = container.clientHeight || 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  
  // Parse bins
  data.forEach(d => {
    d.token_bin = parseInt(d.token_bin);
    d.count = parseInt(d.count);
  });
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  const x = d3.scaleLinear()
    .range([margin.left, width - margin.right])
    .domain([0, d3.max(data, d => d.token_bin) + 100]);
    
  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([0, d3.max(data, d => d.count) * 1.1]);
    
  // Add X Axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("fill", "#000")
    .style("text-anchor", "middle")
    .text("Tokens");
    
  // Add Y Axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5));
    
  // Add Bars (using fixed width or calculated)
  // Assuming 100 width bins
  const barWidth = Math.max(2, (width - margin.left - margin.right) / (data.length || 1) - 2);
  
  svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.token_bin))
    .attr('y', d => y(d.count))
    .attr('width', 20) // approximate width for now
    .attr('height', d => height - margin.bottom - y(d.count))
    .attr('fill', '#9b59b6')
    .attr('opacity', 0.8);
}

