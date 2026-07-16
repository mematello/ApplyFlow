import { GoogleGenAI, Type } from '@google/genai';

try {
  const ai = new GoogleGenAI({ apiKey: "test" });
  console.log("Init OK");
  console.log("Type:", Type);
} catch (e) {
  console.error("Init Error:", e);
}
