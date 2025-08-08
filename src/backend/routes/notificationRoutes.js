// src/backend/routes/notificationRoutes.js
const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Routes pubbliche (nessuna autenticazione richiesta)
 */

/**
 * Routes protette (autenticazione richiesta)
 */
router.use(protect); // Tutte le routes seguenti richiedono autenticazione

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
