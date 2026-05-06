const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function extract() {
  let output = '';

  try {
    const pdfPath = './Farm Management phase 1.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    output += '=== PDF CONTENT ===\n' + data.text + '\n\n';
  } catch (err) {
    output += 'Error reading PDF: ' + err.message + '\n\n';
  }

  try {
    const docxPath = './api.docx';
    const result = await mammoth.extractRawText({path: docxPath});
    output += '=== DOCX CONTENT ===\n' + result.value + '\n\n';
  } catch (err) {
    output += 'Error reading DOCX: ' + err.message + '\n\n';
  }

  fs.writeFileSync('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\3e7d7596-d7e6-48fc-8223-43b448ccc61c\\scratch\\extracted_docs.txt', output, 'utf8');
  console.log('Extraction complete');
}

extract();
