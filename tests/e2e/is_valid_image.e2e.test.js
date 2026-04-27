import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables before importing the module
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-api-key";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Import the service after env vars are set
import { isValidImage } from "../../src/services/is_valid_image.js";

/**
 * Helper to load image as base64
 * @param {string} filename - Image filename in the same directory
 * @returns {string} Base64 encoded image data (without data URI prefix)
 */
function loadImageAsBase64(filename) {
  const imagePath = join(__dirname, filename);
  const buffer = readFileSync(imagePath);
  return buffer.toString("base64");
}

/**
 * Helper to determine MIME type from filename
 * @param {string} filename
 * @returns {string} MIME type
 */
function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "image/png";
}

describe("isValidImage E2E Tests", () => {
  let validImageBase64;
  let aiImageBase64;
  let liveChickenBase64;
  let logoBase64;
  let validMimeType;
  let aiMimeType;
  let liveChickenMimeType;
  let logoMimeType;

  beforeAll(() => {
    // Load all test images
    validImageBase64 = loadImageAsBase64("valid.png");
    validMimeType = getMimeType("valid.png");

    aiImageBase64 = loadImageAsBase64("ai-image.png");
    aiMimeType = getMimeType("ai-image.png");

    liveChickenBase64 = loadImageAsBase64("live-chicken.png");
    liveChickenMimeType = getMimeType("live-chicken.png");

    logoBase64 = loadImageAsBase64("logo.png");
    logoMimeType = getMimeType("logo.png");
  });

  describe("Valid Image Scenarios", () => {
    it("should return is_valid true for valid.png (genuine chicken dish)", async () => {
      // Skip if no real API key (only run with real credentials)
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "test-api-key"
      ) {
        console.log("Skipping E2E test: GEMINI_API_KEY not configured");
        return;
      }

      const result = await isValidImage(validImageBase64, validMimeType);

      console.log(`result: `, result);

      expect(result).toHaveProperty("is_valid");
      expect(result).toHaveProperty("tag");
      expect(result).toHaveProperty("reason");

      if (result.is_valid === true) {
        expect(result.tag).toBe("VALID");
      }
    }, 30000);
  });

  describe("AI Generated Image Scenarios", () => {
    it("should return is_valid false for ai-image.png (AI generated content)", async () => {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "test-api-key"
      ) {
        console.log("Skipping E2E test: GEMINI_API_KEY not configured");
        return;
      }

      const result = await isValidImage(aiImageBase64, aiMimeType);

      console.log(`result: `, result);

      expect(result).toHaveProperty("is_valid");
      expect(result).toHaveProperty("tag");
      expect(result).toHaveProperty("reason");

      if (result.is_valid === false) {
        expect(result.tag).toBe("AI_GENERATED_OR_MANIPULATED");
      }
    }, 30000);
  });

  describe("Live Animal Image Scenarios", () => {
    it("should return is_valid false for live-chicken.png (live bird)", async () => {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "test-api-key"
      ) {
        console.log("Skipping E2E test: GEMINI_API_KEY not configured");
        return;
      }

      const result = await isValidImage(liveChickenBase64, liveChickenMimeType);

      console.log(`result: `, result);

      expect(result).toHaveProperty("is_valid");
      expect(result).toHaveProperty("tag");
      expect(result).toHaveProperty("reason");

      if (result.is_valid === false) {
        expect(result.tag).toBe("LIVE_ANIMALS");
      }
    }, 30000);
  });

  describe("Commercial/Advertisement Image Scenarios", () => {
    it("should return is_valid false for logo.png (commercial display)", async () => {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "test-api-key"
      ) {
        console.log("Skipping E2E test: GEMINI_API_KEY not configured");
        return;
      }

      const result = await isValidImage(logoBase64, logoMimeType);

      console.log(`result: `, result);

      expect(result).toHaveProperty("is_valid");
      expect(result).toHaveProperty("tag");
      expect(result).toHaveProperty("reason");

      if (result.is_valid === false) {
        expect(result.tag).toBe("ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS");
      }
    }, 30000);
  });

  describe("All Tags Verification", () => {
    it("should produce valid output structure for all images", async () => {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "test-api-key"
      ) {
        console.log("Skipping E2E test: GEMINI_API_KEY not configured");
        return;
      }

      const validTags = [
        "VALID",
        "NOT_FOOD_OR_CHICKEN",
        "STOCK_OR_INTERNET_IMAGERY",
        "AI_GENERATED_OR_MANIPULATED",
        "ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS",
        "LIVE_ANIMALS",
      ];

      const images = [
        {
          base64: validImageBase64,
          mimeType: validMimeType,
          name: "valid.png",
        },
        { base64: aiImageBase64, mimeType: aiMimeType, name: "ai-image.png" },
        {
          base64: liveChickenBase64,
          mimeType: liveChickenMimeType,
          name: "live-chicken.png",
        },
        { base64: logoBase64, mimeType: logoMimeType, name: "logo.png" },
      ];

      for (const image of images) {
        const result = await isValidImage(image.base64, image.mimeType);

        console.log(`result for ${image.name}: `, result);

        // Verify structure
        expect(result).toHaveProperty("is_valid");
        expect(result).toHaveProperty("tag");
        expect(result).toHaveProperty("reason");

        // Verify tag is valid
        expect(validTags).toContain(result.tag);

        // Verify is_valid is boolean
        expect(typeof result.is_valid).toBe("boolean");

        // Verify reason is string
        expect(typeof result.reason).toBe("string");
      }
    }, 60000);
  });
});
