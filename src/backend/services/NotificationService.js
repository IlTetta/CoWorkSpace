// src/backend/services/NotificationService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const Notification = require('../models/Notification');
const admin = require('../config/firebase'); 

/**
 * Service per gestire l'invio di notifiche email e push
 */
class NotificationService {
    /**
     * Configura il trasportatore email
     */
    static createTransporter() {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('📧 Email credentials not found - using test mode');
            return {
                sendMail: async (mailOptions) => {
                    console.log('📧 [TEST MODE] Email would be sent:', {
                        from: mailOptions.from,
                        to: mailOptions.to,
                        subject: mailOptions.subject,
                        htmlPreview: mailOptions.html ? mailOptions.html.substring(0, 100) + '...' : 'No HTML'
                    });
                    return { 
                        messageId: `test-${Date.now()}@coworkspace.test`,
                        accepted: [mailOptions.to]
                    };
                }
            };
        }

        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    /**
     * Renderizza template HTML con dati dinamici
     */
    static async renderTemplate(templateName, templateData) {
        try {
            const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
            try { await fs.access(templatePath); } 
            catch { return this.getDefaultTemplate(templateData); }

            let template = await fs.readFile(templatePath, 'utf-8');
            for (const [key, value] of Object.entries(templateData)) {
                template = template.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
            }
            return template;
        } catch (error) {
            console.error('Errore rendering template:', error);
            return this.getDefaultTemplate(templateData);
        }
    }

    /**
     * Template HTML di default quando i file non esistono
     */
    static getDefaultTemplate(templateData) {
        return `
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2c3e50;">CoWorkSpace</h1>
                    <h2>${templateData.subject || 'Notifica'}</h2>
                    <p>Ciao ${templateData.userName || 'Utente'},</p>
                    <p>${templateData.message || 'Hai ricevuto una notifica.'}</p>
                    <p>Grazie per aver scelto CoWorkSpace!</p>
                </body>
            </html>
        `;
    }

