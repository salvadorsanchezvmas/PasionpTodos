/**
 * In-memory storage for failed validation attempts
 * Key: idwhatsapp, Value: validation result from isValidImage
 */
const failedAttempts = new Map();

/**
 * Saves a failed validation attempt to memory.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier
 * @param {{ is_valid: boolean, tag: string, reason: string }} validationResult - The result from isValidImage()
 * @returns {void}
 *
 * @example
 * recordFailedAttempt("123456789", { is_valid: false, tag: "AI_GENERATED_OR_MANIPULATED", reason: "Image appears to be AI-generated" });
 */
export function recordFailedAttempt(idwhatsapp, validationResult) {
  if (!idwhatsapp || typeof idwhatsapp !== "string") {
    throw new Error("idwhatsapp must be a non-empty string");
  }

  if (!validationResult || typeof validationResult !== "object") {
    throw new Error("validationResult must be a valid object from isValidImage()");
  }

  failedAttempts.set(idwhatsapp, {
    ...validationResult,
    timestamp: Date.now(),
  });
}

/**
 * Retrieves a failed validation attempt from memory.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier
 * @returns {{ is_valid: boolean, tag: string, reason: string, timestamp: number } | undefined}
 */
export function getFailedAttempt(idwhatsapp) {
  return failedAttempts.get(idwhatsapp);
}

/**
 * Removes a failed validation attempt from memory.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier
 * @returns {boolean} True if an entry was deleted, false otherwise
 */
export function clearFailedAttempt(idwhatsapp) {
  return failedAttempts.delete(idwhatsapp);
}

/**
 * Checks if there is a failed attempt stored for a given WhatsApp ID.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier
 * @returns {boolean}
 */
export function hasFailedAttempt(idwhatsapp) {
  return failedAttempts.has(idwhatsapp);
}

/**
 * Returns all failed attempts (for debugging/monitoring purposes).
 *
 * @returns {Map<string, { is_valid: boolean, tag: string, reason: string, timestamp: number }>}
 */
export function getAllFailedAttempts() {
  return new Map(failedAttempts);
}