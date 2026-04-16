import { config } from "dotenv";
config({ path: "tests/scripts/.env.test" });

import CHICKEN_CLASSIFIER_PROMPT from "./chicken-classifier-prompt.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

const { GoogleGenAI, ThinkingLevel, Type } = await import("@google/genai");

export async function isValidChicken(imageBase64, mimeType) {
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const config = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      required: ["is_valid", "reason"],
      properties: {
        is_valid: {
          type: Type.STRING,
        },
        reason: {
          type: Type.STRING,
        },
      },
    },
  };
  const model = GEMINI_MODEL;
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

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let result = "";
  for await (const chunk of response) {
    if (chunk.text) {
      result += chunk.text;
    }
  }

  return JSON.parse(result);
}