const pdfParse = require('pdf-parse');
const logger = require('../../utils/logger');

async function extractPdf(base64) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    return cleanText(data.text || '');
  } catch (err) {
    logger.error(`PDF extraction failed: ${err.message}`);
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  }
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { extractPdf };