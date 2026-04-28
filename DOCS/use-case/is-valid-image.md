# Is Valid Image - Use Case

## Story

**As a** WhatsApp user sending a chicken dish photo
**I want to** have my image validated and receive a loyalty stamp if it shows chicken
**So that** I can collect stamps and earn promos through the loyalty campaign

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Image Validation Workflow

  Scenario: Valid chicken dish photo is approved and stamp is awarded
    Given the user sends a photo of a prepared chicken dish via WhatsApp
    When the backend receives the image
    And the AI classifier validates it as genuine chicken
    Then the image is uploaded to Google Cloud Storage
    And the user receives a new random stamp (1-110)
    And the stamp is stored in the user's album in Firestore
    And the response includes the new stamp number and album count

  Scenario: AI-generated or synthetic image is rejected
    Given the user sends an AI-generated image
    When the AI classifier detects synthetic or manipulated content
    Then the image is rejected with tag "AI_GENERATED_OR_MANIPULATED"
    And the validation attempt is logged in attempts_logs collection
    And the user receives a user-friendly error message

  Scenario: Stock or internet imagery is rejected
    Given the user sends a stock photo with watermarks
    When the AI classifier detects it is not original content
    Then the image is rejected with tag "STOCK_OR_INTERNET_IMAGERY"
    And the validation attempt is logged for the user

  Scenario: Live animal image is rejected
    Given the user sends a photo of a live chicken bird
    When the AI classifier detects live animals
    Then the image is rejected with tag "LIVE_ANIMALS"
    And the user is informed that only prepared food is accepted

  Scenario: Commercial advertisement is rejected
    Given the user sends a promotional banner or flyer
    When the AI classifier detects commercial display elements
    Then the image is rejected with tag "ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS"
    And the validation attempt is logged

  Scenario: Non-chicken food image is rejected
    Given the user sends a photo of beef, vegetables, or non-chicken food
    When the AI classifier detects it does not contain chicken
    Then the image is rejected with tag "NOT_FOOD_OR_CHICKEN"
    And the validation attempt is logged

  Scenario: Promo is triggered after every 3 valid images
    Given the user has 2 existing valid stamps (redeem counter = 2)
    When the user submits another valid chicken image
    Then a promo is triggered (redeem counter reaches 3)
    And the promo count is incremented
    And the redeem counter resets to 0

  Scenario: User not found in database
    Given the WhatsApp ID does not exist in user_profile collection
    When the backend attempts to validate the image
    Then the request is rejected with error "User {idwhatsapp} not found"
    And no validation or stamp assignment occurs

  Scenario: Daily attempt limit exceeded
    Given the user has already made 3 valid attempts on the current day
    When the user submits another image
    Then the validation attempt is logged in attempts_logs collection
    And the request is rejected with error "Daily attempt limit reached"
    And no validation or stamp assignment occurs
    And the user is informed to try again tomorrow

  Scenario: Only valid attempts count toward daily limit
    Given the user has 2 valid attempts and 1 rejected attempt today
    When the user submits another image
    Then the image is still processed (only valid attempts count)
```

---

## Technical Flow

### 1. Webhook Reception

```
WhatsApp → POST /pollo/phook
├── Extract message.type ("image")
├── Extract message.image.id (mediaId)
├── Extract senderWhatsAppId (message.from)
└── Extract business_phone_number_id
```

### 2. Image Download (from Meta Graph API)

```
Step 1: GET https://graph.facebook.com/v23.0/{mediaId}?phone_number_id={...}
        → Returns { url, mime_type }

Step 2: GET https://graph.facebook.com/v19.0/{encoded_url}
        → Returns { id } (download URL)

Step 3: GET {downloadUrl} (responseType: arraybuffer)
        → Returns binary image data
        → Convert to base64
