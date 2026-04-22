import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

import { getAuth } from 'firebase-admin/auth';

import { getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore';

import nodemailer from "nodemailer";
import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import { isValidImage } from './src/services/is_valid_image.js';

import pdf from "pdf-creator-node";
import ENV_VARS from './src/services/config/ENV_VARS.js';

const bucketCredentials = {
    type: "service_account",
    project_id: ENV_VARS.BUCKET_PROJECT_ID,
    private_key_id: ENV_VARS.BUCKET_PRIVATE_KEY_ID,
    private_key: ENV_VARS.BUCKET_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: ENV_VARS.BUCKET_CLIENT_EMAIL,
    client_id: ENV_VARS.BUCKET_CLIENT_ID,
    auth_uri: ENV_VARS.BUCKET_AUTH_URI,
    token_uri: ENV_VARS.BUCKET_TOKEN_URI,
    auth_provider_x509_cert_url: ENV_VARS.BUCKET_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: ENV_VARS.BUCKET_CLIENT_X509_CERT_URL,
    universe_domain: ENV_VARS.BUCKET_UNIVERSE_DOMAIN
};

const storage = new Storage({
    projectId: ENV_VARS.BUCKET_PROJECT_ID,
    credentials: bucketCredentials
});
const BUCKET_NAME = 'polloparatodos-album';
const VISION_API_KEY = 'AIzaSyC2-jDosZwAyixNiDlKxKjvvRp-JGV3j2I';

const transporter = nodemailer.createTransport({
    host: "mail.polloparatodos.com",
    port: 465,
    secure: true,
    auth: {
        user: "hola@polloparatodos.com",
        pass: ENV_VARS.EMAIL_PASS || "V#Iio53([6dwA[+M"
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebaseCredentials = {
    type: "service_account",
    project_id: ENV_VARS.FIREBASE_PROJECT_ID,
    private_key_id: ENV_VARS.FIREBASE_PRIVATE_KEY_ID,
    private_key: ENV_VARS.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: ENV_VARS.FIREBASE_CLIENT_EMAIL,
    client_id: ENV_VARS.FIREBASE_CLIENT_ID,
    auth_uri: ENV_VARS.FIREBASE_AUTH_URI,
    token_uri: ENV_VARS.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: ENV_VARS.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: ENV_VARS.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: ENV_VARS.FIREBASE_UNIVERSE_DOMAIN
};

if (!getApps().length) {
    initializeApp({
        credential: cert(firebaseCredentials),
        projectId: ENV_VARS.FIREBASE_PROJECT_ID,
        databaseURL: 'https://polloparatodos-26402.firebaseio.com'
    });
}

const db = getFirestore();

async function updateAlbumData(idrev, url, db) {
    try {
        const docRef = db.collection('user_profile').doc(idrev);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            console.error(`Document with ID ${idrev} does not exist.`);
            return {
                stat: "error",
                data: {
                    message: `User profile with ID ${idrev} not found.`
                }
            };
        }
        
        if (!url || url.trim() === '') {
            return {
                stat: "error",
                data: {
                    message: "URL parameter is required and cannot be empty"
                }
            };
        }
        
        const userData = docSnap.data();
        const existingAlbum = userData.album || [];
        const existingAlbumCount = userData.albumCount || 0;
        const existingRedeem = userData.redeem || 0;
        
        // Extract already-used stamp numbers from album array
        const usedStamps = existingAlbum.map(item => item.stamp);
        
        // Pick a random number 1–110, excluding the already-used ones
        const newStamp = pickRandomNumber(usedStamps);
        
        // Create new album entry with stamp, url and current timestamp
        const newAlbumEntry = {
            stamp: newStamp,
            url: url,
            timestamp: Timestamp.now()
        };
        
        const newRedeemRaw = existingRedeem + 1;
        const promoTriggered = newRedeemRaw >= 3;
        const newRedeem = promoTriggered ? 0 : newRedeemRaw;
        const existingPromosCount = userData.promosCount || 0;
        const newPromosCount = promoTriggered ? existingPromosCount + 1 : existingPromosCount;

        // Update the document atomically
        await docRef.update({
            album: FieldValue.arrayUnion(newAlbumEntry),
            albumCount: existingAlbumCount + 1,
            redeem: newRedeem,
            promosCount: newPromosCount
        });
        
        console.log(`Album updated successfully for user ${idrev}`);
        console.log(`New stamp: ${newStamp}, URL: ${url}, Album count: ${existingAlbumCount + 1}, Redeem: ${newRedeem}, PromosCount: ${newPromosCount}`);
        if (promoTriggered) console.log(`Promo triggered! Redeem reset to 0, promosCount incremented to ${newPromosCount}`);
        
        return {
            stat: "ok",
            data: {
                message: "Album data updated successfully",
                newStamp: newStamp,
                url: url,
                albumCount: existingAlbumCount + 1,
                redeem: newRedeem,
                promosCount: newPromosCount,
                promoTriggered: promoTriggered
            }
        };
    } catch (error) {
        console.error('Error updating album data:', error.message);
        return {
            stat: "error",
            data: {
                message: error.message
            }
        };
    }
}

async function addDocumentWithId(id,data,db) {
  // [START firestore_data_set_id_specified]
  await db.collection('user_profile').doc(id).set(data);
  // [END firestore_data_set_id_specified]
}

async function generatePassword() {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function pickRandomNumber(excluded = []) {
    const excludedSet = new Set(excluded);
    const available = [];
    for (let i = 1; i <= 110; i++) {
        if (!excludedSet.has(i)) available.push(i);
    }
    if (available.length === 0) {
        throw new Error("No available numbers to pick from (all 1–110 are excluded).");
    }
    return available[Math.floor(Math.random() * available.length)];
}

async function sendingEmail( mailadd, nombre, id, pass){
    var message = {
      from: 'hola@polloparatodos.com',
      to: mailadd,
      subject: '¡Bienvenido(a) '+ nombre +'! Empieza tu experiencia y gana recompensas ⚽🐓',
      html: "<!doctype html> <html> <head> <meta charset='UTF-8'> <title>Una Pasión para            todos</title> <style type='text/css'            emogrify='no'>         body {             width: 100% !important;             -webkit-text-size-adjust: 100%;             -ms-text-size-adjust: 100%;             margin: 0;             padding: 0;             color: #ffffff;         }          table {             border-collapse: collapse;             mso-table-lspace: 0pt;             mso-table-rspace: 0pt;         }          th {             font-weight: normal;             text-align: left;         }          tr {             display: inline-flex;             width: 100%;         }          td {             width: 100%;         }          a:link {             text-decoration: none;             color: inherit;         }          a:visited {             text-decoration: none;             color: inherit;         }          a:hover {             text-decoration: none;         }          a:active {             text-decoration: none;         }          @media only screen and (max-width: 650px) {             .r1-o {                 width: 100%;             }         }     </style>        <style type='text/css'            emogrify='no'>         @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');         @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap:wght@400&display=swap');     </style>    </head> <body style='font-family: Bricolage Grotesque;'> <table            cellspacing='0' cellpadding='0' border='0' role='presentation'            class='nl2go-body-table' width='100%' style='width: 100%;'> <tr                style='margin-top: 0;'> <td align='center'                    style='position: absolute; z-index: 1;'> <table                        cellspacing='0' cellpadding='0' border='0'                        role='presentation' width='650' height='700'                        class='r1-o'                        style='table-layout: fixed;  text-align: left; background-color: #e85737; background-size: cover; background-position: center;'>                        <tr> <td                                style='width: 100%; padding: 1rem 2rem 1rem 3rem; text-align: center;'>                                <img                                    src='https://polloparatodos.com/assets/img/pollotra.png'                                    width='100' border='0' alt='Logo'> </td>                        </tr> <tr> <td                                style='width: 100%; padding: 1.2rem 0; text-align: center;'>                                <img                                    src='https://polloparatodos.com/assets/img/4_MASTER.jpg'                                    width='100%' border='0' alt='Banner'> </td>                        </tr> <tr> <td                                style='padding: 1rem 3rem 0.5rem 3rem;width: 100%; text-align:center; margin: auto;'>                            </td> </tr> <tr> <td                                style='padding: 1rem 3rem 0.5rem 3rem;width: 70%;text-align: center;margin: auto;'>                            </td> </tr> <tr> <td                                style='padding: 0rem 1.5rem 0.5rem 1.5rem;width: 87%;margin: auto;'>                                <font                                    style='font-size: 1.25rem; font-weight: 800; line-height: 14pt; color: #FFFFFF;'>¡Hola!</font><font                                    style='font-size: 1.25rem; letter-spacing: -0.5px; line-height: 10pt; letter-spacing: 0.5px; font-weight: 400; color: #eddd5e;'>                                    "+ nombre +"</font><br><br> <font                                    style='font-size: 1.1rem; font-weight: 400; line-height: 14pt; color: #FFFFFF;'>                                    Te damos la bienvenida a una experiencia                                    diseñada para que participes, te diviertas y                                    obtengas recompensas increíbles.                                </font><br><br> <font                                    style='font-size: 1.1rem; font-weight: 700; line-height: 14pt; color: #FFFFFF;'>Participar                                    es muy fácil:</font><br><br> <font                                    style='font-size: 1.05rem; font-weight: 400; line-height: 16pt; color: #FFFFFF;'>                                    🔹 <b>1. Inicia tu experiencia</b><br>                                    Accede directamente a WhatsApp para comenzar                                    a interactuar con nuestro experto en                                    pollos.<br><br> 🔹 <b>2. Comparte tu                                        foto</b><br> Envía tu foto y nosotros                                    nos encargamos del resto. Nuestro sistema                                    validará automáticamente que cumpla con los                                    criterios de la dinámica.<br><br> 🔹 <b>3.                                        Acumula participaciones</b><br> Cada                                    envío válido suma a tu progreso. Entre más                                    participes, más cerca estarás de obtener                                    recompensas.<br><br> 🔹 <b>4. Recibe tu                                        recompensa 🎁</b><br> Al cumplir las                                    condiciones, recibirás automáticamente                                    promociones directamente en                                    WhatsApp.<br><br> 🔹 <b>5. Sigue tu                                        progreso</b><br> Además, podrás acceder                                    a tu perfil en nuestro sitio web para:<br>                                    &bull; Consultar tus participaciones<br>                                    &bull; Ver promociones exclusivas<br> &bull;                                    Explorar recetas y contenido<br> &bull;                                    Encontrar puntos de compra<br><br> </font>                                <font                                    style='font-size: 1.1rem; font-weight: 800; line-height: 14pt; color: #eddd5e;'>✨                                    Podrás comenzar a participar desde el 1 de                                    mayo de 2026, no te pierdas ninguna                                    recompensa.</font><br><br> <a                                    href='https://wa.me/5215565434833'                                    target='_blank'                                    style='display: inline-block; background-color: #25D366; color: #ffffff; font-family: Bricolage Grotesque, sans-serif; font-size: 1rem; font-weight: 700; text-decoration: none; padding: 0.7rem 1.5rem; border-radius: 8px; margin-bottom: 1.2rem;'>                                    💬 Comenzar en WhatsApp </a><br><br> <font                                    style='font-size: 1.05rem; font-weight: 400; line-height: 14pt; color: #FFFFFF;'>                                    Si tienes dudas, nuestro experto en pollo estará                                    listo para ayudarte en todo momento.                                </font><br><br> <font                                    style='font-size: 1.1rem; font-weight: 700; line-height: 14pt; color: #FFFFFF;'>                                    ¡Disfruta la experiencia! </font> </td>                        </tr> <tr> <td                                style='padding: 0rem 1.5rem 0rem 2.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 1.15rem; font-weight: 400; letter-spacing: -0.1px; line-height: 10pt; letter-spacing: 0.5px;  color: #FFFFFF;'>                                    Saludos cordiales, </font> </td> </tr> <tr>                            <td                                style='padding: 0rem 1.5rem 0rem 2.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 1.15rem; font-weight:800; letter-spacing: -0.1px; line-height: 10pt; letter-spacing: 0.5px;  color: #eddd5e;'>                                    Muchas Gracias </font> </td> </tr> <tr> <td                                style='padding: 0.5rem 1.5rem 0.5rem 2.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 0.5rem; letter-spacing: -0.2px; line-height: 10pt; letter-spacing: 0.5px;  color: #FFFFFF;'>                                    ** Aplican <a                                        href='https://polloparatodos.com/TyCPasionparaTodos.pdf'                                        target='_blank'                                        style='text-decoration: none;color: inherit;'>términos                                        y condiciones </a></font> </td> </tr>                        <tr> <td                                style='width: 100%; font-size: 0.5rem; padding: 0.4rem 0.9rem; line-height: 15px; text-align: center; font-weight: bolder; background-color: #000; color: #FFFFFF;'>                                <font                                        style='font-size: 1rem; font-weight: 400; line-height: 12.45 pt; vertical-align: sub;'>                                        <span                                            style='color: #FFFFFF;'></span><span                                            style='color: #FFFFFF;'>Promoción válida en toda la República Mexicana. La disponibilidad y tipo de premios pueden variar por ciudad. Consulta términos y condiciones.</span>                                    </font>  </td> </tr> <tr> <td                                style='width: 100%; font-size: 0.5rem; padding: 0.4rem 0.9rem 0.6rem 0.9rem; line-height: 15px; text-align: center; font-weight: bolder; background-color: #EEAA36; color: #FFFFFF;'>                                <font                                    style='font-size: 0.8rem; font-weight: 400; line-height: 12.45 pt; vertical-align: sub;'>                                    © Una Pasión para todos 2026 | <a                                        href='https://polloparatodos.com/AVISO_DE_PRIVACIDAD_UNA.pdf'                                        target='_blank'                                        style='text-decoration: none;color: inherit;'>Política                                        de privacidad</a></font> </td> </tr>                    </table> </td> </tr> </table> </body> </html>"
      };
    
    await transporter.sendMail(message, (error, info) => {
      if (error) {
          console.log(error);
      }
      console.log('Message sent: %s', info.messageId);
    });
}

export const saveUser = async (conn) => {
    const { name, email, phone, phoneCode, birthday, gender, postal, surname } = conn;
    
    // Validate all required fields
    if (!name || name.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Name field is required and cannot be empty",
            },
        };
    }
    
    if (!email || email.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Email field is required and cannot be empty",
            },
        };
    }
    
    if (!phone || phone.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Phone field is required and cannot be empty",
            },
        };
    }
    
    if (!phoneCode || phoneCode.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Phone code field is required and cannot be empty",
            },
        };
    }
    
    if (!birthday || birthday.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Birthday field is required and cannot be empty",
            },
        };
    }
    
    if (!gender || gender.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Gender field is required and cannot be empty",
            },
        };
    }
    
    if (!postal || postal.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Postal field is required and cannot be empty",
            },
        };
    }
    
    if (!surname || surname.trim() === '') {
        return {
            stat: "error",
            data: {
                message: "Surname field is required and cannot be empty",
            },
        };
    }
    
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("Phone Code:", phoneCode);
    console.log("Birthday:", birthday);
    console.log("Gender:", gender);
    console.log("Postal:", postal);
    console.log("Surname:", surname);

    const normalizedPhoneCode = String(phoneCode).trim().replace(/^\+/, '').replace(/\D/g, '');
    const normalizedPhone = String(phone).replace(/\D/g, '');
    const whatsappId = `${normalizedPhoneCode}1${normalizedPhone}`;

    if (!whatsappId) {
        return {
            stat: "error",
            data: {
                message: "Invalid phoneCode or phone. Unable to build WhatsApp ID",
            },
        };
    }

    console.log("WhatsApp ID:", whatsappId);
    
    const passtemp = await generatePassword();
    console.log("Temporary Password:", passtemp);

    let resultfire = await getAuth().createUser({
      uid: whatsappId,
      email: email,
      emailVerified: false,
      password: passtemp,
      displayName: name,
      photoURL: 'https://savedp.com/wp-content/uploads/2024/08/a-black-and-white-circle-with-sunglasses-on-it.jpg',
      disabled: false,
    })
    .then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log('Successfully created new user:', userRecord.uid);
      
      // Parse birthday to Firebase Timestamp
      let noteDate;
      try {
          noteDate = Timestamp.fromDate(new Date(`${birthday}T00:00:00`));
          console.log("Parsed birthday timestamp:", noteDate);
      } catch (dateError) {
          console.error("Error parsing birthday:", dateError.message);
          throw new Error("Invalid birthday format. Please use YYYY-MM-DD format.");
      }
      
      let datadoc = {
          'name': name,
          'surname': surname,
          'email': email,
          'phone': phone,
          'phoneCode': phoneCode,
          'whatsappId': whatsappId,
          'birthday': noteDate,
          'gender': gender,
          'address': postal,
          'album': [],
          'promos': [],
          'albumCount': 0,
          'promosCount': 0,
          'redeem': 0,
          'createdAt': Timestamp.now(),
          'password': passtemp
      };
      
      const docres = addDocumentWithId(userRecord.uid, datadoc, db);
      const mailing = sendingEmail(email, name, userRecord.uid, passtemp);
      
      return {
              stat: "ok",
              data: {
                id: userRecord.uid,
                email: email
              },
            };
    })
    .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.log("Firebase error:", error);
          console.log("Error message:", error.message);
          return {
              stat: "error",
              data: {
                message: errorMessage,
              },
            };
        });
        
    return resultfire;
}

