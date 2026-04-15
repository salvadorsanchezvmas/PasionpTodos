// To run this code you need to install the following dependencies:
// npm install @google/genai mime dotenv

import { config } from "dotenv";
config({ path: "../../.env" });

console.log(process.env);

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env["GEMINI_API_KEY"],
  });
  const config = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MINIMAL,
    },
  };
  const model = "gemini-3.1-flash-lite-preview";
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `hello, how can you help me?`,
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
