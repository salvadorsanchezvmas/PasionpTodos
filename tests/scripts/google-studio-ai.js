// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import { config } from "dotenv";
config({ path: ".env.dev" });

import CHICKEN_CLASSIFIER_PROMPT from "./chicken-classifier-prompt.js";
import IMAGE_BASE64 from "./image.js";

const { GEMINI_API_KEY } = process.env;
console.log(`GEMINI_API_KEY: `, GEMINI_API_KEY);

const { GoogleGenAI, ThinkingLevel, Type } = await import("@google/genai");

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env['GEMINI_API_KEY'],
  });
  const config = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["is_valid"],
      properties: {
        is_valid: {
          type: Type.BOOLEAN,
        },
      },
    },
  };
  const model = 'gemini-3.1-flash-lite-preview';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            data: IMAGE_BASE64,
            mimeType: 'image/jpeg',
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
  let fileIndex = 0;
  for await (const chunk of response) {
    if (chunk.text) {
      console.log(chunk.text);
    }
  }
}

main();