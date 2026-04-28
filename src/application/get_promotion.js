import { checkUserExists } from "../services/db/user_profile/check_user_exists.js";
import { checkPromosCount } from "../services/db/user_profile/check_promos_count.js";
import { getAvailablePromotion } from "../services/db/promotion/get_available_promotion.js";
import { redeemPromotion } from "../services/db/promotion/redeem_promotion.js";

const ERROR_MESSAGES = {
  INVALID_ID: "ID de usuario inválido",
  USER_NOT_REGISTERED: "Para participar primero debes registrarte.",
  NO_PROMOS:
    "No tienes promociones acumuladas. Sube 3 imágenes válidas para obtener una.",
  NO_PROMOTIONS_AVAILABLE:
    "No hay promociones disponibles en este momento. Intenta más tarde.",
};

/**
 * Retrieves a promotion/coupon for a user who has accumulated promotions
 *
 * @steps
 * 1. Validate idWhatsApp parameter (non-empty string)
 *    - If invalid, return error: "ID de usuario inválido"
 *
 * 2. Check if user exists via checkUserExists(idWhatsApp)
 *    - Query user_profile collection
 *    - If user not found, return error: "Para reclamar una promoción, primero debes registrarte..."
 *
 * 3. Check promosCount via checkPromosCount(idWhatsApp)
 *    - Query user_profile for promosCount
 *    - If promosCount < 1, return error: "No tienes promociones acumuladas..."
 *
 * 4. Check promotion availability via getAvailablePromotion()
 *    - Query promotion collection for status = "available"
 *    - Select random available promotion
 *    - If no promotions available, return error: "No hay promociones disponibles..."
 *
 * 5. Redeem promotion via redeemPromotion(idWhatsApp, promotion) - ATOMIC
 *    - Decrement promosCount by 1 in user_profile
 *    - Append {request_date: Timestamp, promotion_id} to promotion_history array
 *    - Update promotion status to "used" and set assignedTo
 *    - Log redemption in promotion_logs collection
 *
 * 6. Return success response with promotion details
 *
 * @param {string} idWhatsApp - The WhatsApp ID of the user (document ID in user_profile)
 * @returns {Promise<{
 *   stat: "ok",
 *   data: {
 *     promotion: {
 *       id: string,
 *       code: string,
 *       number: string,
 *       company: string,
 *       type: string,
 *       expiration: Timestamp
 *     }
 *   }
 * } | {
 *   stat: "error",
 *   data: {
 *     message: string
 *   }
 * }>} The result object with status and data
 */
export const GetPromotion = async (idWhatsApp) => {
  // 1. Validate idWhatsApp parameter
  if (
    !idWhatsApp ||
    typeof idWhatsApp !== "string" ||
    idWhatsApp.trim() === ""
  ) {
    return {
      stat: "error",
      data: {
        message: ERROR_MESSAGES.INVALID_ID,
      },
    };
  }

  try {
    console.log(`GetPromotion: Checking if user ${idWhatsApp} exists`);

    // 2. Check if user exists
    // TODO: register the log if the user not exist
    const isRegistered = await checkUserExists(idWhatsApp);
    if (!isRegistered) {
      console.log(`GetPromotion: User ${idWhatsApp} not found`);
      return {
        stat: "error",
        data: {
          message: ERROR_MESSAGES.USER_NOT_REGISTERED,
        },
      };
    }

    // 3. Check promosCount
    // TODO: add log if the user has not more available prmotions
    console.log(`GetPromotion: Checking promosCount for user ${idWhatsApp}`);
    const promosCount = await checkPromosCount(idWhatsApp);

    if (promosCount < 1) {
      console.log(
        `GetPromotion: User ${idWhatsApp} has no accumulated promotions`,
      );
      return {
        stat: "error",
        data: {
          message: ERROR_MESSAGES.NO_PROMOS,
        },
      };
    }

    // 4. Check promotion availability
    // TODO: add log if there are not available promotions
    console.log(`GetPromotion: Checking available promotions`);
    const promotion = await getAvailablePromotion();

    if (!promotion) {
      console.log(`GetPromotion: No promotions available`);
      return {
        stat: "error",
        data: {
          message: ERROR_MESSAGES.NO_PROMOTIONS_AVAILABLE,
        },
      };
    }

    // 5. Redeem promotion (atomic operation)
    console.log(
      `GetPromotion: Redeeming promotion ${promotion.id} for user ${idWhatsApp}`,
    );
    await redeemPromotion(idWhatsApp, promotion);

    // 6. Return success response
    return {
      stat: "ok",
      data: {
        promotion: {
          id: promotion.id,
          code: promotion.code,
          number: promotion.number,
          company: promotion.company,
          type: promotion.type,
          expiration: promotion.expiration,
        },
      },
    };
  } catch (error) {
    console.error("Error redeeming promotion:", error.message);
    return {
      stat: "error",
      data: {
        message: error.message,
      },
    };
  }
};
