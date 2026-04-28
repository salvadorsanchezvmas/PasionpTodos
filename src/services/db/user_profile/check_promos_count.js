import db from "../firebase.js";

/**
 * Firestore collection for user profiles
 */
const COLLECTION_NAME = "user_profile";

/**
 * Checks if a user has a valid promosCount (>= 1)
 * @param {string} idWhatsApp - The WhatsApp ID (document ID in user_profile)
 * @returns {Promise<number>} The promosCount value, or -1 if user doesn't exist
 */
export const checkPromosCount = async (idWhatsApp) => {
  const docRef = db.collection(COLLECTION_NAME).doc(idWhatsApp);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return -1;
  }

  const data = docSnap.data();
  return data.promosCount || 0;
};