const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../../firebase-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
});

module.exports = admin;