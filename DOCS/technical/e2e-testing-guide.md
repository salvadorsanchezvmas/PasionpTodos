# End-to-End Testing Guide

## Recommended Dependencies

### Primary Options

| Dependency            | Best For               | Why                                             |
| --------------------- | ---------------------- | ----------------------------------------------- |
| **Playwright**        | Full e2e with browsers | Tests real browser behavior, supports API calls |
| **Jest + Supertest**  | API/unit testing       | Fast, great for testing HTTP endpoints          |
| **Playwright + Jest** | Both worlds            | Playwright runner for Jest                      |

## Installation

```bash
# Playwright (recommended for full e2e)
npm install -D @playwright/test
npx playwright install chromium

# For API testing
npm install -D supertest jest @types/jest
```

## Example Test Structure

```
tests/
├── e2e/
│   ├── webhook.spec.js
│   └── image-validation.spec.js
└── scripts/
    └── google-studio-ai.js
```

## Example Tests

### Webhook Verification Test

```javascript
import { test, expect } from "@playwright/test";
import request from "supertest";
import app from "../../server.js";

test("webhook verification succeeds with correct token", async () => {
  const res = await request(app).get("/pollo/phook").query({
    "hub.mode": "subscribe",
    "hub.verify_token": "pollohook2026",
    "hub.challenge": "test",
  });

  expect(res.status).toBe(200);
  expect(res.text).toBe("test");
});

test("webhook verification fails with wrong token", async () => {
  const res = await request(app).get("/pollo/phook").query({
    "hub.mode": "subscribe",
    "hub.verify_token": "wrong_token",
    "hub.challenge": "test",
  });

  expect(res.status).toBe(403);
});
```

### Image Validation Test

```javascript
import { test, expect } from "@playwright/test";
import { isValidImage } from "../../src/services/is_valid_image.js";

test("isValidImage returns valid for chicken dish", async () => {
  const imageBase64 = loadTestImage("chicken-dish.jpg");
  const result = await isValidImage(imageBase64, "image/jpeg");

  expect(result.is_valid).toBe(true);
});
```

## Configuration

### jest.config.js

```javascript
export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs"],
  testMatch: ["**/tests/**/*.spec.js"],
};
```

### playwright.config.js

```javascript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5200",
  },
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run e2e tests only
npx playwright test

# Run with coverage
npx playwright test --reporter=html
```
