// To run this code you need to install the following dependencies:
// npm install @google/genai mime dotenv

import { config } from "dotenv";
config({ path: ".env.dev" });

const { GEMINI_API_KEY } = process.env;
console.log(`GEMINI_API_KEY: `, GEMINI_API_KEY);

const { GoogleGenAI, ThinkingLevel } = await import("@google/genai");

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
          text: `how can i send  you an image heree??`,
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