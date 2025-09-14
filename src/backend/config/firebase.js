
const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Parse JSON from env variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
    // Fallback: load from file (sviluppo locale)
    serviceAccount = require('../../firebase-service-account.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;