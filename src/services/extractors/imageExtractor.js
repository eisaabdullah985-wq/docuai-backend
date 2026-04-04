const Tesseract = require('tesseract.js');
const logger = require('../../utils/logger');
const { preprocessForOCR } = require('../../utils/ocrPreprocess');


async function extractImage(base64) {
  const lang = process.env.TESSERACT_LANG || 'eng';

  try {
    const buffer = Buffer.from(base64, 'base64');

    logger.info(`Preprocessing image for OCR...`);
    const processedBuffer = await preprocessForOCR(buffer);

    logger.info(`Running OCR on image (lang: ${lang})...`);
    const { data } = await Tesseract.recognize(processedBuffer, lang, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return cleanText(data.text);
  } catch (err) {
    logger.error(`Image OCR failed: ${err.message}`);
    throw new Error(`Failed to extract text from image: ${err.message}`);
  }
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { extractImage };