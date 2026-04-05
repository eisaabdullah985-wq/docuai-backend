const router     = require('express').Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const controller = require('../controllers/analyzeController');

// POST /api/document-analyze
router.get('/document-analyze', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'DocuAI Document Analysis API is live. Use POST /api/document-analyze with x-api-key to analyze documents.',
    method: 'POST',
    requiredHeaders: ['x-api-key', 'Content-Type: application/json'],
    requiredBody: ['fileName', 'fileType', 'fileBase64'],
  });
});
// Protected by x-api-key header authentication
router.post('/document-analyze', apiKeyAuth, controller.analyze);

module.exports = router;