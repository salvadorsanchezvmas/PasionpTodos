import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

import { mockGetLastNMsgs } from "../../__mocks__/getLastNMsgs.js";
import { ReadLastNMessages } from "../../../src/application/read_last_n_messages.js";

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get("/pollo/status/:idwhatsapp", async (req, res) => {
    const { idwhatsapp } = req.params;
    const lastMsgs = req.query.lastMsgs;

    try {
      const result = await ReadLastNMessages(idwhatsapp, lastMsgs);

      if (result.stat === "error") {
        const isValidationError = result.data.message.includes("required");
        return res.status(isValidationError ? 400 : 500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Unexpected error in /pollo/status endpoint:", error.message);
      return res.status(500).json({
        stat: "error",
        data: { message: "An unexpected error occurred" },
      });
    }
  });

  return app;
};

describe("GET /pollo/status/:idwhatsapp E2E Tests", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Valid Requests", () => {
    it("should return 200 with empty failedLogs when no data exists", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789")
        .expect(200);

      expect(response.body).toEqual({
        stat: "ok",
        data: {
          failedLogs: [],
        },
        count: 0,
      });
    });

    it("should return 200 with failedLogs when data exists", async () => {
      const mockLogs = [
        { msg_to_dev: "Error 1", msg_to_user: "Retry 1", time: "2026-04-27T10:00:00.000Z" },
        { msg_to_dev: "Error 2", msg_to_user: "Retry 2", time: "2026-04-27T11:00:00.000Z" },
      ];
      mockGetLastNMsgs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get("/pollo/status/123456789")
        .expect(200);

      expect(response.body).toEqual({
        stat: "ok",
        data: {
          failedLogs: mockLogs,
        },
        count: 2,
      });
    });

    it("should accept lastMsgs query parameter", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789?lastMsgs=5")
        .expect(200);

      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 5);
      expect(response.body.count).toBe(0);
    });

    it("should cap lastMsgs at 100 when exceeding maximum", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789?lastMsgs=200")
        .expect(200);

      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 100);
    });

    it("should default lastMsgs to 10 for invalid values", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789?lastMsgs=invalid")
        .expect(200);

      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 10);
    });
  });

  describe("Invalid ID Validation", () => {
    it("should return 400 when idwhatsapp is empty", async () => {
      const response = await request(app)
        .get("/pollo/status/%20%20%20")
        .expect(400);

      expect(response.body.stat).toBe("error");
      expect(response.body.data.message).toContain("required");
    });
  });

  describe("Service Error Handling", () => {
    it("should return 500 when getLastNMsgs throws", async () => {
      mockGetLastNMsgs.mockRejectedValue(new Error("Firebase connection failed"));

      const response = await request(app)
        .get("/pollo/status/123456789")
        .expect(500);

      expect(response.body).toEqual({
        stat: "error",
        data: { message: "Firebase connection failed" },
      });
    });
  });

  describe("Response Format", () => {
    it("should include correct Content-Type header", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should include proper JSON structure", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);

      const response = await request(app)
        .get("/pollo/status/123456789")
        .expect(200);

      expect(response.body).toHaveProperty("stat");
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("failedLogs");
      expect(response.body).toHaveProperty("count");
    });
  });
});