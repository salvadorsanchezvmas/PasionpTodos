import db from "../firebase.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Firestore collections
 */
const USER_PROFILE_COLLECTION = "user_profile";
const PROMOTION_COLLECTION = "promotion";
const PROMOTION_LOGS_COLLECTION = "promotion_logs";

/**
 * Redeems a promotion for a user atomically
 * @param {string} idWhatsApp - The WhatsApp ID (document ID in user_profile)
 * @param {{ id: string, code: string, number: string, company: string, type: string, expiration: Timestamp }} promotion - The promotion to redeem
 * @returns {Promise<void>}
 */
export const redeemPromotion = async (idWhatsApp, promotion) => {
  const batch = db.batch();

  // 1. Decrement promosCount and append to promotion_history in user_profile
  const userRef = db.collection(USER_PROFILE_COLLECTION).doc(idWhatsApp);
  batch.update(userRef, {
    promosCount: FieldValue.increment(-1),
    promotion_history: FieldValue.arrayUnion({
      request_date: Timestamp.now(),
      promotion_id: promotion.number,
    }),
  });

  // 2. Update promotion status to "used" and assign to user
  const promoRef = db.collection(PROMOTION_COLLECTION).doc(promotion.id);
  batch.update(promoRef, {
    status: "used",
    assignedTo: idWhatsApp,
    usedAt: Timestamp.now(),
  });

  // 3. Log the redemption in promotion_logs
  const logRef = db.collection(PROMOTION_LOGS_COLLECTION).doc();
  batch.set(logRef, {
    idUser: idWhatsApp,
    idPromotion: promotion.id,
    code: promotion.code,
    redeemedAt: Timestamp.now(),
  });

  await batch.commit();
};