export const checkImage = async (idwhatsapp, image64, mimeType) => {
    console.log("Checking image for WhatsApp ID:", idwhatsapp);
    console.log("MIME type:", mimeType);
    console.log("Base64 Image Length:", image64.length);

    try {
        // 1. Verify user exists in Firestore
        const docRef = db.collection('user_profile').doc(idwhatsapp);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.error(`User ${idwhatsapp} not found in user_profile.`);
            return {
                stat: "error",
                data: { message: `User ${idwhatsapp} not found.` }
            };
        }

        console.log(`User ${idwhatsapp} found. Validating image...`);

        // 2. Validate image using AI classifier
        const validationResult = await isValidImage(image64, mimeType);

        console.log("AI Validation result:", validationResult);

        if (validationResult.is_valid !== true) {
            console.log("Image validation failed:", validationResult.reason);
            return {
                stat: "error",
                data: { message: validationResult.reason || "Image does not appear to contain chicken." }
            };
        }

//         // 2. Call Google Vision API with base64 image
//         const visionResponse = await axios.post(
//             `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
//             {
//                 requests: [
//                     {
//                         image: { content: image64 },
//                         features: [{ type: 'LABEL_DETECTION', maxResults: 10 }]
//                     }
//                 ]
//             },
//             { headers: { 'Content-Type': 'application/json' } }
//         );
// 
//         const labels = visionResponse.data?.responses?.[0]?.labelAnnotations || [];
//         console.log("Vision labels:", labels.map(l => l.description));
// 
//         // 3. Check if any label contains the word 'chicken' (case-insensitive, trim spaces)
//         const isChicken = labels.some(
//             l => l.description.trim().toLowerCase().includes('chicken')
//         );
// 
//         if (!isChicken) {
//             console.log("No chicken label detected in image.");
//             return {
//                 stat: "error",
//                 data: { message: "Image does not appear to contain chicken." }
//             };
//         }
//         console.log("Chicken detected! Uploading image to Google Cloud Storage..."); 

        console.log("Image validated! Uploading image to Google Cloud Storage...");

        // // 4. Upload base64 image to Google Cloud Storage
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `album/${idwhatsapp}/${Date.now()}.${extension}`;
        const imageBuffer = Buffer.from(image64, 'base64');
        // // 5. Update user album with stamp, url and timestamp

        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
            metadata: { contentType: mimeType }
            //public: true
        });

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
        console.log("Image uploaded to:", publicUrl);

        // 5. Update user album with stamp, url and timestamp
        const albumResult = await updateAlbumData(idwhatsapp, publicUrl, db);
        return albumResult;

    } catch (error) {
        console.error("Error in checkImage:", error.message);
        return {
            stat: "error",
            data: { message: error.message }
        };
    }
}