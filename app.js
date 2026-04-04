const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const analyzeRoutes = require('./src/routes/analyzeRoutes');
const errorHandler  = require('./src/middleware/errorHandler');
const rateLimiter   = require('./src/middleware/rateLimiter');
const logger        = require('./src/utils/logger');

const app = express();

// ── Core middleware 
app.use(cors());
app.use(express.json({ limit: '50mb' }));   // base64 payloads can be large
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Rate limiting
app.use('/api/document-analyze', rateLimiter);

// ── Routes 
app.use('/api', analyzeRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'DocuAI - Document Analysis API',
    status: 'live',
    endpoints: {
      health: '/health',
      analyze: '/api/document-analyze',
    },
    authentication: 'Use x-api-key header',
    supportedFileTypes: ['pdf', 'docx', 'image'],
  });
});
// ── Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'docuai', timestamp: new Date().toISOString() })
);

// ── Centralised error handler 
app.use(errorHandler);

module.exports = app;