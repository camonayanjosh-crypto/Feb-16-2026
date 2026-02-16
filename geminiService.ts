
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_VERSE = {
  verse: "For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.",
  reference: "Jeremiah 29:11"
};

/**
 * Utility to wait for a specific duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches a daily verse with built-in retry logic for handling temporary 503 errors.
 */
export async function fetchDailyVerse(retries = 3, delay = 1000): Promise<{ verse: string; reference: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Give me a beautiful and encouraging NIV Bible verse for today. Return it in JSON format.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verse: { type: Type.STRING },
              reference: { type: Type.STRING },
            },
            required: ["verse", "reference"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      return JSON.parse(text);
    } catch (error: any) {
      const isServiceUnavailable = error?.message?.includes('503') || error?.status === 503;
      const isHighDemand = error?.message?.includes('high demand');

      // If it's a 503 or high demand error, wait and try again
      if ((isServiceUnavailable || isHighDemand) && i < retries - 1) {
        console.warn(`Gemini API high demand (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2; // Exponential backoff
        continue;
      }

      console.error("Gemini API Error:", error);
      break; // For other errors, don't retry and go to fallback
    }
  }

  return DEFAULT_VERSE;
}
