import db from "../firebase.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Firestore collection for user profiles
 */
const COLLECTION_NAME = "user_profile";

/**
 * Picks a random number from 1 to 110 excluding the provided excluded numbers.
 * @param {number[]} excluded - Array of numbers to exclude
 * @returns {number} A random number not in the excluded list
 */
function pickRandomNumber(excluded = []) {
  const excludedSet = new Set(excluded);
  const available = [];
  for (let i = 1; i <= 110; i++) {
    if (!excludedSet.has(i)) available.push(i);
  }
  if (available.length === 0) {
    throw new Error(
      "No available numbers to pick from (all 1–110 are excluded).",
    );
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Updates the user's album with a new stamp.
 *
 * This function:
 * 1. Gets existing album and calculates used stamps
 * 2. Picks a new random stamp (1-110, excluding used ones)
 * 3. Increments redeem counter (0→1→2→3)
 * 4. If redeem >= 3: triggers promo, resets redeem to 0, increments promosCount
 * 5. Atomically updates Firestore with the new album entry
 *
 * @param {string} idwhatsapp - The WhatsApp identifier (document ID)
 * @param {string} imageUrl - Public URL of the uploaded image
 * @returns {Promise<{
 *   stat: "ok" | "error",
 *   data: {
 *     message: string,
 *     newStamp?: number,
 *     url?: string,
 *     albumCount?: number,
 *     redeem?: number,
 *     promosCount?: number,
 *     promoTriggered?: boolean
 *   }
 * }>}
 *
 * @example
 * const result = await updateAlbumData("123456789", "https://storage.googleapis.com/...");
 * // Returns: { stat: "ok", data: { newStamp: 73, albumCount: 5, redeem: 1, promoTriggered: false, ... } }
 */
export async function updateAlbumData(idwhatsapp, imageUrl) {
  if (!idwhatsapp || typeof idwhatsapp !== "string") {
    throw new Error("idwhatsapp must be a non-empty string");
  }

  if (!imageUrl || imageUrl.trim() === "") {
    throw new Error("imageUrl parameter is required and cannot be empty");
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(idwhatsapp);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return {
        stat: "error",
        data: {
          message: `User ${idwhatsapp} not found.`,
        },
      };
    }

    const userData = docSnap.data();
    const existingAlbum = userData.album || [];
    const existingAlbumCount = userData.albumCount || 0;
    const existingRedeem = userData.redeem || 0;

    // Extract already-used stamp numbers from album array
    const usedStamps = existingAlbum.map((item) => item.stamp);

    // Pick a random number 1–110, excluding the already-used ones
    const newStamp = pickRandomNumber(usedStamps);

    // Create new album entry with stamp, url and current timestamp
    const newAlbumEntry = {
      stamp: newStamp,
      url: imageUrl,
      timestamp: Timestamp.now(),
    };

    const newRedeemRaw = existingRedeem + 1;
    const promoTriggered = newRedeemRaw >= 3;
    const newRedeem = promoTriggered ? 0 : newRedeemRaw;
    const existingPromosCount = userData.promosCount || 0;
    const newPromosCount = promoTriggered
      ? existingPromosCount + 1
      : existingPromosCount;

    // Update the document atomically
    await docRef.update({
      album: FieldValue.arrayUnion(newAlbumEntry),
      albumCount: existingAlbumCount + 1,
      redeem: newRedeem,
      promosCount: newPromosCount,
    });

    console.log(`Album updated successfully for user ${idwhatsapp}`);
    console.log(
      `New stamp: ${newStamp}, URL: ${imageUrl}, Album count: ${existingAlbumCount + 1}, Redeem: ${newRedeem}, PromosCount: ${newPromosCount}`,
    );
    if (promoTriggered)
      console.log(
        `Promo triggered! Redeem reset to 0, promosCount incremented to ${newPromosCount}`,
      );

    return {
      stat: "ok",
      data: {
        message: "Album data updated successfully",
        newStamp: newStamp,
        url: imageUrl,
        albumCount: existingAlbumCount + 1,
        redeem: newRedeem,
        promosCount: newPromosCount,
        promoTriggered: promoTriggered,
      },
    };
  } catch (error) {
    console.error("Error updating album data:", error.message);
    return {
      stat: "error",
      data: {
        message: error.message,
      },
    };
  }
}
