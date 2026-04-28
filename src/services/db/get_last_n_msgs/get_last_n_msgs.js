import { Timestamp } from "firebase-admin/firestore";
import db from "../../db/firebase.js";

/**
 * Retrieves the last N validation attempt logs for a specific WhatsApp user from the database
 * @param {string} idwhatsapp - The WhatsApp ID of the user (document ID)
 * @param {number} lastMsgs - Number of logs to retrieve
 * @returns {Promise<Array<{
 *   is_valid: boolean,
 *   tag: string,
 *   msg_to_dev: string,
 *   msg_to_user: string,
 *   time: string | null
 * }>>} Array of validation attempt log entries
 */
export const getLastNMsgs = async (idwhatsapp, lastMsgs) => {
  // Get document from attempts_logs collection using idwhatsapp as document ID
  const docRef = db.collection("attempts_logs").doc(idwhatsapp);
  const docSnap = await docRef.get();

  const lastNLogs = [];

  if (!docSnap.exists) {
    // User has not registered any attempts - return empty array
    return [];
  }

  const data = docSnap.data();
  const logsArray = data.logs || [];

  // Get only the last N entries added
  const slicedLogs = logsArray.slice(-lastMsgs);

  slicedLogs.forEach((log) => {
    lastNLogs.push({
      is_valid: log.is_valid ?? false,
      tag: log.tag || "",
      msg_to_dev: log.msg_to_dev || "",
      msg_to_user: log.msg_to_user || "",
      time: log.time ? formatTimestamp(log.time) : null,
    });
  });

  return lastNLogs;
};

/**
 * Formats a Firebase Timestamp or date to ISO string
 * @param {Timestamp|Date|string} timestamp - The timestamp to format (Firebase Timestamp, Date object, or ISO string)
 * @returns {string} ISO formatted date string (e.g., "2026-04-27T17:09:54.000Z")
 */
function formatTimestamp(timestamp) {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  return new Date(timestamp).toISOString();
}
