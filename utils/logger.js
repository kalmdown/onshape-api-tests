// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Generate timestamped filename
function generateFilename() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
}

// Helper function to truncate long values
function truncateValue(value, maxLength = 100) {
  if (!value) return value;
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length <= 5) return value;
    return `[${value.slice(0, 5).join(', ')}... +${value.length - 5} more]`;
  }
  
  // Handle objects
  if (typeof value === 'object') {
    const str = safeStringify(value);
    if (str.length <= maxLength) return value;
    return str.substring(0, maxLength) + '...';
  }
  
  // Handle strings
  if (typeof value === 'string') {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  }
  
  return value;
}

// Helper function to safely stringify objects
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
      return value;
    }
    return value;
  });
}

// Helper function to clean metadata for logging
function cleanMetadata(metadata) {
  if (!metadata) return {};
  
  const cleaned = { ...metadata };
  delete cleaned.level;
  delete cleaned.message;
  delete cleaned.timestamp;
  delete cleaned.label;
  return cleaned;
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      let msg = `${timestamp} ${level}: ${message}`;
      if (Object.keys(metadata).length > 0) {
        const cleanedMetadata = cleanMetadata(metadata);
        const truncatedMetadata = Object.entries(cleanedMetadata).reduce((acc, [key, value]) => {
          acc[key] = truncateValue(value);
          return acc;
        }, {});
        msg += `\n  ${safeStringify(truncatedMetadata)}`;
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, generateFilename()),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Add API call logging method
logger.logApiCall = function(description, method, url, data = null) {
  this.info(`Retrieving data from Onshape API\n  ${method} ${url}`);
  if (data) {
    this.info('Request data:', data);
  }
};

// Add API response logging method
logger.logApiResponse = function(response) {
  this.info('Response from Onshape API:', response);
};

// Add API error logging method
logger.logApiError = function(status, error) {
  this.error(`API error (${status}):`, error);
};

module.exports = logger;