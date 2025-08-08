// src/backend/controllers/paymentController.js
const PaymentService = require('../services/PaymentService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Controller per gestire le richieste HTTP relative ai pagamenti
 */
class PaymentController {
    /**
     * POST /api/payments - Crea nuovo pagamento
     */
    static createPayment = catchAsync(async (req, res) => {
        const paymentData = {
            booking_id: req.body.booking_id,
            amount: req.body.amount,
            payment_method: req.body.payment_method,
            transaction_id: req.body.transaction_id
        };

        const payment = await PaymentService.createPayment(req.user, paymentData);

        // 📧 Invia email di conferma pagamento automaticamente
        try {
            // Ottieni i dati della prenotazione e dello spazio per l'email
            const bookingData = payment.booking || {};
            const spaceData = { 
                name: bookingData.space_name || 'Spazio', 
                location_name: bookingData.location_name || 'Location' 
            };
            
            await NotificationService.sendPaymentSuccess(
                payment, 
                bookingData, 
                req.user, 
                spaceData
            );
            console.log(`📧 Conferma pagamento inviata a: ${req.user.email}`);
        } catch (emailError) {
            console.error('❌ Errore invio conferma pagamento:', emailError.message);
            // Non bloccare il pagamento se l'email fallisce
        }

        res.status(201).json({
            success: true,
            message: 'Pagamento registrato e prenotazione confermata',
            data: {
                payment: payment.toJSON()
            }
        });
    });

    /**
     * GET /api/payments - Lista pagamenti con filtri
     */
    static getPayments = catchAsync(async (req, res) => {
        const filters = {};
        
        // Filtri dalla query string
        if (req.query.status) filters.status = req.query.status;
        if (req.query.payment_method) filters.payment_method = req.query.payment_method;
        if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
        if (req.query.date_from) filters.date_from = req.query.date_from;
        if (req.query.date_to) filters.date_to = req.query.date_to;
        if (req.query.limit) filters.limit = parseInt(req.query.limit);

        const payments = await PaymentService.getPayments(req.user, filters);

        res.status(200).json({
            success: true,
            message: 'Pagamenti recuperati con successo',
            data: {
                payments: payments.map(payment => payment.toJSON()),
                count: payments.length,
                filters
            }
        });
    });

    /**
     * GET /api/payments/:id - Dettagli pagamento specifico
     */
    static getPaymentById = catchAsync(async (req, res) => {
        const paymentId = parseInt(req.params.id);
        
        if (isNaN(paymentId)) {
            throw AppError.badRequest('ID pagamento non valido');
        }

        const payment = await PaymentService.getPaymentDetails(req.user, paymentId);

        res.status(200).json({
            success: true,
            message: 'Dettagli pagamento recuperati con successo',
            data: {
                payment: payment.toJSON()
            }
        });
    });

    /**
     * PATCH /api/payments/:id/status - Aggiorna stato pagamento
     */
    static updatePaymentStatus = catchAsync(async (req, res) => {
        const paymentId = parseInt(req.params.id);
        const { status, transaction_id } = req.body;
        
        if (isNaN(paymentId)) {
            throw AppError.badRequest('ID pagamento non valido');
        }

        if (!status) {
            throw AppError.badRequest('Status è obbligatorio');
        }

        const updateData = { status };
        if (transaction_id !== undefined) {
            updateData.transaction_id = transaction_id;
        }

        const payment = await PaymentService.updatePaymentStatus(req.user, paymentId, updateData);

        res.status(200).json({
            status: 'success',
            message: `Stato pagamento aggiornato a '${status}'`,
            data: {
                payment: payment.toJSON()
            }
        });
    });

    /**
     * DELETE /api/payments/:id - Elimina pagamento (solo admin)
     */
    static deletePayment = catchAsync(async (req, res) => {
        const paymentId = parseInt(req.params.id);
        
        if (isNaN(paymentId)) {
            throw AppError.badRequest('ID pagamento non valido');
        }

        const deleted = await PaymentService.deletePayment(req.user, paymentId);

        if (!deleted) {
            throw AppError.notFound('Pagamento non trovato');
        }

        res.status(200).json({
            status: 'success',
            message: 'Pagamento eliminato con successo'
        });
    });

    /**
     * GET /api/payments/statistics - Statistiche pagamenti (manager/admin)
     */
    static getPaymentStatistics = catchAsync(async (req, res) => {
        const filters = {};
        
        // Filtri per le statistiche
        if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
        if (req.query.date_from) filters.date_from = req.query.date_from;
        if (req.query.date_to) filters.date_to = req.query.date_to;

        const statistics = await PaymentService.getPaymentStatistics(req.user, filters);

        res.status(200).json({
            status: 'success',
            data: {
                statistics,
                filters
            }
        });
    });

    /**
     * GET /api/payments/check-booking/:bookingId - Verifica se una prenotazione può essere pagata
     */
    static checkBookingPayment = catchAsync(async (req, res) => {
        const bookingId = parseInt(req.params.bookingId);
        
        if (isNaN(bookingId)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        const result = await PaymentService.canPayBooking(bookingId);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });
}

module.exports = PaymentController;