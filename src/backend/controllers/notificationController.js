const nodemailer = require('nodemailer');
const admin = require('../firebase'); // inizializza admin SDK
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

// Trasportatore email
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Legge un template HTML e sostituisce i placeholder {{chiave}} con i dati forniti.
 */
async function renderTemplate(templateName, templateData, baseFolder) {
  const templatePath = path.join(__dirname, '..', baseFolder, `${templateName}.html`);
  let template = await fs.readFile(templatePath, 'utf-8');
  for (const key in templateData) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(placeholder, templateData[key]);
  }
  return template;
}

/**
 * Invia una notifica email usando un modello HTML.
 * @param {string} recipient - L'indirizzo email del destinatario.
 * @param {string} subject - L'oggetto dell'email.
 * @param {string} templateName - Il nome del file del modello HTML (es. 'bookingConfirmation').
 * @param {object} templateData - Un oggetto con i dati da sostituire nei placeholder (es. { userName: 'Mario', ... }).
 */
async function sendEmailNotification(recipient, subject, templateName, templateData) {
  try {
    const htmlTemplate = await renderTemplate(templateName, templateData, 'templates');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject,
      html: htmlTemplate,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Email inviata:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Errore invio email:', error);
    return { success: false, error: error.message };
  }
}


/**
 * Invia una notifica push FCM usando un modello HTML per il messaggio.
 * @param {string} fcmToken - Il token del dispositivo a cui inviare la notifica.
 * @param {string} title - Titolo della notifica.
 * @param {string} templateName - Nome del file modello HTML (es. 'bookingConfirmation').
 * @param {object} templateData - Dati da sostituire nei placeholder (es. { userName: 'Mario' }).
 * @param {object} dataPayload - (Opzionale) payload extra per navigazione in-app ecc.
 */
async function sendPushNotification(fcmToken, title, templateName, templateData, dataPayload = {}) {
  try {
    const textBody = await renderTemplate(templateName, templateData, 'templates');
    const message = {
      token: fcmToken,
      notification: {
        title,
        body: textBody,
      },
      data: dataPayload,
    };
    const response = await admin.messaging().send(message);
    console.log('Push inviata:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Errore invio push:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendPush,
};
