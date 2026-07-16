async function test() {
  try {
    const pdfParse = await import('pdf-parse');
    console.log("pdfParse export keys:", Object.keys(pdfParse));
    console.log("Is pdfParse.default a function?", typeof pdfParse.default);
  } catch (e) {
    console.error(e);
  }
}
test();
