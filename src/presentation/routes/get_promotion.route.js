import { GetPromotion } from "../../application/get_promotion.js";

/**
 * GET /pollo/promotion/:idwhatsapp
 * Retrieves a promotion/coupon for a user who has accumulated promotions
 *
 * Response:
 *   - 200: { stat: "ok", data: { promotion: { id, code, number, company, type, expiration } } }
 *   - 400: { stat: "error", data: { message: string } } - invalid params
 *   - 500: { stat: "error", data: { message: string } } - server error
 */
export const getPromotionRoute = (app) => {
  app.get("/pollo/promotion/:idwhatsapp", async (req, res) => {
    const { idwhatsapp } = req.params;

    console.log(`GET /pollo/promotion/${idwhatsapp}`);

    try {
      const result = await GetPromotion(idwhatsapp);

      if (result.stat === "error") {
        const isValidationError = result.data.message.includes("ID de usuario inválido");
        return res.status(isValidationError ? 400 : 500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Unexpected error in /pollo/promotion endpoint:", error.message);
      return res.status(500).json({
        stat: "error",
        data: { message: "An unexpected error occurred" },
      });
    }
  });
};