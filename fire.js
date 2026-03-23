import { initializeApp, applicationDefault } from 'firebase-admin/app';

import { getAuth } from 'firebase-admin/auth';

import { getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore';

import nodemailer from "nodemailer";
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

const pdf = require("pdf-creator-node");

const storage = new Storage();
const BUCKET_NAME = 'polloparatodos-album';
const VISION_API_KEY = 'AIzaSyC2-jDosZwAyixNiDlKxKjvvRp-JGV3j2I';

const transporter = nodemailer.createTransport({
    host: "mail.polloparatodos.com",
    port: 465,
    secure: true,
    auth: {
        user: "hola@polloparatodos.com",
        pass: "V#Iio53([6dwA[+M"
    }
});

const db = getFirestore();

async function updateAlbumData(idrev, url, db) {
    try {
        const docRef = db.collection('user_profile').doc(idrev);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists()) {
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
            album: FieldValue.arrayUnion([newAlbumEntry]),
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
      subject: '¡Bienvenido(a) '+ nombre +'! ⚽🐓',
      html: "<!doctype html> <html> <head> <meta charset='UTF-8'> <title>Una Pasión para todos</title>        <style type='text/css'            emogrify='no'>         body {             width: 100% !important;             -webkit-text-size-adjust: 100%;             -ms-text-size-adjust: 100%;             margin: 0;             padding: 0;             color: #ffffff;         }          table {             border-collapse: collapse;             mso-table-lspace: 0pt;             mso-table-rspace: 0pt;         }          th {             font-weight: normal;             text-align: left;         }          tr {             display: inline-flex;             width: 100%;         }          td {             width: 100%;         }          a:link {             text-decoration: none;             color: inherit;         }          a:visited {             text-decoration: none;             color: inherit;         }          a:hover {             text-decoration: none;         }          a:active {             text-decoration: none;         }          @media only screen and (max-width: 650px) {             .r1-o {                 width: 100%;             }         }     </style>        <style type='text/css'            emogrify='no'>         @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');         @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap:wght@400&display=swap');     </style>    </head> <body style='font-family: Bricolage Grotesque;'> <table            cellspacing='0' cellpadding='0' border='0' role='presentation'            class='nl2go-body-table' width='100%' style='width: 100%;'> <tr                style='margin-top: 0;'> <td align='center'                    style='position: absolute; z-index: 1;'> <table                        cellspacing='0' cellpadding='0' border='0'                        role='presentation' width='650' height='700'                        class='r1-o'                        style='table-layout: fixed;  text-align: left; background-color: #e85737; background-size: cover; background-position: center;'>                        <tr> <td                                style='width: 100%; padding: 2rem 2rem 1rem 3rem; text-align: center;'>                                <img                                    src='https://polloparatodos.com/assets/img/logo/logpollo.jpg'                                    width='200' border='0' alt='Logo'> </td>                        </tr> <tr> <td                                style='width: 100%; padding: 1.2rem 0; text-align: center;'>                                <img                                    src='https://polloparatodos.com/assets/img/banner/pll3.jpg'                                    width='100%' border='0' alt='Banner'> </td>                        </tr> <tr> <td                                style='padding: 1rem 3rem 0.5rem 3rem;width: 100%; text-align:center; margin: auto;'>                                <font                                    style='font-size: 1.5rem; letter-spacing: -0.5px; line-height: 10pt; letter-spacing: 0.5px; font-weight: 400; color: #642f0d;'>                                    Hola</font> <font                                    style='font-size: 1.65rem; letter-spacing: -0.5px; line-height: 10pt; letter-spacing: 0.5px; font-weight: 400; color: #eddd5e;'>                                    "+ nombre +"</font> </td> </tr> <tr> <td                                style='padding: 1rem 3rem 0.5rem 3rem;width: 70%;text-align: center;margin: auto;'>                                <img                                    src='https://quickchart.io/qr?text="+ id +"&size=250'                                    width='150' border='0' alt='Id'> <p                                    style='color: #642f0d; font-size: 1.5rem; font-weight: 400; margin: 0;'>Folio</p>                                <p                                    style='color: #eddd5e; font-size: 1.5rem; font-weight:800; margin: 0 0 1rem 0;'>                                    "+ id +" </p> </td> </tr> <tr> <td                                style='padding: 0rem 1.5rem 0.5rem 1.5rem;width: 87%;margin: auto;'>                                <font                                    style='font-size: 1.2rem; font-weight: 400; line-height: 10pt; letter-spacing: 0.2px;  color: #642f0d;'>                                    Tu contraseña temporal es: </font><br> <font                                    style='font-size: 1.2rem; font-weight:800; line-height: 10pt;   color: #eddd5e;'>                                    "+ pass +" </font><br><br> <font                                    style='font-size: 1.15rem; font-weight: 400; line-height: 10pt; letter-spacing: 0.2px;  color: #642f0d;'>                                    ¡Gracias por unirte a nuestro </font> <font                                    style='font-size: 1.15rem; font-weight:800; line-height: 10pt; letter-spacing: 0.2px;  color: #eddd5e;'>                                    Plan de Lealtad</font> <font                                    style='font-size: 1.15rem; font-weight: 400; line-height: 10pt; letter-spacing: 0.2px;  color: #642f0d;'>                                    ! Es un gusto contar contigo como parte de                                    nuestra comunidad. Como socio, podrás                                    disfrutar de beneficios exclusivos diseñados                                    para hacer de cada visita una experiencia                                    aún más especial: </font> </td> </tr> <tr>                            <td                                style='width: 100%; padding: 0; text-align: center;'>                                <img                                    src='https://polloparatodos.com/images/beneficios.jpg'                                    width='100%' border='0' alt='Benefits'>                            </td> </tr> <tr> <td                                style='padding: 0rem 1.5rem 0rem 1.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 1.2rem; font-weight: 400; line-height: 10pt; letter-spacing: 0.2px;  color: #642f0d;'>                                    Estamos felices de tenerte con nosotros y                                    esperamos que aproveches al máximo todos                                    estos beneficios. </font><br><br> <font                                    style='font-size: 1.15rem; font-weight: 400; letter-spacing: -0.1px; line-height: 10pt; letter-spacing: 0.5px;  color: #642f0d;'>                                    Saludos cordiales, </font> </td> </tr> <tr>                            <td                                style='padding: 0rem 1.5rem 0rem 1.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 1.15rem; font-weight:800; letter-spacing: -0.1px; line-height: 10pt; letter-spacing: 0.5px;  color: #eddd5e;'>                                    Muchas Gracias </font> </td> </tr> <tr> <td                                style='padding: 0.5rem 1.5rem 0.5rem 1.5rem;width: 90%;margin: auto;'>                                <font                                    style='font-size: 0.5rem; letter-spacing: -0.2px; line-height: 10pt; letter-spacing: 0.5px;  color: #642f0d;'>                                    ** Aplican <a                                        href='https://polloparatodos.com/terminos.html'                                        target='_blank'                                        style='text-decoration: none;color: inherit;'>términos                                        y condiciones </a></font> </td> </tr>                        <tr> <td                                style='width: 100%; font-size: 0.5rem; padding: 0.4rem 0.9rem; line-height: 15px; text-align: center; font-weight: bolder; background-color: #000; color: #FFFFFF;'>                                <a href='https://polloparatodos.com/'                                    target='_blank' _label='FA'> <font                                        style='font-size: 1rem; font-weight: 400; line-height: 12.45 pt; vertical-align: sub;'>                                        <span                                            style='color: #FFFFFF;'></span><span                                            style='color: #FFFFFF;'>polloparatodos.com</span>                                    </font> </a> </td> </tr> <tr> <td                                style='width: 100%; font-size: 0.5rem; padding: 0.4rem 0.9rem 0.6rem 0.9rem; line-height: 15px; text-align: center; font-weight: bolder; background-color: #EEAA36; color: #642f0d;'>                                <font                                    style='font-size: 0.8rem; font-weight: 400; line-height: 12.45 pt; vertical-align: sub;'>                                    © Una Pasión para todos 2026 | <a                                        href='https://polloparatodos.com/aviso_privacidad.html'                                        target='_blank'                                        style='text-decoration: none;color: inherit;'>Política                                        de privacidad</a></font> </td> </tr>                    </table> </td> </tr> </table> </body> </html>"
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

        if (!docSnap.exists()) {
            console.error(`User ${idwhatsapp} not found in user_profile.`);
            return {
                stat: "error",
                data: { message: `User ${idwhatsapp} not found.` }
            };
        }

        console.log(`User ${idwhatsapp} found. Calling Google Vision API...`);

        // 2. Call Google Vision API with base64 image
        const visionResponse = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
            {
                requests: [
                    {
                        image: { content: image64 },
                        features: [{ type: 'LABEL_DETECTION', maxResults: 10 }]
                    }
                ]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const labels = visionResponse.data?.responses?.[0]?.labelAnnotations || [];
        console.log("Vision labels:", labels.map(l => l.description));

        // 3. Check if any label contains the word 'chicken' (case-insensitive, trim spaces)
        const isChicken = labels.some(
            l => l.description.trim().toLowerCase().includes('chicken')
        );

        if (!isChicken) {
            console.log("No chicken label detected in image.");
            return {
                stat: "error",
                data: { message: "Image does not appear to contain chicken." }
            };
        }

        console.log("Chicken detected! Uploading image to Google Cloud Storage...");

        // 4. Upload base64 image to Google Cloud Storage
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `album/${idwhatsapp}/${Date.now()}.${extension}`;
        const imageBuffer = Buffer.from(image64, 'base64');

        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
            metadata: { contentType: mimeType },
            public: true
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