# Image Validation Sequence Diagram

```mermaid
sequenceDiagram
    title: Image Validation - Chicken Stamp Award Flow

    participant WA as WhatsApp User
    participant WH as Webhook Endpoint<br/>/pollo/phook
    participant MG as Meta Graph API
    participant BD as Backend<br/>validateImage()
    participant FS as Firestore<br/>user_profile
    participant AI as Google Gemini<br/>isValidImage()
    participant GCS as Google Cloud<br/>Storage
    participant AL as Firestore<br/>attempts_logs

    %% 1. Webhook Reception
    WA->>WH: Sends chicken dish photo
    WH->>WH: Extract message.type, mediaId, senderWhatsAppId

    %% 2. Image Download from Meta
    WH->>MG: GET /v23.0/{mediaId}?phone_number_id=...
    MG-->>WH: Returns { url, mime_type }
    WH->>MG: GET /v19.0/{encoded_url}
    MG-->>WH: Returns { id } (download URL)
    WH->>MG: GET {downloadUrl} (arraybuffer)
    MG-->>WH: Returns binary image data
    WH->>WH: Convert to base64

    %% 3. Validate Image Use Case
    Note over BD: === validateImage use case started ===

    %% Step 1: Verify user exists
    BD->>FS: Query user_profile.doc(idwhatsapp)
    FS-->>BD: Returns user document OR not found
    alt User not found
        BD-->>WH: { stat: "error", message: "User {id} not found" }
    end

    %% Step 2: Check daily valid attempt limit
    BD->>FS: getTodayValidAttempts(idwhatsapp)
    FS-->>BD: Returns today's valid attempt count

    alt Daily limit reached (>= 3)
        BD->>AL: register_attempt(id, DAILY_LIMIT_EXCEEDED)
        BD-->>WH: { stat: "error", message: "Has alcanzado el límite de 3 intentos diarios." }
    end

    %% Step 3: AI Validation
    BD->>AI: isValidImage(base64Image, mimeType)
    AI-->>BD: Returns { is_valid, tag, reason }

    %% Step 4: Register validation attempt
    BD->>AL: register_attempt(idwhatsapp, validationResult)

    %% Step 5: Handle invalid image
    alt Image is NOT valid
        BD-->>WH: { stat: "error", tag: validationResult.tag, msg_to_user: Spanish message }
    end

    %% Step 6: Upload image to GCS
    Note over BD: Image is VALID
    BD->>GCS: uploadImage(idwhatsapp, base64, mimeType)
    GCS-->>BD: Returns public URL

    %% Step 7: Update album with new stamp
    BD->>FS: updateAlbumData(idwhatsapp, imageUrl)
    FS-->>BD: Returns { newStamp, albumCount, redeem, promosCount, promoTriggered }

    %% Final response
    BD-->>WH: { stat: "ok", data: { newStamp, albumCount, redeem, ... } }
    WH-->>WA: Confirmation with stamp info

    Note over BD: === validateImage use case completed ===
```

## Component Overview

| Component               | Role                                                           |
| ----------------------- | -------------------------------------------------------------- |
| WhatsApp User           | Sends image via WhatsApp messaging                             |
| Webhook Endpoint        | Receives and processes WhatsApp webhook events                 |
| Meta Graph API          | Provides image download URL and image binary data              |
| validateImage()         | Main use case orchestrator (src/application/validate_image.js) |
| Firestore user_profile  | Stores user data, album stamps, redeem counter                 |
| Google Gemini AI        | Validates if image contains prepared chicken dish              |
| Google Cloud Storage    | Stores uploaded images with public URL                         |
| Firestore attempts_logs | Logs all validation attempts with tags                         |

## Validation Tags

| Tag                                     | Description                            |
| --------------------------------------- | -------------------------------------- |
| `VALID`                                 | Image contains a prepared chicken dish |
| `NOT_FOOD_OR_CHICKEN`                   | Image is food but not chicken          |
| `STOCK_OR_INTERNET_IMAGERY`             | Stock or internet photo detected       |
| `AI_GENERATED_OR_MANIPULATED`           | Synthetic or AI-generated image        |
| `ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS` | Commercial promotional content         |
| `LIVE_ANIMALS`                          | Live chicken (not prepared food)       |
| `DAILY_LIMIT_EXCEEDED`                  | User exceeded 3 valid attempts today   |

## Promo Trigger Logic

```mermaid
sequenceDiagram
    participant FS as Firestore Update
    participant DB as Album Logic

    Note over FS: updateAlbumData() function

    FS->>DB: Get existing album array and albumCount
    DB->>DB: Extract already-used stamp numbers
    DB->>DB: Pick random stamp 1-110 (excluding used)
    DB->>DB: Increment redeem counter (0→1→2→3)

    alt redeem >= 3
        DB->>DB: Trigger promo
        DB->>DB: Increment promosCount
        DB->>DB: Reset redeem to 0
    end

    DB->>FS: Atomic update with FieldValue.arrayUnion
    FS-->>DB: Update complete
```
