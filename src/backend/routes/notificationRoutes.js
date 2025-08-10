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
 * POST /api/notifications/send-email - Invia email personalizzata
 * Permesso: user, manager, admin
 */
router.post('/send-email', NotificationController.sendEmail);

/**
 * POST /api/notifications/send-push - Invia push notification
 * Permesso: user, manager, admin
 */
router.post('/send-push', NotificationController.sendPush);

/**
 * POST /api/notifications/booking-confirmation - Invia conferma prenotazione
 * Permesso: user, manager, admin
 */
router.post('/booking-confirmation', NotificationController.sendBookingConfirmation);

/**
 * POST /api/notifications/booking-cancellation - Invia cancellazione prenotazione
 * Permesso: user, manager, admin
 */
router.post('/booking-cancellation', NotificationController.sendBookingCancellation);

/**
 * POST /api/notifications/payment-success - Invia conferma pagamento
 * Permesso: user, manager, admin
 */
router.post('/payment-success', NotificationController.sendPaymentSuccess);

/**
 * POST /api/notifications/user-registration - Invia benvenuto registrazione
 * Permesso: manager, admin
 */
router.post('/user-registration', 
    authorize(['manager', 'admin']), 
    NotificationController.sendUserRegistration
);

/**
 * GET /api/notifications - Lista notifiche dell'utente
 * Query params: type, channel, status, limit
 * Permesso: user, manager, admin
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * Routes amministrative (solo manager/admin)
 */

/**
 * POST /api/notifications/test - Test notifica (solo sviluppo)
 * Permesso: manager, admin
 */
router.post('/test', 
    authorize(['manager', 'admin']), 
    NotificationController.testNotification
);

module.exports = router;
