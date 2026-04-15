// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import { config } from "dotenv";
config({ path: "tests/scripts/.env.test" });

import { readFileSync } from "fs";
import CHICKEN_CLASSIFIER_PROMPT from "./chicken-classifier-prompt.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log(`GEMINI_API_KEY: `, GEMINI_API_KEY);

const { GoogleGenAI, ThinkingLevel, Type } = await import("@google/genai");

async function main() {
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const imageBuffer = readFileSync("./tests/scripts/descarga.jpeg");
  const imageBase64 = imageBuffer.toString("base64");

  const config = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
    responseMimeType: "application/json",
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
  const model = "gemini-3.1-flash-lite-preview";
  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg",
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

  for await (const chunk of response) {
    if (chunk.text) {
      console.log(chunk.text);
    }
  }
}

main();