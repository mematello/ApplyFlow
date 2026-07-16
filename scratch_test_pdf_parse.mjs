import { PDFParse } from 'pdf-parse';

async function main() {
  try {
    const res = await fetch('https://bitcoin.org/bitcoin.pdf');
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Buffer size:", buffer.length);

    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    
    console.log("Extracted characters:", data.text.length);
  } catch (e) {
    console.error("PDFParse Error:", e);
  }
}
main();
