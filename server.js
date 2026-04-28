/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import 'dotenv/config'
// console.log(process.env)


import express from "express";
import axios from "axios";
import { saveUser } from "./fire.js";
import { validateImage } from "./src/application/validate_image.js";
import { ReadLastNMessages } from "./src/application/read_last_n_messages.js";
import cors from "cors";
import ENV_VARS from './src/services/config/ENV_VARS.js';

const app = express();
app.use(express.json());
app.use(cors());
const { WEBHOOK_VERIFY_TOKEN="pollohook2026", GRAPH_API_TOKEN="EAARsh9tdbmoBPJb4q5jBBRaehLIjIfTw2CGelJBTZCuDwkSwBdf5nPWc62bb3hEJ3sPZA487zAAhuDFkJz0ZCYOterbeuKyR7JDBTLZATIhTh0UHKpZAOPL37mXCyXbIQwwHmUwzaPHW2aJQAhJeZCLlRCXxkRM1MNBFfmQeKggfguJdhhSidAXa78LlBdZAQZDZD", PORT="5200" } = process.env;

app.post("/pollo/phook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  // check if the webhook contains a message
  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
  const business_phone_number_id = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
  const senderWhatsAppId = message?.from;
  if (message) {
    // Handle image messages
    if (message.type === "image" && message.image) {
      const mediaId = message.image.id;
      console.log("Image message received with media ID:", mediaId);
      
      try {
        // Step 1: Fetch image metadata with phone_number_id const axios = require('axios');

        const metadataConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `https://graph.facebook.com/v23.0/${mediaId}?phone_number_id=${business_phone_number_id}`,
          headers: {
            'Authorization': `Bearer ${GRAPH_API_TOKEN}`
          }
        };
        const imageMetadataResponse = await axios.request(metadataConfig);
        
        console.log("Step 1 - Image metadata:", imageMetadataResponse.data.url);
        const mediaUrl = imageMetadataResponse.data.url;
        const mimeType = imageMetadataResponse.data.mime_type || "image/jpeg";
        
        // Step 2: Fetch the actual download URL by passing the media URL (URL-encoded)
        const encodedUrl = encodeURIComponent(mediaUrl);
        console.log("Encoded URL:",encodedUrl);
        const downloadUrlConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `https://graph.facebook.com/v19.0/${encodedUrl}`,
          headers: {
            'Authorization': `Bearer ${GRAPH_API_TOKEN}`
          }
        };
        const downloadUrlResponse = await axios.request(downloadUrlConfig);
        
        console.log("Step 2 - Download URL response:", downloadUrlResponse.data);
        const downloadUrl = downloadUrlResponse.data.id || mediaUrl;
        console.log("downloaded URL:",downloadUrl);
        // Step 3: Download the actual image binary
        const imageConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          url: downloadUrl,
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${GRAPH_API_TOKEN}`
          }
        };
        const imageResponse = await axios.request(imageConfig);
        
        const base64Image = Buffer.from(imageResponse.data).toString("base64");

        if (senderWhatsAppId) {
          const imageValidationResult = await validateImage(senderWhatsAppId, base64Image, mimeType);
          console.log("validateImage result:", imageValidationResult);
        } else {
          console.warn("Unable to call validateImage: sender WhatsApp ID was not found in webhook payload.");
        }

        // if (senderWhatsAppId) {
        //   const imageValidationResult = await checkImage(senderWhatsAppId, base64Image, mimeType);
        //   console.log("checkImage result:", imageValidationResult);
        // } else {
        //   console.warn("Unable to call checkImage: sender WhatsApp ID was not found in webhook payload.");
        // }
        
        console.log("Image converted to base64. Length:", base64Image.length);
        console.log("MIME type:", mimeType);
        //console.log("Base64 Image Data:", `data:${mimeType};base64,${base64Image}`);
        
        // You can now use the base64Image as needed:
        // - Send to another service
        // - Store in database
        // - Process with AI/ML models
        // - etc.
      } catch (error) {
        console.error("Error processing image:", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/pollo/phook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

app.post("/pollo/saveusr", async (req, res) => {
    const conn = req.body;
    try {    
      const screenshot = await saveUser(conn);
      console.log(screenshot);
      res.send(screenshot)
  } catch(e) {
      // catch errors and send error status
      console.log(e);
      res.sendStatus(500);
  }
});

app.get("/pollo/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

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

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