```

### 3. AI Validation (`validateImage` function in `src/application/validate_image.js`)

```javascript
// 1. Verify user exists in Firestore user_profile collection
// 2. Check daily valid attempt limit via getTodayValidAttempts()
//    - If limit reached: register attempt with tag "DAILY_LIMIT_EXCEEDED" and reject
// 3. Call isValidImage(base64, mimeType) → Google Gemini AI
// 4. Register attempt via register_attempt(idwhatsapp, validationResult)
// 5. If !is_valid → return error with tag and reason
// 6. If is_valid → uploadImage() to GCS, then updateAlbumData()
```

### 4. Image Upload (`uploadImage` function in `src/services/storage/upload_image.js`)

```
Bucket: polloparatodos-album
Path: album/{idwhatsapp}/{timestamp}.{extension}
Content-Type: {mimeType}
Public URL: https://storage.googleapis.com/{BUCKET_NAME}/{filename}
```

### 5. Album Update (`updateAlbumData` function in `src/services/db/update_album_data/update_album_data.js`)

```javascript
// 1. Get existing album array and albumCount from user_profile
// 2. Extract already-used stamp numbers
// 3. Pick random number 1-110 excluding used stamps
// 4. Create new album entry: { stamp, url, timestamp }
// 5. Increment redeem counter (0→1→2→3)
// 6. If redeem >= 3: trigger promo, reset redeem to 0, increment promosCount
// 7. Atomically update Firestore document with FieldValue.arrayUnion
```

---

## Data Models

### Request (Internal)

| Field        | Type   | Description                    |
| ------------ | ------ | ------------------------------ |
| `idwhatsapp` | string | WhatsApp user ID (document ID) |
| `image64`    | string | Base64 encoded image data      |
| `mimeType`   | string | MIME type (e.g., "image/jpeg") |

### AI Validation Response (`isValidImage`)

```json
{
  "is_valid": true | false,
  "tag": "VALID" | "NOT_FOOD_OR_CHICKEN" | "STOCK_OR_INTERNET_IMAGERY" | "AI_GENERATED_OR_MANIPULATED" | "ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS" | "LIVE_ANIMALS" | "DAILY_LIMIT_EXCEEDED",
  "reason": "Brief explanation of the classification"
}
```

### CheckImage Success Response

```json
{
  "stat": "ok",
  "data": {
    "message": "Album data updated successfully",
    "newStamp": 73,
    "url": "https://storage.googleapis.com/polloparatodos-album/album/52115551234/1745892000000.jpg",
    "albumCount": 5,
    "redeem": 1,
    "promosCount": 2,
    "promoTriggered": false
  }
}
```

### CheckImage Error Response

```json
{
  "stat": "error",
  "data": {
    "message": "Image is rejected because it contains a large promotional text overlay with a price tag"
  }
}
```

### Firestore: attempts_logs Collection

```
Document ID: {idwhatsapp}
Collection: attempts_logs
Data:
  logs: [
    {
      is_valid: false,
      tag: "ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS",
      msg_to_dev: "The image is rejected because it contains a large promotional text overlay...",
      msg_to_user: "Se rechazarán imágenes que estén diseñadas como anuncios...",
      time: Timestamp
    }
  ]
```

### Firestore: user_profile Collection

```
Document ID: {idwhatsapp}
Fields:
  name, surname, email, phone, phoneCode, whatsappId
  birthday: Timestamp
  gender, address
  album: [{ stamp: number, url: string, timestamp: Timestamp }]
  albumCount: number
  redeem: 0-2 (resets at 3)
  promosCount: number
  createdAt: Timestamp
```

---

## Rate Limiting Rules

| Rule                     | Value                                              |
| ------------------------ | -------------------------------------------------- |
| Daily attempt limit      | 3 valid attempts per user per day                  |
| Reset time               | Midnight (00:00) based on server timezone         |
| Counted attempts         | Only **valid** attempts count toward limit        |
| Rejected attempts        | Do NOT count toward daily limit                   |
| Blocked action           | Image validation rejected, no stamp awarded        |
| Error response message   | "Has alcanzado el límite de 3 intentos diarios. Intenta mañana." |

### Daily Limit Technical Flow

```javascript
// Before processing image validation in validateImage():
// 1. Query attempts_logs for today (midnight to now)
// 2. Count attempts where is_valid === true
// 3. If count >= 3 → register attempt with tag "DAILY_LIMIT_EXCEEDED", reject
// 4. Otherwise → proceed with AI validation
```

### Firestore: Daily Attempt Count Query

```
Collection: attempts_logs
Document ID: {idwhatsapp}
Query: logs[].time >= todayMidnight Timestamp
Filter: logs[].is_valid === true
Count: < 3 to allow attempt
```

---

## Stamp System Rules

| Rule             | Value                                        |
| ---------------- | -------------------------------------------- |
| Stamp range      | 1 - 110 (inclusive)                          |
| Duplicate stamps | Not allowed (random selection excludes used) |
| Redeem trigger   | Every 3 valid images                         |
| Promo increment  | When redeem counter reaches 3                |
| Redeem reset     | After promo triggered, counter resets to 0   |

---

## Key Files

| File                                                                           | Function                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `server.js`                                                                    | Webhook endpoint, image download from Meta            |
| `fire.js`                                                                      | `checkImage()`, `updateAlbumData()`, `saveUser()`    |
| `src/application/validate_image.js`                                            | Main use case: validates image, awards stamps        |
| `src/services/ai/is_valid_image.js`                                           | AI validation via Google Gemini                      |
| `src/services/ai/chicken-classifier-prompt.v1.js`                              | AI prompt with classification criteria                |
| `src/services/storage/upload_image.js`                                         | Uploads image to Google Cloud Storage                |
| `src/services/db/update_album_data/update_album_data.js`                      | Updates album with new stamp, handles promo trigger  |
| `src/services/db/register_attempt/register_attempt.js`                         | Logs validation attempts to Firestore                |
| `src/services/db/get_today_valid_attempts/get_today_valid_attempts.js`        | Counts valid attempts today (rate limiting)          |
| `src/services/db/get_last_n_msgs/get_last_n_msgs.js`                          | Retrieves validation logs                            |
| `src/services/db/register_attempt/TAG_TO_USER_MESSAGE.js`                      | Tag to Spanish message mapping                        |
