const express = require('express');
const cors = require('cors');
const path = require('path');
require('express-async-errors'); // Must be imported before routes to catch async errors
require('dotenv').config();

// Handle BigInt serialization
BigInt.prototype.toJSON = function() { return Number(this); }

const app = express();

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// CORS configuration - allow frontend, Metabase, and file:// for local dev
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:8000', 'http://localhost:5173', 'null'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Import routes
const commitsRouter = require('./routes/commits');
const otelRouter = require('./routes/otel');
const sessionsRouter = require('./routes/sessions');
const metricsRouter = require('./routes/metrics');
const analyticsRouter = require('./routes/analytics');
const sessionsGetRouter = require('./routes/sessions-get');
const spansRouter = require('./routes/spans');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-analytics-api'
  });
});

// API routes
app.use('/v1/commits', commitsRouter);
app.use('/v1/otel', otelRouter);
app.use('/v1/agent-sessions', sessionsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sessions', sessionsGetRouter);
app.use('/v1/spans', spansRouter);

// Root endpoint (API info)
app.get('/api', (req, res) => {
  res.json({
    name: 'Agent Analytics API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      commits: '/v1/commits',
      otel: '/v1/otel'
    }
  });
});

// Fallback to index.html for any other non-API routes (SPA support)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/v1') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent Analytics API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

