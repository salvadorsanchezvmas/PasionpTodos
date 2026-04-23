# Pollo Para Todos - Project Documentation

> **WhatsApp Flows Webhook Server** - Loyalty stamp card campaign system

---

## 📋 Index

1. [Project Overview](#1-project-overview)
2. [Use Cases](#2-use-cases)
   - [Image Validation Workflow](#21-image-validation-workflow)
---

## 1. Project Overview

**Pollo Para Todos** is a WhatsApp Business webhook server that manages a loyalty/stamp card campaign. Users send photos of chicken dishes via WhatsApp, and the system validates them using Google Gemini AI, then awards loyalty stamps stored in Firebase Firestore.

### Core Features

| Feature              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| WhatsApp Webhook     | Receives and processes image messages from WhatsApp   |
| AI Image Validation  | Validates chicken dishes using Gemini AI              |
| Loyalty System       | 110 unique stamps, promo rewards every 3 valid images |
| Firebase Integration | User authentication and Firestore database            |
| Google Cloud Storage | Stores validated album images                         |
| Email Notifications  | Sends welcome emails via Nodemailer                   |

### API Endpoints

| Method                  | Endpoint                      | Description                                    |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| `GET`                   | `/pollo/`                     | Health check                                   |
| `GET`                   | `/pollo/phook`                | WhatsApp webhook verification (Meta handshake) |
| `POST`                  | `/pollo/phook`                | WhatsApp message webhook (receives images)     |
| `POST` `/pollo/saveusr` | Register new user to Firebase |

### Tech Stack

- **Runtime:** Node.js 16+ (ES Modules)
- **Framework:** Express.js
- **Database:** Firebase Firestore + Firebase Auth
- **Storage:** Google Cloud Storage
- **AI:** Google Gemini (`@google/genai`)
- **Email:** Nodemailer
- **Testing:** Jest

---

## 2. Use Cases

### 2.1 Image Validation Workflow

**Actor:** WhatsApp User sending a chicken dish photo

**Flow:**

```
1. Backend receives metadata image from Meta
   1.1 Validates that the webhook message contains an image
   1.2 Requests the actual image from Facebook/Meta API

2. Backend validates the image using AI
   2.1 Gets user information from Firestore database
   2.2 Validates the image using Google Gemini AI
   2.3 Saves the image to Google Cloud Storage bucket
   2.4 Updates the user album data (stamps, redeem, promos)
```

#### 2.1.1 `updateAlbumData` Function - Loyalty Stamp System

This function handles the loyalty stamp logic:

1. **Validates** user profile exists in Firestore
2. **Gets** existing album and stamp count from user document
3. **Picks** random stamp number (1-110) not yet used
4. **Creates** album entry with stamp, URL, timestamp
5. **Manages** redeem/promo logic (every 3 valid images = 1 promo)
6. **Atomically updates** Firestore document

#### Return Structure

```json
{
  "stat": "ok" | "error",
  "data": {
    "message": "...",
    "newStamp": 1-110,
    "url": "GCS image URL",
    "albumCount": total stamps,
    "redeem": 0-2 (resets at 3),
    "promosCount": total promos triggered,
    "promoTriggered": true | false
  }
}
```

#### Stamp Logic Details

- **Album:** Array of stamp objects with `{stamp, url, timestamp}`
- **Stamp Numbers:** 1-110, randomly selected (excludes already-used)
- **Redeem Counter:** Increments with each valid image (0 → 1 → 2 → 3)
- **Promo Trigger:** When `redeem >= 3`, promo is triggered, counter resets to 0
- **PromosCount:** Total number of promos earned by the user

---

## Quick Reference

### NPM Scripts

```bash
npm start              # Start production server
npm run dev            # Start with nodemon (auto-reload)
npm test               # Run Jest unit tests
npm run google-studio-ai  # Test AI image validation
npm run print          # Print environment variables
```

### Environment Variables

| Variable               | Purpose                              |
| ---------------------- | ------------------------------------ |
| `GEMINI_API_KEY`       | Google Gemini AI API key             |
| `GEMINI_MODEL`         | AI model name                        |
| `FIREBASE_*`           | Firebase service account credentials |
| `BUCKET_*`             | Google Cloud Storage credentials     |
| `EMAIL_USER/PASS`      | SMTP email credentials               |
| `WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook verification        |
| `GRAPH_API_TOKEN`      | Meta Graph API token                 |
| `PORT`                 | Server port (default: 5200)          |

### Key Files

| File                                        | Description                     |
| ------------------------------------------- | ------------------------------- |
| `server.js`                                 | Main Express webhook server     |
| `fire.js`                                   | Firebase + GCS + Email logic    |
| `src/services/is_valid_image.js`            | AI image validation service     |
| `src/services/chicken-classifier-prompt.js` | AI validation prompt            |
| `tests/services/is_valid_image.test.js`     | Unit tests for image validation |
