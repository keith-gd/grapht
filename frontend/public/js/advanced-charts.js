/**
 * Render Cost Heatmap (Calendar View)
 * @param {Array} data - Array of {time: ISOString, daily_cost: number}
 * @param {string} containerId - ID of the container element
 */
function renderCostHeatmap(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data || !data.length) return;
  
  container.innerHTML = '';
  const width = container.clientWidth;
  const height = 150;
  const cellSize = 15;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  
  // Process data into a map
  const dateMap = new Map();
  data.forEach(d => {
    const date = d.time.split('T')[0];
    dateMap.set(date, parseFloat(d.daily_cost));
  });
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  // Color scale
  const maxCost = d3.max(data, d => parseFloat(d.daily_cost)) || 10;
  const color = d3.scaleSequential(d3.interpolateGreens)
    .domain([0, maxCost]);
    
  // Generate dates for last 365 days (or fewer for demo)
  // For simplicity, let's show the last 4-5 months to fit width
  const now = new Date();
  const daysToShow = Math.floor((width - margin.left - margin.right) / cellSize) * 7;
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - daysToShow);
  
  const dates = d3.timeDays(startDate, now);
  
  // Group by week
  const weeks = d3.group(dates, d => d3.timeSunday(d));
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
  // Render cells
  g.selectAll('.day')
    .data(dates)
    .enter().append('rect')
    .attr('class', 'day')
    .attr('width', cellSize - 2)
    .attr('height', cellSize - 2)
    .attr('x', d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
    .attr('y', d => d.getDay() * cellSize) // Not quite right for multi-year, simplified
    .attr('fill', d => {
      const dateStr = d.toISOString().split('T')[0];
      const val = dateMap.get(dateStr);
      return val ? color(val) : '#ebedf0';
    })
    .attr('rx', 2)
    .append('title')
    .text(d => {
      const dateStr = d.toISOString().split('T')[0];
      const val = dateMap.get(dateStr);
      return `${dateStr}: $${(val || 0).toFixed(2)}`;
    });
    
  // Helper to fix X positioning logic for a proper calendar view
  // (Simplified above, normally needs week index relative to start)
  // Updating positioning logic:
  g.selectAll('.day')
    .attr('x', d => {
       const diff = Math.ceil((d - startDate) / (1000 * 60 * 60 * 24));
       const weekIndex = Math.floor(diff / 7);
       return weekIndex * cellSize;
    });
}

/**
 * Render Trace Waterfall
 * @param {Array} spans - Flat array of spans with start_time, duration_ms, etc.
 * @param {string} containerId - ID of the container element
 */
function renderTraceWaterfall(spans, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !spans || !spans.length) return;
  
  container.innerHTML = '';
  
  const margin = { top: 20, right: 150, bottom: 20, left: 150 };
  const width = container.clientWidth;
  const rowHeight = 25;
  const height = spans.length * rowHeight + margin.top + margin.bottom;
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  // X Scale (Time)
  const minTime = d3.min(spans, d => new Date(d.start_time));
  const maxTime = d3.max(spans, d => new Date(d.end_time));
  
  const x = d3.scaleTime()
    .domain([minTime, maxTime])
    .range([margin.left, width - margin.right]);
    
  const g = svg.append('g')
    .attr('transform', `translate(0, ${margin.top})`);
    
  // Render rows
  const rows = g.selectAll('.span-row')
    .data(spans)
    .enter().append('g')
    .attr('class', 'span-row')
    .attr('transform', (d, i) => `translate(0, ${i * rowHeight})`);
    
  // Span Bars
  rows.append('rect')
    .attr('x', d => x(new Date(d.start_time)))
    .attr('width', d => Math.max(2, x(new Date(d.end_time)) - x(new Date(d.start_time))))
    .attr('height', rowHeight - 4)
    .attr('fill', d => d.type === 'llm' ? '#3b82f6' : '#22c55e')
    .attr('rx', 4)
    .attr('opacity', 0.8);
    
  // Labels
  rows.append('text')
    .attr('x', margin.left - 10)
    .attr('y', rowHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .style('font-size', '11px')
    .style('font-family', 'monospace')
    .text(d => {
        const label = d.name || d.model_name || d.tool_name;
        return label.length > 20 ? label.substring(0, 20) + '...' : label;
    });
    
  // Duration Labels (Right side)
  rows.append('text')
    .attr('x', d => Math.max(x(new Date(d.end_time)) + 5, margin.left + 5))
    .attr('y', rowHeight / 2)
    .attr('dy', '0.35em')
    .style('font-size', '10px')
    .text(d => `${Math.round(d.duration_ms)}ms`);
}

