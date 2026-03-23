/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import 'dotenv/config'
console.log(process.env)

import express from "express";
import axios from "axios";
import { saveUser, checkImage } from "./fire.js";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
const { WEBHOOK_VERIFY_TOKEN="pollohook2026", GRAPH_API_TOKEN="EAAeagvTCMkgBO29NGvkR1vAWlZCcJYiL8xV1BldE0pirZBMcVKgoSZA4nMH3wCy1gGSacRWIXK3bCzZCqfP4U0I9ni4sZB91GdNI167LpszEqydKdzLp8KD2T6aZAYswZA0Shcn2eHh0DpVMhi1ZAZCztU0dfGcHy2ZA5zZCWxZByDLqyDRCIWZAEnZAmU9oOYh45MBAZDZD", PORT="5200" } = process.env;

app.post("/phook", async (req, res) => {
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
        // Fetch image metadata
        const imageMetadataResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${mediaId}`,
          {
            headers: {
              Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            },
            params: {
              phone_number_id: business_phone_number_id,
            }
          }
        );
        
        console.log("Image metadata:", imageMetadataResponse.data);
        const imageUrl = imageMetadataResponse.data.url;
        
        // Download image and convert to base64
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
          }
        });
        
        const base64Image = Buffer.from(imageResponse.data).toString("base64");
        const mimeType = imageMetadataResponse.data.mime_type || "image/jpeg";

        if (senderWhatsAppId) {
          const imageValidationResult = await checkImage(senderWhatsAppId, base64Image, mimeType);
          console.log("checkImage result:", imageValidationResult);
        } else {
          console.warn("Unable to call checkImage: sender WhatsApp ID was not found in webhook payload.");
        }
        
        console.log("Image converted to base64. Length:", base64Image.length);
        console.log("MIME type:", mimeType);
        console.log("Base64 Image Data:", `data:${mimeType};base64,${base64Image}`);
        
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
app.get("/phook", (req, res) => {
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

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
