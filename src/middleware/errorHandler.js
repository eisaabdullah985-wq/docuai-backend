const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDev      = process.env.NODE_ENV === 'development';

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → [${statusCode}] ${err.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → [${statusCode}] ${err.message}`);
  }

  res.status(statusCode).json({
    status:  'error',
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;