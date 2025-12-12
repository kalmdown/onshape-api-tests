// Load environment variables first
require('dotenv').config();

// app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const planesRouter = require('./routes/planesRouter');
const onshapeProxyRouter = require('./routes/onshapeProxyRouter');
const authRouter = require('./routes/authRouter');
const urlParserRouter = require('./routes/urlParserRouter');

// Log environment variables (with sensitive data masked)
console.log('Environment variables loaded:', {
  ONSHAPE_API_KEY: process.env.ONSHAPE_API_KEY ? '****' : undefined,
  ONSHAPE_SECRET: process.env.ONSHAPE_SECRET ? '****' : undefined,
  ONSHAPE_BASE_URL: process.env.ONSHAPE_BASE_URL,
  PORT: process.env.PORT,
  LOG_LEVEL: process.env.LOG_LEVEL
});

// Create Express app
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', limiter);

// Create public directory for frontend files if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Routes
app.use('/auth', authRouter);
app.use('/planes', planesRouter);
app.use('/onshape', onshapeProxyRouter);
app.use('/api/url-parser', urlParserRouter);

// Serve the index.html page at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'An unexpected error occurred',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser at http://localhost:${PORT} to access the interface`);
});

module.exports = app;