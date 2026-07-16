// test
import { GoogleGenAI, Type } from '@google/genai';

async function main() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemInstruction = `You are an expert...`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: "some jd vs some resume",
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });
    console.log("Response text:", response.text);
  } catch (err) {
    console.error(err);
  }
}
main();
