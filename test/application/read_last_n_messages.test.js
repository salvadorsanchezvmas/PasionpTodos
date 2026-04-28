import { jest } from "@jest/globals";
import { getLastNMsgs, mockGetLastNMsgs } from "../__mocks__/getLastNMsgs.js";
import { ReadLastNMessages } from "../../src/application/read_last_n_messages.js";

describe("ReadLastNMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Parameter Validation", () => {
    it("should return error when idwhatsapp is null", async () => {
      const result = await ReadLastNMessages(null, 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("idWhatsApp parameter is required and cannot be empty");
    });

    it("should return error when idwhatsapp is undefined", async () => {
      const result = await ReadLastNMessages(undefined, 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("idWhatsApp parameter is required and cannot be empty");
    });

    it("should return error when idwhatsapp is empty string", async () => {
      const result = await ReadLastNMessages("", 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("idWhatsApp parameter is required and cannot be empty");
    });

    it("should return error when idwhatsapp is whitespace only", async () => {
      const result = await ReadLastNMessages("   ", 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("idWhatsApp parameter is required and cannot be empty");
    });

    it("should return error when idwhatsapp is not a string", async () => {
      const result = await ReadLastNMessages(12345, 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("idWhatsApp parameter is required and cannot be empty");
    });
  });

  describe("lastMsgs Parameter Handling", () => {
    it("should default to 10 when lastMsgs is undefined", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", undefined);
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 10);
      expect(result.stat).toBe("ok");
    });

    it("should default to 10 when lastMsgs is NaN", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", "abc");
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 10);
      expect(result.stat).toBe("ok");
    });

    it("should default to 10 when lastMsgs is negative", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", -5);
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 10);
      expect(result.stat).toBe("ok");
    });

    it("should default to 10 when lastMsgs is zero", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", 0);
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 10);
      expect(result.stat).toBe("ok");
    });

    it("should cap lastMsgs at 100 when exceeding maximum", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", 150);
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 100);
      expect(result.stat).toBe("ok");
    });

    it("should use valid lastMsgs within range", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", 50);
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 50);
      expect(result.stat).toBe("ok");
    });

    it("should parse string lastMsgs to integer", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", "25");
      expect(mockGetLastNMsgs).toHaveBeenCalledWith("123456789", 25);
      expect(result.stat).toBe("ok");
    });
  });

  describe("Successful Responses", () => {
    it("should return ok stat with empty failedLogs when no data exists", async () => {
      mockGetLastNMsgs.mockResolvedValue([]);
      const result = await ReadLastNMessages("123456789", 10);
      expect(result.stat).toBe("ok");
      expect(result.data.failedLogs).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("should return ok stat with failedLogs when data exists", async () => {
      const mockLogs = [
        { is_valid: false, tag: "NOT_FOOD_OR_CHICKEN", msg_to_dev: "Error 1", msg_to_user: "Retry 1", time: "2026-04-27T10:00:00.000Z" },
        { is_valid: true, tag: "VALID", msg_to_dev: "OK", msg_to_user: "Retry 2", time: "2026-04-27T11:00:00.000Z" },
      ];
      mockGetLastNMsgs.mockResolvedValue(mockLogs);
      const result = await ReadLastNMessages("123456789", 10);
      expect(result.stat).toBe("ok");
      expect(result.data.failedLogs).toEqual(mockLogs);
      expect(result.count).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should return error stat when getLastNMsgs throws", async () => {
      mockGetLastNMsgs.mockRejectedValue(new Error("Firebase connection failed"));
      const result = await ReadLastNMessages("123456789", 10);
      expect(result.stat).toBe("error");
      expect(result.data.message).toBe("Firebase connection failed");
    });
  });
});