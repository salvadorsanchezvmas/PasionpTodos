import db, { FieldValue, Timestamp } from "../firebase.js";

/**
 * Firestore collection for failed validation attempts
 */
const COLLECTION_NAME = "failed_analysis_logs";

/**
 * Mapping of validation tags to user-friendly messages in Spanish
 */
const TAG_TO_USER_MESSAGE = {
  NOT_FOOD_OR_CHICKEN:
    "La imagen debe mostrar alimentos o pollo; no se aceptarán imágenes que no estén relacionadas con comida.",
  STOCK_OR_INTERNET_IMAGERY:
    "No se aceptarán imágenes genéricas de internet o con indicios de uso comercial previo, como marcas de agua o firmas de autor.",
  AI_GENERATED_OR_MANIPULATED:
    "La imagen será rechazada si muestra señales de haber sido generada por IA o manipulada digitalmente, como proporciones irreales o iluminación poco natural.",
  ADVERTISEMENTS_OR_COMMERCIAL_DISPLAYS:
    "No se aceptarán imágenes genéricas de internet o con indicios de uso comercial previo, como marcas de agua o firmas de autor.",
  LIVE_ANIMALS:
    "No se aceptarán imágenes de animales vivos; solo se permiten imágenes de alimentos (pollo procesado o ingredientes).",
};

/**
 * Saves a failed validation attempt to Firestore.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier (document ID)
 * @param {{ is_valid: boolean, tag: string, reason: string }} validationResult - The result from isValidImage()
 * @returns {Promise<void>}
 *
 * @example
 * await recordFailedAttempt("123456789", { is_valid: false, tag: "AI_GENERATED_OR_MANIPULATED", reason: "Image appears to be AI-generated" });
 */
export async function recordFailedAttempt(idwhatsapp, validationResult) {
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
    msg_to_dev: validationResult.reason,
    msg_to_user: msgToUser,
    time: Timestamp.now(),
  };

  await db.collection(COLLECTION_NAME).doc(idwhatsapp).set(
    { logs: FieldValue.arrayUnion(docData) },
    { merge: true },
  );
}
