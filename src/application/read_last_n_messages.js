import { getLastNMsgs } from "../services/db/get_last_n_msgs/get_last_n_msgs.js";
import { checkUserExists } from "../services/db/user_profile/check_user_exists.js";

const USER_HAS_NOT_REGISTER_MSG =
  "Para participar primero debes registrarte.";

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

  try {
    console.log(
      `ReadLastNMessages: Fetching last ${lastMsgs} logs for idWhatsApp: ${idwhatsapp}`,
    );

    // 3. Check if user has registered any attempts
    const isRegistered = await checkUserExists(idwhatsapp);
    if (!isRegistered) {
      console.log(
        `ReadLastNMessages: User ${idwhatsapp} has no registered attempts`,
      );
      return {
        stat: "error",
        data: {
          message: USER_HAS_NOT_REGISTER_MSG,
        },
      };
    }

    // 4. Delegate to database service
    const failedLogs = await getLastNMsgs(idwhatsapp, lastMsgs);

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
