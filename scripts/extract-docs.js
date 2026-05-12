const fs = require("fs");
const path = require("path");

const mammoth = require("mammoth");

const DEFAULT_INPUT = path.join("docs", "new-api.docx");
const DEFAULT_OUTPUT = path.join("docs", "extracted-api.txt");

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractDocument(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".docx") {
    return extractDocx(filePath);
  }

  throw new Error(`Unsupported document type: ${extension || "unknown"}. Expected .docx`);
}

async function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;
  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input document not found: ${resolvedInput}`);
  }

  const text = await extractDocument(resolvedInput);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, text, "utf8");

  console.log(`Extracted ${resolvedInput} -> ${resolvedOutput}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
