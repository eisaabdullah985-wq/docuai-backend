const router     = require('express').Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const controller = require('../controllers/analyzeController');

// POST /api/document-analyze
// Protected by x-api-key header authentication
router.post('/document-analyze', apiKeyAuth, controller.analyze);

module.exports = router;