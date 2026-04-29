import nodemailer from "nodemailer";
import ENV_VARS from "../config/ENV_VARS.js";

const transporter = nodemailer.createTransport({
  host: "mail.polloparatodos.com",
  port: 465,
  secure: true,
  auth: {
    user: ENV_VARS.EMAIL_USER,
    pass: ENV_VARS.EMAIL_PASS,
  },
});

console.log(ENV_VARS.EMAIL_USER, ENV_VARS.EMAIL_PASS );

/**
 * Sends a coupon promotion email to the user
 * @param {string} mailadd - The recipient email address
 * @param {string} nombre - The recipient name
 * @param {string} promotionId - The promotion ID
 * @param {string} code - The 6-digit coupon code
 * @param {string} company - The company/restaurant name
 * @param {string} type - The promotion type (e.g., "10% off")
 * @param {string} expiration - The expiration date as string
 * @returns {Promise<boolean>} True if email sent successfully
 */
export const sendCouponEmail = async (
  mailadd,
  nombre,
  promotionId,
  code,
  company,
  type,
  expiration
) => {
  const message = {
    from: "hola@polloparatodos.com",
    to: mailadd,
    subject: `¡Felicidades ${nombre}! Tu cupón de ${type} está aquí 🎉`,
    html: `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tu Cupón de Promoción</title>
  <style>
    body {
      font-family: 'Bricolage Grotesque', Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ff6b35 0%, #f7c948 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
    }
    .coupon-box {
      background: #fff8e1;
      border: 3px dashed #ff6b35;
      border-radius: 8px;
      margin: 25px;
      padding: 30px;
      text-align: center;
    }
    .coupon-code {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #ff6b35;
      margin: 15px 0;
    }
    .coupon-details {
      font-size: 16px;
      line-height: 1.6;
      color: #555;
    }
    .coupon-details strong {
      color: #ff6b35;
    }
    .footer {
      background: #333;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 14px;
    }
    .expiration {
      color: #e74c3c;
      font-weight: bold;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ¡Felicidades, ${nombre}!</h1>
      <p>Has canjeado tu recompensa exitosamente</p>
    </div>

    <div class="coupon-box">
      <p class="coupon-details">
        Tu cupón de <strong>${type}</strong><br>
        válido en <strong>${company}</strong>
      </p>

      <div class="coupon-code">${code}</div>

      <p class="coupon-details">
        ID de promoción: ${promotionId}
      </p>

      <p class="expiration">
        ⚠️ Válido hasta: ${expiration}
      </p>
    </div>

    <div class="footer">
      <p>Este cupón es personal y no puede ser transferido.</p>
      <p>Pollo para Todos - Una pasión para todos ⚽🐓</p>
    </div>
  </div>
</body>
</html>`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (error, info) => {
      if (error) {
        console.error("Error sending coupon email:", error);
        reject(error);
      } else {
        console.log("Coupon email sent: %s", info.messageId);
        resolve(true);
      }
    });
  });
};