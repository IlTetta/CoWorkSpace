// src/backend/routes/notificationRoutes.js
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestione delle notifiche (email, push, SMS)
 */

const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Routes pubbliche (nessuna autenticazione richiesta)
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Ottieni notifiche dell'utente corrente
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, push, sms]
 *         description: Filtra per tipo di notifica
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [booking_confirmation, booking_cancellation, payment_success, payment_failed, payment_refund, booking_reminder, user_registration]
 *         description: Filtra per canale/categoria
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed, delivered, read]
 *         description: Filtra per stato
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Numero massimo di notifiche da restituire
 *         example: 20
 *     responses:
 *       200:
 *         description: Lista delle notifiche dell'utente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *                         totalCount:
 *                           type: integer
 *                         unreadCount:
 *                           type: integer
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * Routes protette (autenticazione richiesta)
 */
router.use(protect); // Tutte le routes seguenti richiedono autenticazione

/**
 * @swagger
 * /notifications/send-email:
 *   post:
 *     summary: Invia email personalizzata
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - subject
 *               - content
 *             properties:
 *               recipient:
 *                 type: string
 *                 format: email
 *                 description: Email del destinatario
 *                 example: 'mario.rossi@email.com'
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *                 description: Oggetto dell'email
 *                 example: 'Conferma prenotazione'
 *               content:
 *                 type: string
 *                 description: Contenuto dell'email
 *                 example: 'La tua prenotazione è stata confermata'
 *               template_name:
 *                 type: string
 *                 description: Nome del template da utilizzare (opzionale)
 *                 example: 'booking_confirmation.html'
 *               template_data:
 *                 type: object
 *                 description: Dati per sostituzioni nel template
 *                 example: { "userName": "Mario", "spaceName": "Stanza 101" }
 *     responses:
 *       200:
 *         description: Email inviata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notification:
 *                           $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /notifications/send-push:
 *   post:
 *     summary: Invia notifica push
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - title
 *               - body
 *             properties:
 *               recipient:
 *                 type: string
 *                 description: Token FCM del destinatario
 *                 example: 'fcm_token_example'
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: Titolo della notifica push
 *                 example: 'Prenotazione confermata'
 *               body:
 *                 type: string
 *                 maxLength: 500
 *                 description: Corpo della notifica push
 *                 example: 'La tua prenotazione per la Stanza 101 è stata confermata'
 *               data:
 *                 type: object
 *                 description: Dati aggiuntivi per la notifica
 *                 example: { "bookingId": 123, "spaceId": 1 }
 *     responses:
 *       200:
 *         description: Notifica push inviata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notification:
 *                           $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-email', NotificationController.sendEmail);

/**
 * @swagger
 * /notifications/booking-confirmation:
 *   post:
 *     summary: Invia notifica di conferma prenotazione
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *             properties:
 *               booking_id:
 *                 type: integer
 *                 description: ID della prenotazione confermata
 *                 example: 123
 *               notification_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push, sms]
 *                 description: Tipi di notifica da inviare
 *                 example: ['email', 'push']
 *               custom_message:
 *                 type: string
 *                 description: Messaggio personalizzato (opzionale)
 *                 example: 'Benvenuto nel nostro coworking!'
 *     responses:
 *       200:
 *         description: Notifiche di conferma inviate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Prenotazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-push', NotificationController.sendPush);

/**
 * @swagger
 * /notifications/booking-cancellation:
 *   post:
 *     summary: Invia notifica di cancellazione prenotazione
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *             properties:
 *               booking_id:
 *                 type: integer
 *                 description: ID della prenotazione cancellata
 *                 example: 123
 *               cancellation_reason:
 *                 type: string
 *                 description: Motivo della cancellazione
 *                 example: 'Imprevisto lavorativo'
 *               notification_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push, sms]
 *                 description: Tipi di notifica da inviare
 *                 example: ['email']
 *     responses:
 *       200:
 *         description: Notifiche di cancellazione inviate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/booking-confirmation', NotificationController.sendBookingConfirmation);

/**
 * @swagger
 * /notifications/payment-success:
 *   post:
 *     summary: Invia notifica di pagamento completato
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_id
 *             properties:
 *               payment_id:
 *                 type: integer
 *                 description: ID del pagamento completato
 *                 example: 456
 *               notification_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push, sms]
 *                 description: Tipi di notifica da inviare
 *                 example: ['email', 'push']
 *     responses:
 *       200:
 *         description: Notifiche di conferma pagamento inviate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *                         payment:
 *                           $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pagamento non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/booking-cancellation', NotificationController.sendBookingCancellation);

/**
 * @swagger
 * /notifications/user-registration:
 *   post:
 *     summary: Invia notifica di benvenuto per nuova registrazione (Manager/Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: ID dell'utente registrato
 *                 example: 789
 *               custom_welcome_message:
 *                 type: string
 *                 description: Messaggio di benvenuto personalizzato
 *                 example: 'Benvenuto nella community CoWorkSpace!'
 *               notification_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, push]
 *                 description: Tipi di notifica da inviare
 *                 example: ['email']
 *     responses:
 *       200:
 *         description: Notifiche di benvenuto inviate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (richiede ruolo Manager o Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/payment-success', NotificationController.sendPaymentSuccess);

router.post('/user-registration', 
    authorize(['manager', 'admin']), 
    NotificationController.sendUserRegistration
);

router.get('/', NotificationController.getUserNotifications);

/**
 * Routes amministrative (solo manager/admin)
 */

/**
 * @swagger
 * /notifications/test:
 *   post:
 *     summary: Testa l'invio di notifiche (Solo Manager/Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - recipient
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, push, sms]
 *                 description: Tipo di notifica da testare
 *                 example: 'email'
 *               recipient:
 *                 type: string
 *                 description: Destinatario della notifica di test
 *                 example: 'test@example.com'
 *               subject:
 *                 type: string
 *                 description: Oggetto della notifica (per email)
 *                 example: 'Test notifica email'
 *               content:
 *                 type: string
 *                 description: Contenuto della notifica
 *                 example: 'Questo è un test del sistema di notifiche'
 *               template_name:
 *                 type: string
 *                 description: Nome del template da testare
 *                 example: 'booking_confirmation.html'
 *               template_data:
 *                 type: object
 *                 description: Dati per il template
 *                 example: { "userName": "Test User", "spaceName": "Test Space" }
 *     responses:
 *       200:
 *         description: Notifica di test inviata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notification:
 *                           $ref: '#/components/schemas/Notification'
 *                         testInfo:
 *                           type: object
 *                           properties:
 *                             sentAt:
 *                               type: string
 *                               format: date-time
 *                             environment:
 *                               type: string
 *                               example: 'development'
 *                             provider:
 *                               type: string
 *                               example: 'sendgrid'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (richiede ruolo Manager o Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/test', 
    authorize(['manager', 'admin']), 
    NotificationController.testNotification
);

module.exports = router;
