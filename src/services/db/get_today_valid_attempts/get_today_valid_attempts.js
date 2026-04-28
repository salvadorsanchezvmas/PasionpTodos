import { Timestamp } from "firebase-admin/firestore";
import db from "../firebase.js";

/**
 * Firestore collection for validation attempts
 */
const COLLECTION_NAME = "attempts_logs";

/**
 * Gets the start of today (midnight) in server timezone
 * @returns {Date} Date object representing midnight of the current day
 */
function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Counts the number of valid attempts for a user today.
 * Only counts attempts where is_valid === true.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier (document ID)
 * @returns {Promise<number>} Number of valid attempts today
 *
 * @example
 * const count = await getTodayValidAttempts("123456789");
 * if (count >= 3) {
 *   // Reject - daily limit exceeded
 * }
 */
export async function getTodayValidAttempts(idwhatsapp) {
  if (!idwhatsapp || typeof idwhatsapp !== "string") {
    throw new Error("idwhatsapp must be a non-empty string");
  }

  const docRef = db.collection(COLLECTION_NAME).doc(idwhatsapp);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return 0;
  }

  const data = docSnap.data();
  const logsArray = data.logs || [];

  const startOfToday = getStartOfToday();
  const startTimestamp = Timestamp.fromDate(startOfToday);

  // Count attempts where is_valid === true and time >= startOfToday
  let validCount = 0;
  for (const log of logsArray) {
    if (log.is_valid === true) {
      // Check if the log time is from today
      if (log.time) {
        const logTime = log.time instanceof Timestamp
          ? log.time.toDate()
          : new Date(log.time);
        if (logTime >= startOfToday) {
          validCount++;
        }
      }
    }
  }

  return validCount;
}
