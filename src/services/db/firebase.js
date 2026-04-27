import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ENV_VARS from '../config/ENV_VARS.js';

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

export default db;