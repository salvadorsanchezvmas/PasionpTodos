import { Storage } from "@google-cloud/storage";
import ENV_VARS from "../config/ENV_VARS.js";

const bucketCredentials = {
  type: "service_account",
  project_id: ENV_VARS.BUCKET_PROJECT_ID,
  private_key_id: ENV_VARS.BUCKET_PRIVATE_KEY_ID,
  private_key: ENV_VARS.BUCKET_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: ENV_VARS.BUCKET_CLIENT_EMAIL,
  client_id: ENV_VARS.BUCKET_CLIENT_ID,
  auth_uri: ENV_VARS.BUCKET_AUTH_URI,
  token_uri: ENV_VARS.BUCKET_TOKEN_URI,
  auth_provider_x509_cert_url:
    ENV_VARS.BUCKET_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: ENV_VARS.BUCKET_CLIENT_X509_CERT_URL,
  universe_domain: ENV_VARS.BUCKET_UNIVERSE_DOMAIN,
};

const storage = new Storage({
  projectId: ENV_VARS.BUCKET_PROJECT_ID,
  credentials: bucketCredentials,
});

const BUCKET_NAME = "polloparatodos-album";

/**
 * Uploads a base64 encoded image to Google Cloud Storage.
 *
 * @param {string} idwhatsapp - The WhatsApp identifier for the user
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {string} mimeType - MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns {Promise<string>} Public URL of the uploaded image
 *
 * @example
 * const url = await uploadImage("123456789", base64Image, "image/jpeg");
 * // Returns: "https://storage.googleapis.com/polloparatodos-album/album/123456789/1745892000000.jpg"
 */
export async function uploadImage(idwhatsapp, imageBase64, mimeType) {
  if (!idwhatsapp || typeof idwhatsapp !== "string") {
    throw new Error("idwhatsapp must be a non-empty string");
  }

  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new Error("imageBase64 must be a non-empty string");
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new Error("mimeType must be a non-empty string");
  }

  const extension = mimeType.split("/")[1] || "jpg";
  const fileName = `album/${idwhatsapp}/${Date.now()}.${extension}`;
  const imageBuffer = Buffer.from(imageBase64, "base64");

  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(fileName);

  await file.save(imageBuffer, {
    metadata: { contentType: mimeType },
  });

  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
  console.log("Image uploaded to:", publicUrl);

  return publicUrl;
}
