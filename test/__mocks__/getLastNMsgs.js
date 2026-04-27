import { jest } from "@jest/globals";

// Create singleton mock for getLastNMsgs
const mockFn = jest.fn();
export const getLastNMsgs = mockFn;

// Export mockFn for test access
export const mockGetLastNMsgs = mockFn;

// Helper to reset and configure mock in beforeEach
export const resetGetLastNMsgsMock = () => {
  jest.clearAllMocks();
  mockFn.mockReset();
};

// Helper to setup resolved mock
export const setupResolvedMock = (value) => {
  mockFn.mockResolvedValue(value);
};

// Helper to setup rejected mock
export const setupRejectedMock = (error) => {
  mockFn.mockRejectedValue(error);
};