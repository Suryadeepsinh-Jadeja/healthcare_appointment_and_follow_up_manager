import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env";
import { LlmProvider } from "../llm.types";

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor(
    apiKey: string = env.geminiApiKey,
    private model: string = env.geminiModel,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response");
    }

    return response.text;
  }
}
