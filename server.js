require('dotenv').config();
const app    = require('./app');
const logger = require('./src/utils/logger');
 
const PORT = process.env.PORT || 5000;
 
app.listen(PORT, () => {
  logger.info(`DocuAI server running on port ${PORT}`);
  logger.info(`Environment : ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Endpoint    : POST /api/document-analyze`);
});
 
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  process.exit(1);
});