# Agent Analytics Dashboard (D3.js)

Real-time visualization dashboard for multi-agent telemetry data.

## 🚀 Quick Start

### Option 1: Python HTTP Server (Simplest)

```bash
cd frontend/public
python3 -m http.server 8000
```

Then open: **http://localhost:8000**

### Option 2: Direct File Access

Simply open `frontend/public/index.html` in your browser.

**Note:** If you see CORS errors, use Option 1 (HTTP server).

## 📊 Dashboard Features

### Summary Cards
- **Total Cost** - Cumulative cost across all agents
- **Total Tokens** - Input + output tokens consumed
- **Sessions** - Number of agent sessions tracked
- **Avg Cost/Session** - Average cost per session

### Charts
1. **Cost Over Time** - Line chart showing daily cost trends
2. **Token Usage by Agent** - Bar chart comparing token usage
3. **Agent Performance** - Horizontal bar comparing avg cost/session
4. **Recent Sessions** - Table of last 10 sessions with details

### Features
- ✅ Real-time updates (30s refresh)
- ✅ Manual refresh button
- ✅ Interactive tooltips on hover
- ✅ Responsive design
- ✅ Smooth animations

## 🔌 API Endpoints Used

The dashboard consumes these endpoints from `http://localhost:3333`:

```
GET /api/metrics/summary              # Overall statistics
GET /api/metrics/cost-over-time       # Daily cost data
GET /api/metrics/token-breakdown      # Tokens by agent
GET /api/metrics/agent-comparison     # Agent efficiency
GET /api/sessions/recent              # Latest sessions
```

## 🎨 Customization

### Change Refresh Interval

Edit `frontend/public/js/dashboard.js`:

```javascript
// Change from 30s to 60s
refreshInterval = setInterval(refreshDashboard, 60000);
```

### Modify Chart Colors

Edit `frontend/public/js/charts.js`:

```javascript
// Color palette
const color = d3.scaleOrdinal()
  .range(['#667eea', '#764ba2', '#f093fb', '#4facfe']);
```

### Adjust Chart Dimensions

In each render function, modify:

```javascript
const height = 300;  // Change chart height
```

## 🔧 Troubleshooting

### "Failed to connect to API"
- Make sure backend API is running: `lsof -i :3333`
- Restart API: `cd backend/api && PORT=3333 DATA_DIR=../data API_KEY=dev_local_key node index.js &`

### CORS Errors
- Use Python HTTP server (Option 1)
- Or update `backend/api/index.js` CORS settings

### No Data Showing
- Check you have data: `sqlite3 backend/data/agent_analytics.duckdb "SELECT COUNT(*) FROM raw.agent_sessions"`
- Check API responses in browser dev tools (Network tab)

### Charts Not Rendering
- Open browser console (F12) for errors
- Check D3.js loaded: `console.log(d3.version)` should show version

## 📱 Mobile Support

Dashboard is responsive and works on mobile devices, though best viewed on desktop for chart interactions.

## 🚀 Next Steps

**Add More Visualizations:**
- Token usage heatmap (by hour/day)
- Cost forecasting (trend projection)
- Developer comparison (if multi-user)
- Agent efficiency trends

**Enhance Interactivity:**
- Date range picker
- Agent filter dropdown
- Export to CSV/PNG
- Dark mode toggle

**Real-time Features:**
- WebSocket for live session updates
- Push notifications for cost alerts
- Live token counter

## 🎯 Performance

- **Chart Rendering:** <100ms (D3 animations)
- **API Calls:** 5 parallel requests on refresh
- **Data Transfer:** <10KB per refresh
- **Browser Support:** Chrome, Firefox, Safari, Edge (modern versions)

---

Built with ❤️ using D3.js v7 and vanilla JavaScript
