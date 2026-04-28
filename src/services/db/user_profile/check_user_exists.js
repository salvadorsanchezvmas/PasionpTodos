import db from "../firebase.js";

/**
 * Checks if a user has registered in the user_profile collection
 * @param {string} idwhatsapp - The WhatsApp ID of the user (document ID)
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
export const checkUserExists = async (idwhatsapp) => {
  const docRef = db.collection("user_profile").doc(idwhatsapp);
  const docSnap = await docRef.get();
  return docSnap.exists;
};