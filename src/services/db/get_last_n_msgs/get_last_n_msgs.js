import { Timestamp } from "firebase-admin/firestore";
import db from "../../db/firebase.js";

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
  const docRef = db.collection("failed_analysis_logs").doc(idwhatsapp);
  const docSnap = await docRef.get();

  const failedLogs = [];

  if (docSnap.exists) {
    const data = docSnap.data();
    const logsArray = data.logs || [];

    console.log(`logsArray: `, logsArray);

    // Sort by time descending (newest first) and get the last N entries
    const sortedByTime = logsArray
      .filter((log) => log.time) // Ensure log has time property
      .sort((a, b) => {
        const timeA = new Date(
          a.time instanceof Timestamp ? a.time.toDate() : a.time,
        );
        const timeB = new Date(
          b.time instanceof Timestamp ? b.time.toDate() : b.time,
        );
        return timeB - timeA; // Descending order (newest first)
      });

    // Get the last N entries (most recent)
    const recentLogs = sortedByTime.slice(0, lastMsgs);

    console.log(`recentLogs: `, recentLogs);

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
