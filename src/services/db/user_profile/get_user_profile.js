import db from "../firebase.js";

/**
 * Firestore collection for user profiles
 */
const COLLECTION_NAME = "user_profile";

/**
 * Gets the user profile data including email
 * @param {string} idWhatsApp - The WhatsApp ID (document ID in user_profile)
 * @returns {Promise<{name: string, email: string}|null>} The user profile or null if not found
 */
export const getUserProfile = async (idWhatsApp) => {
  const docRef = db.collection(COLLECTION_NAME).doc(idWhatsApp);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  return {
    name: data.name || "",
    email: data.email || "",
  };
};