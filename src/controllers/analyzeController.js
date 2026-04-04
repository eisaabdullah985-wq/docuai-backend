const { extractPdf }   = require('../services/extractors/pdfExtractor');
const { extractDocx }  = require('../services/extractors/docxExtractor');
const { extractImage } = require('../services/extractors/imageExtractor');
const { analyseDocument } = require('../services/aiService');
const { SUPPORTED_FILE_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

exports.analyze = async (req, res, next) => {
  try {
    const { fileName, fileType, fileBase64 } = req.body;

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ status: 'error', message: '`fileName` is required.' });
    }
    if (!fileType || !SUPPORTED_FILE_TYPES.includes(fileType.toLowerCase())) {
      return res.status(400).json({
        status:    'error',
        message:   `\`fileType\` must be one of: ${SUPPORTED_FILE_TYPES.join(', ')}.`,
      });
    }
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ status: 'error', message: '`fileBase64` is required.' });
    }

    const stripped = fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');

    let fileBuffer;
    try {
        fileBuffer = Buffer.from(stripped, 'base64');
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new Error('Empty decoded buffer');
        }
        } catch {
        return res.status(400).json({
            status: 'error',
            message: '`fileBase64` is not valid base64.',
        });
    }

    const type = fileType.toLowerCase();
    logger.info(`Analyzing document: ${fileName} (${type})`);

    let extractedText;

    switch (type) {
      case 'pdf':
        extractedText = await extractPdf(stripped);
        break;
      case 'docx':
        extractedText = await extractDocx(stripped);
        break;
      case 'image':
        extractedText = await extractImage(stripped);
        break;
      default:
        return res.status(400).json({ status: 'error', message: 'Unsupported file type.' });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(422).json({
        status:  'error',
        message: 'No text could be extracted from the document. The file may be empty, scanned without OCR-readable content, or corrupted.',
      });
    }

    logger.info(`Extracted ${extractedText.length} characters from ${fileName}`);

    const analysis = await analyseDocument(extractedText, type);

    logger.info(`Analysis complete for ${fileName} — sentiment: ${analysis.sentiment}`);

    return res.status(200).json({
      status:    'success',
      fileName,
      summary:   analysis.summary,
      entities:  analysis.entities,
      sentiment: analysis.sentiment,
    });

  } catch (err) {
    next(err);
  }
};