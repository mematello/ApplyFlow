import { PDFParse } from 'pdf-parse';
import fs from 'fs';

async function main() {
  try {
    const filePath = process.argv[2];
    if (!filePath) throw new Error("No file path provided");
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    console.log(data.text);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
