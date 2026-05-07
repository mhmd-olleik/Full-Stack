const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;
  
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.log('⚠️  Firebase: No service account key found. Push notifications disabled.');
    console.log('   To enable, add serviceAccountKey.json to backend/config/');
    return;
  }

  try {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
};

const getFirebaseAdmin = () => {
  if (!firebaseInitialized) return null;
  return admin;
};

module.exports = { initFirebase, getFirebaseAdmin };