    /**
     * Invia notifica email
     * @param {Object} emailData - Dati email
     * @returns {Promise<Object>} - Risultato invio
     */
    static async sendEmail(emailData) {
        const { recipient, subject, templateName, templateData, user_id, booking_id, payment_id } = emailData;
        let notification = null;

        try {
            // Renderizza il template
            const htmlContent = await this.renderTemplate(templateName, templateData);

            // Configura l'email
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@coworkspace.com',
                to: recipient,
                subject: subject,
                html: htmlContent
            };

            // Crea record notifica
            notification = await Notification.create({
                user_id,
                type: 'email',
                channel: templateName,
                recipient,
                subject,
                content: htmlContent,
                template_name: templateName,
                template_data: templateData,
                status: 'pending',
                booking_id,
                payment_id
            });

            // Invia email
            const transporter = this.createTransporter();
            const info = await transporter.sendMail(mailOptions);

            // Aggiorna stato notifica
            await Notification.updateStatus(notification.notification_id, 'sent', {
                message_id: info.messageId,
                accepted: info.accepted
            });

            console.log('📧 Email inviata con successo:', info.messageId);
            
            return {
                success: true,
                messageId: info.messageId,
                notification_id: notification.notification_id,
                recipient,
                subject
            };

        } catch (error) {
            console.error('❌ Errore invio email:', error);

            // Aggiorna stato notifica come fallita
            if (notification?.notification_id) {
                await Notification.updateStatus(notification.notification_id, 'failed', {
                    error: error.message
                });
            }

            return {
                success: false,
                error: error.message,
                recipient,
                subject
            };
        }
    }

    /**
     * Invia notifica push tramite Firebase
     */
    static async sendPushNotification({fcmToken, title, body, data = {}, user_id, booking_id, payment_id}) {
        if (!fcmToken) {
            console.warn('[FCM] Token FCM mancante, notifica saltata');
            return {success: false, reason: 'missing_fcm_token'};
        }

        let notification = null;
        try {
            notification = await Notification.create({
                user_id,
                type:'push',
                channel: 'push',
                recipient: fcmToken,
                subject: title,
                content: JSON.stringify({title, body, data}),
                template_name: 'push',
                template_data: {title, body, ...data},
                status: 'pending',
                booking_id,
                payment_id
            });

            const message = {token: fcmToken, notification: {title, body }, data};
            const response = await admin.messaging().send(message);

            await Notification.updateStatus(notification.notification_id, 'sent', {fcmResponse: response});
            console.log('[FCM] Notifica inviata con successo:', response);

            return {
                success: true,
                messageId: `push_${Date.now()}`,
                notification_id: notification.notification_id
            };
        } catch (error) {
            console.error('[FCM] Errore invio notifica:', error);
            if(notification?.notification_id) {
                await Notification.updateStatus(notification.notification_id, 'failed', {error: error.message});
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Invia conferma prenotazione
     */
    static async sendBookingConfirmation(booking, user, space) {
        const templateData = {
            userName: `${user.name} ${user.surname}`,
            bookingId: booking.booking_id,
            spaceName: space.name || booking.space_name,
            locationName: space.location_name || booking.location_name,
            startDate: new Date(booking.start_date).toLocaleDateString('it-IT'),
            endDate: new Date(booking.end_date).toLocaleDateString('it-IT'),
            totalAmount: `€${booking.total_amount}`,
            subject: `Conferma Prenotazione #${booking.booking_id}`
        };

        return this.sendEmail({
            recipient: user.email,
            subject: templateData.subject,
            templateName: 'booking_confirmation',
            templateData,
            user_id: user.user_id,
            booking_id: booking.booking_id
        });

        if(user.fcm_token){
            await this.sendPushNotification({
                fcmToken: user.fcm_token,
                title: templateData.subject,
                body: `Prenotazione confermata dal ${templateData.startDate} al ${templateData.endDate}`,
                user_id: user.user_id,
                booking_id: booking.booking_id
            });
        }
    }

    /**
     * Invia cancellazione prenotazione
     */
    static async sendBookingCancellation(booking, user, space) {
        const templateData = {
            userName: `${user.name} ${user.surname}`,
            bookingId: booking.booking_id,
            spaceName: space.name || booking.space_name,
            locationName: space.location_name || booking.location_name,
            subject: `Cancellazione Prenotazione #${booking.booking_id}`
        };

        return this.sendEmail({
            recipient: user.email,
            subject: templateData.subject,
            templateName: 'booking_cancellation',
            templateData,
            user_id: user.user_id,
            booking_id: booking.booking_id
        });

        if(user.fcm_token){
            await this.sendPushNotification({
                fcmToken: user.fcm_token,
                title: templateData.subject,
                body: `Prenotazione cancellata dal ${templateData.startDate} al ${templateData.endDate}`,
                user_id: user.user_id,
                booking_id: booking.booking_id
            });
        }
    }

    /**
     * Invia conferma pagamento
     */
    static async sendPaymentSuccess(payment, booking, user, space) {
        const templateData = {
            userName: `${user.name} ${user.surname}`,
            paymentId: payment.payment_id,
            bookingId: booking.booking_id,
            amount: `€${payment.amount}`,
            paymentMethod: payment.payment_method,
            spaceName: space.name || booking.space_name,
            subject: `Pagamento Confermato #${payment.payment_id}`
        };

        return this.sendEmail({
            recipient: user.email,
            subject: templateData.subject,
            templateName: 'payment_success',
            templateData,
            user_id: user.user_id,
            booking_id: booking.booking_id,
            payment_id: payment.payment_id
        });

        if(user.fcm_token){
            await this.sendPushNotification({
                fcmToken: user.fcm_token,
                title: templateData.subject,
                body: `Pagamento confermato per la prenotazione #${booking.booking_id}`,
                user_id: user.user_id,
                booking_id: booking.booking_id
            });
        }
    }

    /**
     * Invia benvenuto registrazione
     */
    static async sendUserRegistration(user) {
        const templateData = {
            userName: `${user.name} ${user.surname}`,
            email: user.email,
            companyName: 'CoWorkSpace',
            subject: `Benvenuto in CoWorkSpace, ${user.name}!`
        };

        return this.sendEmail({
            recipient: user.email,
            subject: templateData.subject,
            templateName: 'user_registration',
            templateData,
            user_id: user.id || user.user_id
        });

        if(user.fcm_token){
            await this.sendPushNotification({
                fcmToken: user.fcm_token,
                title: templateData.subject,
                body: `Benvenuto in CoWorkSpace, ${user.name}!`,
                user_id: user.id || user.user_id
            });
        }
    }

    /**
     * Invia email reset password con password temporanea
     */
    static async sendPasswordReset(user, tempPassword) {
        const templateData = {
            userName: `${user.name} ${user.surname}`,
            email: user.email,
            tempPassword: tempPassword,
            companyName: 'CoWorkSpace',
            loginUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : '#',
            subject: `Reset Password - CoWorkSpace`
        };

        return this.sendEmail({
            recipient: user.email,
            subject: templateData.subject,
            templateName: 'password_reset',
            templateData,
            user_id: user.id || user.user_id
        });

        if(user.fcm_token){
            await this.sendPushNotification({
                fcmToken: user.fcm_token,
                title: templateData.subject,
                body: `Una password temporanea è stata inviata alla tua email.`,
                user_id: user.id || user.user_id
            });
        }
    }

    /**
     * Ottieni notifiche per un utente
     */
    static async getUserNotifications(user_id, filters = {}) {
        return await Notification.findByUserId(user_id, filters);
    }

    /**
     * Segna notifica come letta
     */
    static async markAsRead(notification_id, user_id) {
        return await Notification.markAsRead(notification_id, user_id);
    }
}

module.exports = NotificationService;
