import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

describe("isValidImage", () => {
  let isValidImage;
  let mockGenerateContentStream;

  beforeEach(async () => {
    // Set environment variables BEFORE importing the module
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_MODEL = "test-model";

    // Clear module cache to allow re-import with new env vars
    jest.resetModules();

    // Mock @google/genai before importing the module
    mockGenerateContentStream = jest.fn();
    jest.unstable_mockModule("@google/genai", () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      })),
      ThinkingLevel: { LOW: "low" },
      Type: {
        OBJECT: "object",
        BOOLEAN: "boolean",
        STRING: "string",
      },
    }));

    // Mock dotenv/config to do nothing (prevent actual .env loading)
    jest.unstable_mockModule("dotenv/config", () => ({}));

    // Mock the prompt module
    jest.unstable_mockModule("../../src/services/chicken-classifier-prompt.js", () => ({
      default: "Test prompt",
    }));

    // Import the module after all mocks are set up
    const module = await import("../../src/services/is_valid_image.js");
    isValidImage = module.isValidImage;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("parameter validation", () => {
    it("should throw error when imageBase64 is missing", async () => {
      await expect(isValidImage(null, "image/jpeg")).rejects.toThrow(
        "Both imageBase64 and mimeType parameters are required"
      );
    });

    it("should throw error when mimeType is missing", async () => {
      await expect(isValidImage("base64data", null)).rejects.toThrow(
        "Both imageBase64 and mimeType parameters are required"
      );
    });

    it("should throw error when imageBase64 is empty string", async () => {
      await expect(isValidImage("", "image/jpeg")).rejects.toThrow(
        "Both imageBase64 and mimeType parameters are required"
      );
    });

    it("should throw error when mimeType is empty string", async () => {
      await expect(isValidImage("base64data", "")).rejects.toThrow(
        "Both imageBase64 and mimeType parameters are required"
      );
    });
  });

  describe("environment variable validation", () => {
    it("should throw error when GEMINI_API_KEY is missing", async () => {
      jest.resetModules();
      delete process.env.GEMINI_API_KEY;

      const { isValidImage: freshImport } = await import("../../src/services/is_valid_image.js");
      await expect(freshImport("base64data", "image/jpeg")).rejects.toThrow(
        "Missing required environment variables: GEMINI_API_KEY or GEMINI_MODEL"
      );
    });

    it("should throw error when GEMINI_MODEL is missing", async () => {
      jest.resetModules();
      delete process.env.GEMINI_MODEL;

      const { isValidImage: freshImport } = await import("../../src/services/is_valid_image.js");
      await expect(freshImport("base64data", "image/jpeg")).rejects.toThrow(
        "Missing required environment variables: GEMINI_API_KEY or GEMINI_MODEL"
      );
    });
  });

  describe("successful validation", () => {
    it("should return is_valid true for valid chicken image", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: '{"is_valid":true,"reason":"Valid chicken dish"}' };
        },
      };
      mockGenerateContentStream.mockResolvedValue(mockStream);

      const result = await isValidImage("base64data", "image/jpeg");

      expect(result).toEqual({
        is_valid: true,
        reason: "Valid chicken dish",
      });
    });

    it("should return is_valid false for invalid image", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: '{"is_valid":false,"reason":"Not a chicken dish"}' };
        },
      };
      mockGenerateContentStream.mockResolvedValue(mockStream);

      const result = await isValidImage("base64data", "image/png");

      expect(result).toEqual({
        is_valid: false,
        reason: "Not a chicken dish",
      });
    });

    it("should handle streamed response with multiple chunks", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: '{"is_valid":' };
          yield { text: 'true,"reason":"Valid"}' };
        },
      };
      mockGenerateContentStream.mockResolvedValue(mockStream);

      const result = await isValidImage("base64data", "image/jpeg");

      expect(result).toEqual({
        is_valid: true,
        reason: "Valid",
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when API call fails", async () => {
      mockGenerateContentStream.mockRejectedValue(new Error("API connection failed"));

      await expect(isValidImage("base64data", "image/jpeg")).rejects.toThrow(
        "Failed to validate chicken image: API connection failed"
      );
    });

    it("should throw error when response is not valid JSON", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "not valid json" };
        },
      };
      mockGenerateContentStream.mockResolvedValue(mockStream);

      await expect(isValidImage("base64data", "image/jpeg")).rejects.toThrow(
        "Failed to parse API response: not valid json"
      );
    });

    it("should throw error when response is empty", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "" };
        },
      };
      mockGenerateContentStream.mockResolvedValue(mockStream);

      await expect(isValidImage("base64data", "image/jpeg")).rejects.toThrow(
        "Failed to parse API response: "
      );
    });
  });
});
