import db from "../firebase.js";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { TAG_TO_USER_MESSAGE } from "./TAG_TO_USER_MESSAGE.js";

/**
 * Firestore collection for validation attempts
 */
const COLLECTION_NAME = "attempts_logs";

/**
 * Registers a validation attempt to Firestore.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier (document ID)
 * @param {{ is_valid: boolean, tag: string, reason: string }} validationResult - The result from isValidImage()
 * @returns {Promise<void>}
 *
 * @example
 * await register_attempt("123456789", { is_valid: false, tag: "AI_GENERATED_OR_MANIPULATED", reason: "Image appears to be AI-generated" });
 */
export async function register_attempt(idwhatsapp, validationResult) {
  if (!idwhatsapp || typeof idwhatsapp !== "string") {
    throw new Error("idwhatsapp must be a non-empty string");
  }

  if (!validationResult || typeof validationResult !== "object") {
    throw new Error(
      "validationResult must be a valid object from isValidImage()",
    );
  }

  const msgToUser =
    TAG_TO_USER_MESSAGE[validationResult.tag] || validationResult.reason;

  const docData = {
    tag: validationResult.tag,
    is_valid: validationResult.is_valid,
    msg_to_dev: validationResult.reason,
    msg_to_user: msgToUser,
    time: Timestamp.now(),
  };

  await db.collection(COLLECTION_NAME).doc(idwhatsapp).set(
    { logs: FieldValue.arrayUnion(docData) },
    { merge: true },
  );
}
