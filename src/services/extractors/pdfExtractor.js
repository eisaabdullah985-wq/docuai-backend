const pdfParse = require('pdf-parse');
const logger = require('../../utils/logger');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const pdfPoppler = require('pdf-poppler');
const Tesseract = require('tesseract.js');
const { preprocessForOCR } = require('../../utils/ocrPreprocess');
const { PDF_MIN_TEXT_THRESHOLD } = require('../../config/constants');

async function extractPdf(base64) {
  try {
    const buffer = Buffer.from(base64, 'base64');

    // Step 1: Try native text extraction
    const data = await pdfParse(buffer);
    const parsedText = cleanText(data.text || '');

    if (isTextSufficient(parsedText)) {
      logger.info(`PDF text layer extraction succeeded.`);
      return parsedText;
    }

    logger.warn(`PDF text layer weak or empty. Attempting OCR fallback...`);

    try {
      const ocrText = await extractPdfViaOCR(buffer);

      if (ocrText && ocrText.trim().length > 0) {
        return cleanText(ocrText);
      }

      logger.warn(`PDF OCR fallback returned no usable text. Using parsed text instead.`);
      return parsedText;
    } catch (ocrErr) {
      logger.warn(`PDF OCR fallback failed: ${ocrErr.message}. Using parsed text instead.`);
      return parsedText;
    }
  } catch (err) {
    logger.error(`PDF extraction failed: ${err.message}`);
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  }
}

function isTextSufficient(text) {
  if (!text) return false;
  if (text.trim().length < PDF_MIN_TEXT_THRESHOLD) return false;

  const alphaChars = (text.match(/[A-Za-z]/g) || []).length;
  const totalChars = text.length || 1;
  const alphaRatio = alphaChars / totalChars;

  return alphaRatio > 0.2;
}

async function extractPdfViaOCR(pdfBuffer) {
  const tempRoot = path.join(os.tmpdir(), `docuai-${crypto.randomUUID()}`);
  const pdfPath = path.join(tempRoot, 'input.pdf');

  fs.mkdirSync(tempRoot, { recursive: true });
  fs.writeFileSync(pdfPath, pdfBuffer);

  const opts = {
    format: 'png',
    out_dir: tempRoot,
    out_prefix: 'page',
    page: null,
  };

  try {
    await pdfPoppler.convert(pdfPath, opts);

    const files = fs.readdirSync(tempRoot)
      .filter((f) => f.endsWith('.png'))
      .sort();

    if (files.length === 0) {
      throw new Error('No page images generated from PDF.');
    }

    const pagesToOCR = files.slice(0, 3);
    const lang = process.env.TESSERACT_LANG || 'eng';

    let fullText = '';

    for (const file of pagesToOCR) {
      const imagePath = path.join(tempRoot, file);
      logger.info(`OCR fallback on PDF page: ${file}`);

      const imageBuffer = fs.readFileSync(imagePath);
      const processedBuffer = await preprocessForOCR(imageBuffer);

      const { data } = await Tesseract.recognize(processedBuffer, lang, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`PDF OCR progress (${file}): ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      fullText += `\n\n${data.text}`;
    }

    return fullText;
  } finally {
    cleanupDir(tempRoot);
  }
}

function cleanupDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    logger.warn(`Failed to clean temp OCR dir: ${err.message}`);
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