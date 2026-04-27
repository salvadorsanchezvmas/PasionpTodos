import { Timestamp, doc, getDoc } from "firebase-admin/firestore";
import db from "../../firebase.js";

/**
 * Retrieves the last N failed analysis logs for a specific WhatsApp user from the database
 * @param {string} idwhatsapp - The WhatsApp ID of the user (document ID)
 * @param {number} lastMsgs - Number of logs to retrieve
 * @returns {Promise<Array<{
 *   msg_to_dev: string,
 *   msg_to_user: string,
 *   time: string | null
 * }>>} Array of failed log entries
 */
export const getLastNMsgs = async (idwhatsapp, lastMsgs) => {
  // Get document from failed_analysis_logs collection using idwhatsapp as document ID
  const docRef = doc(db, "failed_analysis_logs", idwhatsapp);
  const docSnap = await getDoc(docRef);

  const failedLogs = [];

  if (docSnap.exists) {
    const data = docSnap.data();
    const logsArray = data.logs || [];

    // Get the last N entries (newest first)
    const recentLogs = logsArray.slice(-lastMsgs).reverse();

    recentLogs.forEach((log) => {
      failedLogs.push({
        msg_to_dev: log.msg_to_dev || "",
        msg_to_user: log.msg_to_user || "",
        time: log.time ? formatTimestamp(log.time) : null,
      });
    });
  }

  return failedLogs;
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