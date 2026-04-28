import db from "../services/db/firebase.js";
import { isValidImage } from "../services/ai/is_valid_image.js";
import { register_attempt } from "../services/db/register_attempt/register_attempt.js";
import { getTodayValidAttempts } from "../services/db/get_today_valid_attempts/get_today_valid_attempts.js";
import { uploadImage } from "../services/storage/upload_image.js";
import { updateAlbumData } from "../services/db/update_album_data/update_album_data.js";
import { TAG_TO_USER_MESSAGE } from "../services/db/register_attempt/TAG_TO_USER_MESSAGE.js";

/**
 * Daily attempt limit - only valid attempts count
 */
const DAILY_VALID_ATTEMPT_LIMIT = 3;

/**
 * Error message when daily limit is exceeded
 */
const DAILY_LIMIT_MESSAGE =
  "Has alcanzado el límite de 3 intentos diarios. Intenta mañana.";

/**
 * Validates a chicken dish image, awards stamps, and handles the loyalty campaign logic.
 *
 * This use case implements the following workflow:
 * 1. Verify user exists in Firestore
 * 2. Check daily valid attempt limit (max 3 per day)
 * 3. Validate image using AI classifier
 * 4. Register the validation attempt
 * 5. If valid: upload to GCS and update album with new stamp
 * 6. If invalid: return error with tag and user-friendly message
 *
 * @param {string} idwhatsapp - The WhatsApp identifier (document ID)
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {string} mimeType - MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns {Promise<{
 *   stat: "ok" | "error",
 *   data: {
 *     message?: string,
 *     newStamp?: number,
 *     url?: string,
 *     albumCount?: number,
 *     redeem?: number,
 *     promosCount?: number,
 *     promoTriggered?: boolean,
 *     tag?: string,
 *     msg_to_user?: string
 *   }
 * }>}
 *
 * @example
 * // Valid image - stamp awarded
 * const result = await validateImage("123456789", base64Image, "image/jpeg");
 * // { stat: "ok", data: { message: "Album data updated successfully", newStamp: 73, albumCount: 5, ... } }
 *
 * @example
 * // Invalid image - rejected
 * const result = await validateImage("123456789", base64Image, "image/jpeg");
 * // { stat: "error", data: { message: "Image is rejected because...", tag: "AI_GENERATED_OR_MANIPULATED", ... } }
 *
 * @example
 * // Daily limit exceeded
 * const result = await validateImage("123456789", base64Image, "image/jpeg");
 * // { stat: "error", data: { message: "Has alcanzado el límite de 3 intentos diarios. Intenta mañana." } }
 */
export async function validateImage(idwhatsapp, imageBase64, mimeType) {
  console.log("=== validateImage use case started ===");
  console.log("idwhatsapp:", idwhatsapp);
  console.log("mimeType:", mimeType);
  console.log("Base64 length:", imageBase64?.length);

  // =================================
  // Step 1: Verify user exists
  // =================================
  console.log("Step 1: Verifying user exists...");
  const docRef = db.collection("user_profile").doc(idwhatsapp);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.error(`User ${idwhatsapp} not found in user_profile.`);
    return {
      stat: "error",
      data: { message: `User ${idwhatsapp} not found.` },
    };
  }
  console.log(`User ${idwhatsapp} found.`);

  // =================================
  // Step 2: Check daily valid attempt limit
  // =================================
  console.log("Step 2: Checking daily valid attempt limit...");
  const todayValidAttempts = await getTodayValidAttempts(idwhatsapp);
  console.log(
    `Today valid attempts: ${todayValidAttempts}/${DAILY_VALID_ATTEMPT_LIMIT}`,
  );

  // Prepare a synthetic validation result for the daily limit case
  const dailyLimitValidationResult = {
    is_valid: false,
    tag: "DAILY_LIMIT_EXCEEDED",
    reason: DAILY_LIMIT_MESSAGE,
  };

  if (todayValidAttempts >= DAILY_VALID_ATTEMPT_LIMIT) {
    console.log(`Daily limit exceeded for user ${idwhatsapp}.`);

    // Register this attempt even though it's rejected due to limit
    try {
      await register_attempt(idwhatsapp, dailyLimitValidationResult);
      console.log("Attempt registered (limit exceeded).");
    } catch (error) {
      console.error(
        "Failed to register limit-exceeded attempt:",
        error.message,
      );
    }

    return {
      stat: "error",
      data: {
        message: DAILY_LIMIT_MESSAGE,
        tag: "DAILY_LIMIT_EXCEEDED",
      },
    };
  }

  // =================================
  // Step 3: Validate image using AI
  // =================================
  console.log("Step 3: Validating image with AI classifier...");
  let validationResult;
  try {
    validationResult = await isValidImage(imageBase64, mimeType);
    console.log("AI Validation result:", validationResult);
  } catch (error) {
    console.error("AI validation error:", error.message);
    return {
      stat: "error",
      data: { message: `AI validation failed: ${error.message}` },
    };
  }

  // =================================
  // Step 4: Register the validation attempt
  // =================================
  console.log("Step 4: Registering validation attempt...");
  try {
    await register_attempt(idwhatsapp, validationResult);
    console.log("Attempt registered successfully.");
  } catch (error) {
    console.error("Failed to register attempt:", error.message);
    // Continue anyway - the validation result is what matters most
  }

  // =================================
  // Step 5: Handle invalid image
  // =================================
  if (validationResult.is_valid !== true) {
    console.log("Image validation failed:", validationResult.reason);
    const msgToUser =
      TAG_TO_USER_MESSAGE[validationResult.tag] || validationResult.reason;
    return {
      stat: "error",
      data: {
        message:
          validationResult.reason ||
          "Image does not appear to contain chicken.",
        tag: validationResult.tag,
        msg_to_user: msgToUser,
      },
    };
  }

  // =================================
  // Step 6: Upload image to GCS
  // =================================
  console.log("Step 6: Uploading image to Google Cloud Storage...");
  let imageUrl;
  try {
    imageUrl = await uploadImage(idwhatsapp, imageBase64, mimeType);
    console.log("Image uploaded to:", imageUrl);
  } catch (error) {
    console.error("GCS upload error:", error.message);
    return {
      stat: "error",
      data: { message: `Failed to upload image: ${error.message}` },
    };
  }

  // =================================
  // Step 7: Update album with new stamp
  // =================================
  console.log("Step 7: Updating album with new stamp...");
  const albumResult = await updateAlbumData(idwhatsapp, imageUrl);

  if (albumResult.stat === "error") {
    console.error("Album update failed:", albumResult.data.message);
    return albumResult;
  }

  console.log("=== validateImage use case completed successfully ===");
  return albumResult;
}
