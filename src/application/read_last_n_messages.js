import { Timestamp, doc, getDoc } from "firebase-admin/firestore";
import db from "../services/db/firebase.js";

/**
 * Retrieves the last N failed analysis logs for a specific WhatsApp user
 * @param {string} idwhatsapp - The WhatsApp ID of the user (document ID)
 * @param {number} lastMsgs - Number of logs to retrieve (default: 10, max: 100)
 * @returns {Promise<{
 *   stat: "ok",
 *   data: {
 *     failedLogs: Array<{
 *       msg_to_dev: string,
 *       msg_to_user: string,
 *       time: string | null
 *     }>,
 *     count: number
 *   }
 * } | {
 *   stat: "error",
 *   data: {
 *     message: string
 *   }
 * }>} The result object with status and data
 */
export const ReadLastNMessages = async (idwhatsapp, lastMsgs) => {
  // 1. Validate idwhatsapp parameter
  if (
    !idwhatsapp ||
    typeof idwhatsapp !== "string" ||
    idwhatsapp.trim() === ""
  ) {
    return {
      stat: "error",
      data: {
        message: "idWhatsApp parameter is required and cannot be empty",
      },
    };
  }

  // 2. Validate and cap lastMsgs parameter
  const sanitizedLastMsgs = parseInt(lastMsgs, 10);

  if (isNaN(sanitizedLastMsgs) || sanitizedLastMsgs < 1) {
    // Default to 10 if invalid
    lastMsgs = 10;
  } else if (sanitizedLastMsgs > 100) {
    // Cap at 100 to prevent abuse
    lastMsgs = 100;
  } else {
    lastMsgs = sanitizedLastMsgs;
  }

  console.log(
    `ReadLastNMessages: Fetching last ${lastMsgs} logs for idWhatsApp: ${idwhatsapp}`,
  );

  try {
    // 3. Get document from failed_analysis_logs collection using idwhatsapp as document ID
    const docRef = doc(db, "failed_analysis_logs", idwhatsapp);
    const docSnap = await getDoc(docRef);

    // 4. Format the response
    const failedLogs = [];

    if (docSnap.exists) {
      const data = docSnap.data();
      // Assuming the document has a 'logs' array field with failed attempts
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

    // 5. Return JSON response
    return {
      stat: "ok",
      data: {
        failedLogs: failedLogs,
      },
      count: failedLogs.length,
    };
  } catch (error) {
    console.error(
      "Error reading failed_analysis_logs from Firebase:",
      error.message,
    );
    return {
      stat: "error",
      data: {
        message: error.message,
      },
    };
  }
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
