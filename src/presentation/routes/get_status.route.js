import { ReadLastNMessages } from "../../application/read_last_n_messages.js";

/**
 * GET /pollo/status/:idwhatsapp
 * Retrieves the last N failed analysis logs for a WhatsApp user
 *
 * Query Parameters:
 *   - lastMsgs: number (optional, default: 10, max: 100)
 *
 * Response:
 *   - 200: { stat: "ok", data: { failedLogs: [...], count: number } }
 *   - 400: { stat: "error", data: { message: string } } - invalid params
 *   - 500: { stat: "error", data: { message: string } } - server error
 */
export const getStatusRoute = (app) => {
  app.get("/pollo/status/:idwhatsapp", async (req, res) => {
    const { idwhatsapp } = req.params;
    const lastMsgs = req.query.lastMsgs;

    console.log(`GET /pollo/status/${idwhatsapp} - Fetching last ${lastMsgs || 10} messages`);

    try {
      const result = await ReadLastNMessages(idwhatsapp, lastMsgs);

      if (result.stat === "error") {
        const isValidationError = result.data.message.includes("required");
        return res.status(isValidationError ? 400 : 500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Unexpected error in /pollo/status endpoint:", error.message);
      return res.status(500).json({
        stat: "error",
        data: { message: "An unexpected error occurred" },
      });
    }
  });
};