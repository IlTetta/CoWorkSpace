// src/backend/controllers/notificationController.js
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller per gestire le richieste HTTP relative alle notifiche
 */

/**
 * POST /api/notifications/send-email - Invia notifica email
 */
exports.sendEmail = catchAsync(async (req, res) => {
        const { recipient, subject, templateName, templateData } = req.body;

        if (!recipient || !subject || !templateName) {
            throw AppError.badRequest('recipient, subject e templateName sono obbligatori');
        }

        const result = await NotificationService.sendEmail({
            recipient,
            subject,
            templateName,
            templateData: templateData || {},
            user_id: req.user.user_id
        });

        return ApiResponse.success(res, 200, 
            result.success ? 'Email inviata con successo' : 'Errore invio email', 
            { result }
        );
});

/**
 * POST /api/notifications/send-push - Invia notifica push
 */
exports.sendPush = catchAsync(async (req, res) => {
        const { fcmToken, title, templateName, templateData } = req.body;

        if (!fcmToken || !title || !templateName) {
            throw AppError.badRequest('fcmToken, title e templateName sono obbligatori');
        }

        const result = await NotificationService.sendPushNotification({
            fcmToken,
            title,
            templateName,
            templateData: templateData || {},
            user_id: req.user.user_id
        });

        return ApiResponse.success(res, 200, 
            result.success ? 'Push notification inviata con successo' : 'Errore invio push', 
            { result }
        );
});

/**
 * POST /api/notifications/booking-confirmation - Invia conferma prenotazione
 */
exports.sendBookingConfirmation = catchAsync(async (req, res) => {
        const { booking, user, space } = req.body;

        if (!booking || !user || !space) {
            throw AppError.badRequest('booking, user e space sono obbligatori');
        }

        const result = await NotificationService.sendBookingConfirmation(booking, user, space);

        return ApiResponse.success(res, 200, 
            result.success ? 'Conferma prenotazione inviata' : 'Errore invio conferma', 
            { result }
        );
});

/**
 * POST /api/notifications/booking-cancellation - Invia cancellazione prenotazione
 */
exports.sendBookingCancellation = catchAsync(async (req, res) => {
        const { booking, user, space } = req.body;

        if (!booking || !user || !space) {
            throw AppError.badRequest('booking, user e space sono obbligatori');
        }

        const result = await NotificationService.sendBookingCancellation(booking, user, space);

        return ApiResponse.success(res, 200, 
            result.success ? 'Cancellazione prenotazione inviata' : 'Errore invio cancellazione', 
            { result }
        );
});

/**
 * POST /api/notifications/payment-success - Invia conferma pagamento
 */
exports.sendPaymentSuccess = catchAsync(async (req, res) => {
        const { payment, booking, user, space } = req.body;

        if (!payment || !booking || !user || !space) {
            throw AppError.badRequest('payment, booking, user e space sono obbligatori');
        }

        const result = await NotificationService.sendPaymentSuccess(payment, booking, user, space);

        return ApiResponse.success(res, 200, 
            result.success ? 'Conferma pagamento inviata' : 'Errore invio conferma pagamento', 
            { result }
        );
});

/**
 * POST /api/notifications/user-registration - Invia benvenuto registrazione
 */
exports.sendUserRegistration = catchAsync(async (req, res) => {
        const { user } = req.body;

        if (!user) {
            throw AppError.badRequest('user è obbligatorio');
        }

        const result = await NotificationService.sendUserRegistration(user);

        return ApiResponse.success(res, 200, 
            result.success ? 'Email di benvenuto inviata' : 'Errore invio benvenuto', 
            { result }
        );
});

/**
 * GET /api/notifications - Lista notifiche utente
 */
exports.getUserNotifications = catchAsync(async (req, res) => {
        const filters = {};
        
        // Filtri dalla query string
        if (req.query.type) filters.type = req.query.type;
        if (req.query.channel) filters.channel = req.query.channel;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.limit) filters.limit = parseInt(req.query.limit);

        const notifications = await NotificationService.getUserNotifications(req.user.user_id, filters);

        return ApiResponse.list(res, notifications, 'Notifiche utente recuperate con successo', filters);
});

/**
 * POST /api/notifications/test - Test notifica (solo sviluppo)
 */
exports.testNotification = catchAsync(async (req, res) => {
        // Solo in modalità sviluppo
        if (process.env.NODE_ENV === 'production') {
            throw AppError.forbidden('Endpoint di test non disponibile in produzione');
        }

        const { type = 'email', recipient } = req.body;
        
        const templateData = {
            userName: `${req.user.name} ${req.user.surname}`,
            subject: 'Test Notifica CoWorkSpace',
            message: 'Questa è una notifica di test del sistema.',
            testData: new Date().toISOString()
        };

        let result;
        if (type === 'email') {
            result = await NotificationService.sendEmail({
                recipient: recipient || req.user.email,
                subject: 'Test Notifica CoWorkSpace',
                templateName: 'userRegistration',
                templateData,
                user_id: req.user.user_id
            });
        } else if (type === 'push') {
            result = await NotificationService.sendPushNotification({
                fcmToken: recipient || 'test_token',
                title: 'Test Notifica',
                templateName: 'userRegistration',
                templateData,
                user_id: req.user.user_id
            });
        }

        return ApiResponse.success(res, 200, 'Test notifica completato', { result });
});
