
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// IMPORTANT: This service assumes `process.env.API_KEY` is set in the environment.
// In a real application, you would proxy this through a backend to protect the key.

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private readonly apiKey = process.env.API_KEY;

  constructor() {
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      console.error("API_KEY environment variable not set. Gemini features will be disabled.");
    }
  }

  isConfigured(): boolean {
    return this.ai !== null;
  }

  async generateCaptionForImage(base64Image: string): Promise<string> {
    if (!this.ai) {
      return Promise.resolve("AI is not configured. Please add an API key.");
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: 'Generate a fun, short, witty caption for this wedding photo in 140 characters or less.'
    };

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error generating caption with Gemini:', error);
      return 'Could not generate a caption at this time.';
    }
  }
}
