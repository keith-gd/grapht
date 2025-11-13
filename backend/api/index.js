const express = require('express');
const cors = require('cors');
require('express-async-errors'); // Must be imported before routes to catch async errors
require('dotenv').config();

const app = express();

// CORS configuration - allow Metabase on localhost:3001
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000'],
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

// Root endpoint
app.get('/', (req, res) => {
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

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent Analytics API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

