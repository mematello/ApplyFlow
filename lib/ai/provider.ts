import { GoogleGenAI } from '@google/genai';
import { parseGeminiError } from './models';

export interface AiProvider {
  /**
   * Generates a structured JSON object according to the provided schema.
   */
  generateObject(
    prompt: string, 
    schema: any, 
    modelName: string, 
    content: string
  ): Promise<string>;

  /**
   * Performs a lightweight request to validate the provided API key.
   * Throws an error for transient failures, or returns false if the key is invalid.
   */
  validateKey(apiKey: string): Promise<boolean>;
}

export class GoogleGeminiProvider implements AiProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateObject(prompt: string, schema: any, modelName: string, content: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: modelName,
      contents: content,
      config: {
        systemInstruction: prompt,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("No response text from AI model");
    }

    return response.text;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const tempAi = new GoogleGenAI({ apiKey });
      await tempAi.models.get({ model: 'gemini-3.5-flash' });
      return true;
    } catch (error: any) {
      const parsed = parseGeminiError(error);
      
      if (parsed.isUnavailableError || parsed.isQuotaError) {
        throw new Error("Provider is currently unavailable or rate-limited. Please try again later.");
      }
      
      if (parsed.statusCode === 400 || parsed.statusCode === 401 || parsed.statusCode === 403) {
        return false;
      }
      
      return false;
    }
  }
}

/**
 * Factory to instantiate the correct AiProvider.
 */
export function getProvider(providerName: string, apiKey: string): AiProvider {
  switch (providerName.toLowerCase()) {
    case 'google':
      return new GoogleGeminiProvider(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${providerName}`);
  }
}
