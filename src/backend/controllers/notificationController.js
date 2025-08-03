const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs').promises; // Importare il modulo fs per leggere i file
const path = require('path'); // Importare il modulo path per gestire i percorsi

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Invia una notifica email usando un modello HTML.
 * @param {string} recipient - L'indirizzo email del destinatario.
 * @param {string} subject - L'oggetto dell'email.
 * @param {string} templateName - Il nome del file del modello HTML (es. 'bookingConfirmation').
 * @param {object} templateData - Un oggetto con i dati da sostituire nei placeholder (es. { userName: 'Mario', ... }).
 */
exports.sendEmailNotification = async (recipient, subject, templateName, templateData) => {
  try {
    // 1. Costruisce il percorso completo del file modello
    const templatePath = path.join(__dirname, '..', 'email_templates', `${templateName}.html`);
    
    // 2. Legge il contenuto del file in modo asincrono
    let htmlTemplate = await fs.readFile(templatePath, 'utf-8');

    // 3. Sostituisce i placeholder nel modello con i dati forniti
    for (const key in templateData) {
      const placeholder = new RegExp(`{{${key}}}`, 'g'); // Crea una regex globale
      const value = templateData[key];
      htmlTemplate = htmlTemplate.replace(placeholder, value);
    }

    // 4. Configura e invia l'email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: subject,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Notifica email inviata con successo:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Errore durante l\'invio della notifica email:', error);
    return { success: false, error: error.message };
  }
};