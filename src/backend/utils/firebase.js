const admin = require('firebase-admin');
const path = require('path');

// Carica il file delle credenziali del tuo progetto Firebase
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
