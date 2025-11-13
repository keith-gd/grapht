const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');

/**
 * POST /v1/otel
 * Ingests OpenTelemetry data from OTel Collector
 * 
 * Handles OTLP format (simplified for MVP):
 * - resourceMetrics: Metrics data
 * - resourceLogs: Logs data
 * 
 * This is a simplified parser - full OTLP parsing would require
 * the OpenTelemetry SDK. For MVP, we extract key fields.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { resourceMetrics, resourceLogs } = req.body;

    let metricsInserted = 0;
    let logsInserted = 0;

    // Process metrics
    if (resourceMetrics && Array.isArray(resourceMetrics)) {
      for (const resourceMetric of resourceMetrics) {
        const resource = resourceMetric.resource || {};
        const attributes = resource.attributes || [];
        
        // Extract developer_id from resource attributes
        const developerIdAttr = attributes.find(attr => attr.key === 'developer_id' || attr.key === 'x-developer-id');
        const developerId = developerIdAttr?.value?.stringValue || null;

        // Process metric data points
        const scopeMetrics = resourceMetric.scopeMetrics || [];
        for (const scopeMetric of scopeMetrics) {
          const metrics = scopeMetric.metrics || [];
          
          for (const metric of metrics) {
            const metricName = metric.name || 'unknown';
            const dataPoints = metric.sum?.dataPoints || metric.gauge?.dataPoints || [];

            for (const dataPoint of dataPoints) {
              const timestamp = dataPoint.timeUnixNano 
                ? new Date(parseInt(dataPoint.timeUnixNano) / 1000000).toISOString()
                : new Date().toISOString();
              
              const value = dataPoint.asDouble !== undefined 
                ? dataPoint.asDouble 
                : dataPoint.asInt || 0;

              // Extract attributes from data point
              const pointAttributes = {};
              if (dataPoint.attributes) {
                for (const attr of dataPoint.attributes) {
                  pointAttributes[attr.key] = attr.value?.stringValue || attr.value?.intValue || attr.value?.doubleValue;
                }
              }

              // Insert metric
              try {
                await pool.query(
                  `INSERT INTO raw.otel_metrics (
                    timestamp,
                    developer_id,
                    metric_name,
                    metric_value,
                    attributes
                  ) VALUES (?, ?, ?, ?, ?)`,
                  [
                    timestamp,
                    developerId,
                    metricName,
                    value,
                    JSON.stringify(pointAttributes)
                  ]
                );
                metricsInserted++;
              } catch (err) {
                console.error('Error inserting metric:', err);
                // Continue processing other metrics
              }
            }
          }
        }
      }
    }

    // Process logs
    if (resourceLogs && Array.isArray(resourceLogs)) {
      for (const resourceLog of resourceLogs) {
        const resource = resourceLog.resource || {};
        const attributes = resource.attributes || [];
        
        // Extract developer_id from resource attributes
        const developerIdAttr = attributes.find(attr => attr.key === 'developer_id' || attr.key === 'x-developer-id');
        const developerId = developerIdAttr?.value?.stringValue || null;

        // Process log records
        const scopeLogs = resourceLog.scopeLogs || [];
        for (const scopeLog of scopeLogs) {
          const logRecords = scopeLog.logRecords || [];

          for (const logRecord of logRecords) {
            const timestamp = logRecord.timeUnixNano
              ? new Date(parseInt(logRecord.timeUnixNano) / 1000000).toISOString()
              : new Date().toISOString();

            const severity = logRecord.severityText || 'INFO';
            
            // Extract body (can be string or JSON)
            let body = '';
            if (logRecord.body?.stringValue) {
              body = logRecord.body.stringValue;
            } else if (logRecord.body?.bytesValue) {
              body = Buffer.from(logRecord.body.bytesValue, 'base64').toString('utf-8');
            }

            // Extract attributes
            const logAttributes = {};
            if (logRecord.attributes) {
              for (const attr of logRecord.attributes) {
                logAttributes[attr.key] = attr.value?.stringValue || attr.value?.intValue || attr.value?.doubleValue;
              }
            }

            // Insert log
            try {
              await pool.query(
                `INSERT INTO raw.otel_logs (
                  timestamp,
                  developer_id,
                  severity,
                  body,
                  attributes
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                  timestamp,
                  developerId,
                  severity,
                  body,
                  JSON.stringify(logAttributes)
                ]
              );
              logsInserted++;
            } catch (err) {
              console.error('Error inserting log:', err);
              // Continue processing other logs
            }
          }
        }
      }
    }

    console.log(`✅ OTel data ingested: ${metricsInserted} metrics, ${logsInserted} logs`);

    res.status(200).json({
      success: true,
      message: 'OTel data ingested successfully',
      metrics_inserted: metricsInserted,
      logs_inserted: logsInserted
    });

  } catch (error) {
    console.error('Error ingesting OTel data:', error);
    next(error);
  }
});

/**
 * GET /v1/otel/stats
 * Get statistics about ingested OTel data (for debugging)
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const metricsCount = await pool.query('SELECT COUNT(*) FROM raw.otel_metrics');
    const logsCount = await pool.query('SELECT COUNT(*) FROM raw.otel_logs');
    const uniqueDevelopers = await pool.query('SELECT COUNT(DISTINCT developer_id) FROM raw.otel_metrics WHERE developer_id IS NOT NULL');

    res.json({
      success: true,
      stats: {
        total_metrics: parseInt(metricsCount.rows[0].count),
        total_logs: parseInt(logsCount.rows[0].count),
        unique_developers: parseInt(uniqueDevelopers.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Error fetching OTel stats:', error);
    next(error);
  }
});

module.exports = router;

