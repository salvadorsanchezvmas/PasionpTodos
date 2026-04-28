# Pollo Para Todos - Project Documentation

> **WhatsApp Flows Webhook Server** - Loyalty stamp card campaign system

---

## 📋 Index

1. [Project Overview](#1-project-overview)
2. [Use Cases](#2-use-cases)
   - [Image Validation Workflow](#21-image-validation-workflow)
   - [Get Last N Messages](#22-get-last-n-messages)
3. [Diagrams](#3-diagrams)

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

| Method | Endpoint                           | Description                                    |
| ------ | ---------------------------------- | ---------------------------------------------- |
| `GET`  | `/pollo/`                          | Health check                                   |
| `GET`  | `/pollo/phook`                     | WhatsApp webhook verification (Meta handshake) |
| `POST` | `/pollo/phook`                     | WhatsApp message webhook (receives images)     |
| `POST` | `/pollo/saveusr`                   | Register new user to Firebase                  |
| `GET`  | `/pollo/status/:idWhatsApp`        | Get last N messages for a user                 |

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

### 2.2 Get Last N Messages

**Actor:** Client application retrieving failed analysis logs

**Flow:**

```
1. Client invokes ReadLastNMessages(idwhatsapp, lastMsgs)
2. Function validates idWhatsApp parameter (required, non-empty string)
3. Function sanitizes and caps lastMsgs parameter (default: 10, max: 100)
4. Function delegates to getLastNMsgs() database service
5. Function returns JSON response with failedLogs array
```

#### Parameter Validation

| Parameter    | Required | Default | Max | Notes                                      |
| ------------ | -------- | ------- | --- | ------------------------------------------ |
| `idWhatsApp` | Yes      | -       | -   | Must be non-empty string                   |
| `lastMsgs`   | No       | 10      | 100 | Positive integer, capped at 100           |

#### Return Structure

```json
{
  "stat": "ok" | "error",
  "data": {
    "failedLogs": [
      {
        "msg_to_dev": "Error description for developer",
        "msg_to_user": "Mensaje de error para usuario",
        "time": "2026-04-28T07:19:29.000Z"
      }
    ]
  },
  "count": number
}
```

#### Error Response

```json
{
  "stat": "error",
  "data": {
    "message": "Error description here"
  }
}
```

---

## 3. Diagrams

| Diagram                          | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| [Image Validation Sequence](./DOCS/diagrams/image-validation-sequence.md) | Full chicken stamp award flow with AI validation |
| [Get Last N Messages Sequence](./DOCS/diagrams/get-last-n-msgs-sequence.md) | Failed analysis logs retrieval flow              |
