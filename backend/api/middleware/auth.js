/**
 * API Key Authentication Middleware
 * Validates API key from Authorization header or x-api-key header
 */

const API_KEY = process.env.API_KEY || 'dev_local_key';

const authenticate = (req, res, next) => {
  // Get API key from Authorization header (Bearer token) or x-api-key header
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];
  
  let providedKey = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }
  
  // For local development, allow requests without auth
  // In production, this should be enforced
  if (process.env.NODE_ENV === 'development' && !providedKey) {
    console.warn('⚠️  Request without API key (development mode)');
    return next();
  }
  
  // Validate API key
  if (providedKey && providedKey === API_KEY) {
    return next();
  }
  
  // Invalid or missing API key
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid or missing API key. Provide API key via Authorization: Bearer <key> or x-api-key header.'
  });
};

module.exports = authenticate;

