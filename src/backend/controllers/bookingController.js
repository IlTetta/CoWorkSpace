// src/backend/controllers/bookingController.js
const BookingService = require('../services/BookingService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller per gestire le richieste HTTP relative alle prenotazioni
 */
class BookingController {
    /**
     * GET /api/bookings - Lista prenotazioni con filtri
     */
    static getBookings = catchAsync(async (req, res) => {
        const filters = {};
        
        // Filtri dalla query string
        if (req.query.status) filters.status = req.query.status;
        if (req.query.payment_status) filters.payment_status = req.query.payment_status;
        if (req.query.space_id) filters.space_id = parseInt(req.query.space_id);
        if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
        if (req.query.booking_date) filters.booking_date = req.query.booking_date;
        if (req.query.date_from) filters.date_from = req.query.date_from;
        if (req.query.date_to) filters.date_to = req.query.date_to;
        if (req.query.limit) filters.limit = parseInt(req.query.limit);

        const bookings = await BookingService.getBookings(req.user, filters);

        return ApiResponse.list(res, bookings, 'Prenotazioni recuperate con successo', filters);
    });

    /**
     * GET /api/bookings/:id - Dettagli prenotazione specifica
     */
    static getBookingById = catchAsync(async (req, res) => {
        const booking_id = parseInt(req.params.booking_id);
        
        if (isNaN(booking_id)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        const booking = await BookingService.getBookingDetails(req.user, booking_id);

        return ApiResponse.success(res, 200, 'Prenotazione recuperata con successo', { booking });

        res.status(200).json({
            success: true,
            message: 'Dettagli prenotazione recuperati con successo',
            data: {
                booking
            }
        });
    });

    /**
     * POST /api/bookings - Crea nuova prenotazione
     */
    static createBooking = catchAsync(async (req, res) => {
        const bookingData = {
            user_id: req.body.user_id || req.user.user_id, // Default a utente corrente
            space_id: req.body.space_id,
            booking_date: req.body.booking_date,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            total_hours: req.body.total_hours,
            total_price: req.body.total_price,
            status: req.body.status,
            payment_status: req.body.payment_status,
            notes: req.body.notes
        };

        const booking = await BookingService.createBooking(req.user, bookingData);

        // 📧 Invia email di conferma prenotazione automaticamente
        try {
            await NotificationService.sendBookingConfirmation(
                booking, 
                req.user, 
                { name: booking.space_name, location_name: booking.location_name }
            );
            console.log(`📧 Conferma prenotazione inviata a: ${req.user.email}`);
        } catch (emailError) {
            console.error('❌ Errore invio conferma prenotazione:', emailError.message);
            // Non bloccare la prenotazione se l'email fallisce
        }

        res.status(201).json({
            success: true,
            message: 'Prenotazione creata con successo',
            data: {
                booking
            }
        });
    });

    /**
     * PUT /api/bookings/:id - Aggiorna prenotazione
     */
    static updateBooking = catchAsync(async (req, res) => {
        const booking_id = parseInt(req.params.booking_id);
        
        if (isNaN(booking_id)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        // Campi aggiornabili
        const updateData = {};
        const allowedFields = [
            'booking_date', 'start_time', 'end_time', 'total_hours',
            'total_price', 'status', 'payment_status', 'notes'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            throw AppError.badRequest('Nessun campo da aggiornare fornito');
        }

        const booking = await BookingService.updateBooking(req.user, booking_id, updateData);

        res.status(200).json({
            success: true,
            message: 'Prenotazione aggiornata con successo',
            data: {
                booking
            }
        });
    });

    /**
     * DELETE /api/bookings/:id - Elimina prenotazione
     */
    static deleteBooking = catchAsync(async (req, res) => {
        const booking_id = parseInt(req.params.booking_id);
        
        if (isNaN(booking_id)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        const deleted = await BookingService.deleteBooking(req.user, booking_id);

        if (!deleted) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        res.status(200).json({
            success: true,
            message: 'Prenotazione eliminata con successo'
        });
    });

    /**
     * POST /api/bookings/check-availability - Verifica disponibilità spazio
     */
    static checkAvailability = catchAsync(async (req, res) => {
        const { space_id, booking_date, start_time, end_time } = req.body;

        if (!space_id || !booking_date || !start_time || !end_time) {
            throw AppError.badRequest('space_id, booking_date, start_time e end_time sono obbligatori');
        }

        const availability = await BookingService.checkAvailability(
            parseInt(space_id),
            booking_date,
            start_time,
            end_time
        );

        res.status(200).json({
            success: true,
            data: availability
        });
    });

    /**
     * POST /api/bookings/calculate-price - Calcola prezzo prenotazione
     */
    static calculatePrice = catchAsync(async (req, res) => {
        const { space_id, booking_date, start_time, end_time } = req.body;

        if (!space_id || !booking_date || !start_time || !end_time) {
            throw AppError.badRequest('space_id, booking_date, start_time e end_time sono obbligatori');
        }

        const pricing = await BookingService.calculateBookingPrice(
            parseInt(space_id),
            booking_date,
            start_time,
            end_time
        );

        res.status(200).json({
            success: true,
            data: {
                pricing
            }
        });
    });

    // ============================================================================
    // ENDPOINTS PROTETTI PER MANAGER/ADMIN
    // ============================================================================

    /**
     * GET /api/bookings/dashboard - Dashboard prenotazioni per manager/admin
     */
    static getBookingsDashboard = catchAsync(async (req, res) => {
        const filters = {};
        
        // Filtri per la dashboard
        if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
        if (req.query.date_from) filters.date_from = req.query.date_from;
        if (req.query.date_to) filters.date_to = req.query.date_to;

        const dashboard = await BookingService.getBookingsDashboard(req.user, filters);

        res.status(200).json({
            success: true,
            data: dashboard
        });
    });

    /**
     * PATCH /api/bookings/:id/status - Aggiorna solo lo status (manager/admin)
     */
    static updateBookingStatus = catchAsync(async (req, res) => {
        const bookingId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (isNaN(bookingId)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        if (!status) {
            throw AppError.badRequest('Status è obbligatorio');
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            throw AppError.badRequest(`Status non valido. Valori ammessi: ${validStatuses.join(', ')}`);
        }

        const booking = await BookingService.updateBooking(req.user, bookingId, { status });

        res.status(200).json({
            success: true,
            message: `Status prenotazione aggiornato a '${status}'`,
            data: {
                booking
            }
        });
    });

    /**
     * PATCH /api/bookings/:id/payment-status - Aggiorna stato pagamento (manager/admin)
     */
    static updatePaymentStatus = catchAsync(async (req, res) => {
        const bookingId = parseInt(req.params.id);
        const { payment_status } = req.body;
        
        if (isNaN(bookingId)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        if (!payment_status) {
            throw AppError.badRequest('Payment status è obbligatorio');
        }

        const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
        if (!validPaymentStatuses.includes(payment_status)) {
            throw AppError.badRequest(`Payment status non valido. Valori ammessi: ${validPaymentStatuses.join(', ')}`);
        }

        const booking = await BookingService.updateBooking(req.user, bookingId, { payment_status });

        res.status(200).json({
            success: true,
            message: `Stato pagamento aggiornato a '${payment_status}'`,
            data: {
                booking
            }
        });
    });

    // ============================================================================
    // ENDPOINT PUBBLICI (SENZA AUTENTICAZIONE)
    // ============================================================================

    /**
     * GET /api/public/bookings/space/:spaceId/availability - Verifica disponibilità pubblica
     */
    static getPublicAvailability = catchAsync(async (req, res) => {
        const spaceId = parseInt(req.params.spaceId);
        const { date } = req.query;

        if (isNaN(spaceId)) {
            throw AppError.badRequest('ID spazio non valido');
        }

        if (!date) {
            throw AppError.badRequest('Data è obbligatoria');
        }

        // Per ora restituiamo solo informazioni base
        // In futuro si potrebbe implementare un calendario di disponibilità
        const Space = require('../models/Space');
        const space = await Space.findById(spaceId);
        
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        res.status(200).json({
            success: true,
            data: {
                space: {
                    id: space.space_id,
                    name: space.name,
                    capacity: space.capacity,
                    price_per_hour: space.price_per_hour,
                    price_per_day: space.price_per_day,
                    status: space.status
                },
                date,
                message: 'Usa l\'endpoint /check-availability per verificare orari specifici'
            }
        });
    });
}

module.exports = BookingController;


