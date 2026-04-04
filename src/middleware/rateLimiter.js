const rateLimit = require('express-rate-limit');

// 30 requests per minute per IP — generous enough for hackathon testing
module.exports = rateLimit({
  windowMs: 60 * 1000,
  max:      30,
  message:  { status: 'error', message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});