const sharp = require('sharp');

async function preprocessForOCR(inputBuffer) {
  return sharp(inputBuffer)
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

module.exports = { preprocessForOCR };