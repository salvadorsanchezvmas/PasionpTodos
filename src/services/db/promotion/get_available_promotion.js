import db from "../firebase.js";

/**
 * Firestore collection for promotions
 */
const COLLECTION_NAME = "promotion";

/**
 * Gets a random available promotion from the collection
 * @returns {Promise<{id: string, code: string, company: string, type: string, expiration: Timestamp} | null>}
 *   Returns promotion object if available, null otherwise
 */
export const getAvailablePromotion = async () => {
  const promotionsRef = db.collection(COLLECTION_NAME);
  const querySnapshot = await promotionsRef
    .where("status", "==", "available")
    .get();

  if (querySnapshot.empty) {
    return null;
  }

  // Select a random promotion from available ones
  const randomIndex = Math.floor(Math.random() * querySnapshot.docs.length);
  const doc = querySnapshot.docs[randomIndex];
  const data = doc.data();

  return {
    id: doc.id,
    code: data.code,
    number: data.number,
    company: data.company || "Pollo Feliz",
    type: data.type || "descuento en compra",
    expiration: data.expiration,
  };
};