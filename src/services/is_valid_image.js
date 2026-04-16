import "dotenv/config";

import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

import CHICKEN_CLASSIFIER_PROMPT from "./chicken-classifier-prompt.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

/**
 * Validates whether an image contains a valid chicken dish prepared for human consumption.
 *
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {string} mimeType - MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns {Promise<{is_valid: boolean, reason: string}>} Object containing validation result and reason
 * @throws {Error} If API key or model is not configured, or if the API call fails
 *
 * @example
 * const result = await isValidImage(base64Image, "image/jpeg");
 * console.log(result.is_valid); // true or false
 * console.log(result.reason);   // Brief summary of the validation
 */
export async function isValidImage(imageBase64, mimeType) {
  if (!GEMINI_API_KEY || !GEMINI_MODEL) {
    throw new Error("Missing required environment variables: GEMINI_API_KEY or GEMINI_MODEL");
  }

  if (!imageBase64 || !mimeType) {
    throw new Error("Both imageBase64 and mimeType parameters are required");
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const aiConfig = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      required: ["is_valid", "reason"],
      properties: {
        is_valid: {
          type: Type.BOOLEAN,
        },
        reason: {
          type: Type.STRING,
        },
      },
    },
  };

  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: CHICKEN_CLASSIFIER_PROMPT,
        },
      ],
    },
  ];

  let result = "";

  try {
    const response = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      config: aiConfig,
      contents,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }
  } catch (error) {
    throw new Error(`Failed to validate chicken image: ${error.message}`);
  }

  try {
    return JSON.parse(result);
  } catch {
    throw new Error(`Failed to parse API response: ${result}`);
  }
}