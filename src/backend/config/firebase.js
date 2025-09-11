const admin = require('firebase-admin');

// Legge il JSON dalla variabile d'ambiente su Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
