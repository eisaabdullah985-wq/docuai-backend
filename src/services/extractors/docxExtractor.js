const mammoth = require('mammoth');
const logger  = require('../../utils/logger');

/**
 * Extract plain text from a base64-encoded DOCX file.
 *
 * @param {string} base64 - base64 string of the DOCX file
 * @returns {Promise<string>} extracted text
 */
async function extractDocx(base64) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  } catch (err) {
    logger.error(`DOCX extraction failed: ${err.message}`);
    throw new Error(`Failed to extract text from DOCX: ${err.message}`);
  }
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { extractDocx };