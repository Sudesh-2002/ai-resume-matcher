const pdfParse = require('pdf-parse');
const fs = require('fs');

const extractPdfText = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text.trim();
};

module.exports = extractPdfText;