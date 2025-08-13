// src/backend/controllers/bookingController.js
const BookingService = require('../services/BookingService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller per gestire le richieste HTTP relative alle prenotazioni
 */

/**
 * GET /api/bookings - Lista prenotazioni con filtri
 */
exports.getBookings = catchAsync(async (req, res) => {
    const filters = {};
    
    // Filtri dalla query string
    if (req.query.status) filters.status = req.query.status;
    if (req.query.payment_status) filters.payment_status = req.query.payment_status;
    if (req.query.space_id) filters.space_id = parseInt(req.query.space_id);
    if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    // Filtri datetime
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;
    if (req.query.intersects_date) filters.intersects_date = req.query.intersects_date;
    
    // Filtri per periodo attivo
    if (req.query.active_between_start && req.query.active_between_end) {
        filters.active_between_start = req.query.active_between_start;
        filters.active_between_end = req.query.active_between_end;
    }

    // Compatibilità con formato vecchio
    if (req.query.booking_date) {
        filters.intersects_date = req.query.booking_date;
    }

    const bookings = await BookingService.getBookings(req.user, filters);

    return ApiResponse.list(res, bookings, 'Prenotazioni recuperate con successo', filters);
});

/**
 * GET /api/bookings/:id - Dettagli prenotazione specifica
 */
exports.getBookingById = catchAsync(async (req, res) => {
    const booking_id = parseInt(req.params.booking_id);
    
    if (isNaN(booking_id)) {
        throw AppError.badRequest('ID prenotazione non valido');
    }

    const booking = await BookingService.getBookingDetails(req.user, booking_id);

    return ApiResponse.success(res, 200, 'Prenotazione recuperata con successo', { booking });
});

/**
 * POST /api/bookings - Crea nuova prenotazione
 */
exports.createBooking = catchAsync(async (req, res) => {
        const bookingData = {
            user_id: req.body.user_id || req.user.user_id, // Default a utente corrente
            space_id: req.body.space_id,
            start_datetime: req.body.start_datetime,
            end_datetime: req.body.end_datetime,
            total_price: req.body.total_price,
            status: req.body.status,
            payment_status: req.body.payment_status,
            notes: req.body.notes
        };

        // Supporto per formato legacy (converte automaticamente)
        if (!bookingData.start_datetime && req.body.booking_date && req.body.start_time) {
            bookingData.start_datetime = `${req.body.booking_date}T${req.body.start_time}`;
        }
        
        if (!bookingData.end_datetime && req.body.booking_date && req.body.end_time) {
            bookingData.end_datetime = `${req.body.booking_date}T${req.body.end_time}`;
        }

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

        return ApiResponse.created(res, 'Prenotazione creata con successo', { booking });
});

/**
 * PUT /api/bookings/:id - Aggiorna prenotazione
 */
exports.updateBooking = catchAsync(async (req, res) => {
    const booking_id = parseInt(req.params.booking_id);
    
    if (isNaN(booking_id)) {
        throw AppError.badRequest('ID prenotazione non valido');
    }

    // Campi aggiornabili
    const updateData = {};
    const allowedFields = [
        'start_datetime', 'end_datetime', 'total_price', 
        'status', 'payment_status', 'notes'
    ];

    // Supporto per formato legacy
    const legacyFields = {
        'booking_date': (value, data) => {
            if (req.body.start_time) data.start_datetime = `${value}T${req.body.start_time}`;
            if (req.body.end_time) data.end_datetime = `${value}T${req.body.end_time}`;
        },
        'start_time': (value, data) => {
            if (req.body.booking_date) data.start_datetime = `${req.body.booking_date}T${value}`;
        },
        'end_time': (value, data) => {
            if (req.body.booking_date) data.end_datetime = `${req.body.booking_date}T${value}`;
        }
    };

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
        }
    });

    // Gestione campi legacy
    Object.keys(legacyFields).forEach(field => {
        if (req.body[field] !== undefined) {
            legacyFields[field](req.body[field], updateData);
        }
    });

    if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest('Nessun campo da aggiornare fornito');
    }

    const booking = await BookingService.updateBooking(req.user, booking_id, updateData);

    return ApiResponse.updated(res, { booking }, 'Prenotazione aggiornata con successo');
});

/**
 * DELETE /api/bookings/:id - Elimina prenotazione
 */
exports.deleteBooking = catchAsync(async (req, res) => {
        const booking_id = parseInt(req.params.booking_id);
        
        if (isNaN(booking_id)) {
            throw AppError.badRequest('ID prenotazione non valido');
        }

        const deleted = await BookingService.deleteBooking(req.user, booking_id);

        if (!deleted) {
            throw AppError.notFound('Prenotazione non trovata');
        }

    return ApiResponse.deleted(res, 'Prenotazione eliminata con successo');
});

/**
 * POST /api/bookings/check-availability - Verifica disponibilità spazio
 */
exports.checkAvailability = catchAsync(async (req, res) => {
    let { space_id, start_datetime, end_datetime } = req.body;

    // Supporto per formato legacy
    if (!start_datetime && req.body.booking_date && req.body.start_time) {
        start_datetime = `${req.body.booking_date}T${req.body.start_time}`;
    }
    
    if (!end_datetime && req.body.booking_date && req.body.end_time) {
        end_datetime = `${req.body.booking_date}T${req.body.end_time}`;
    }

    if (!space_id || !start_datetime || !end_datetime) {
        throw AppError.badRequest('space_id, start_datetime e end_datetime sono obbligatori');
    }

    const Space = require('../models/Space');
    const availability = await Space.checkAvailabilityWithSchedule(
        parseInt(space_id),
        start_datetime,
        end_datetime
    );

    return ApiResponse.success(res, 200, 'Disponibilità verificata con successo', availability);
});

/**
 * POST /api/bookings/calculate-price - Calcola prezzo prenotazione
 */
exports.calculatePrice = catchAsync(async (req, res) => {
        let { space_id, start_datetime, end_datetime } = req.body;

        // Supporto per formato legacy
        if (!start_datetime && req.body.booking_date && req.body.start_time) {
            start_datetime = `${req.body.booking_date}T${req.body.start_time}`;
        }
        
        if (!end_datetime && req.body.booking_date && req.body.end_time) {
            end_datetime = `${req.body.booking_date}T${req.body.end_time}`;
        }

        if (!space_id || !start_datetime || !end_datetime) {
            throw AppError.badRequest('space_id, start_datetime e end_datetime sono obbligatori');
        }

        const pricing = await BookingService.calculateBookingPrice(
            parseInt(space_id),
            start_datetime,
            end_datetime
        );

    return ApiResponse.success(res, 200, 'Prezzo calcolato con successo', { pricing });
});

// ============================================================================
// ENDPOINTS PROTETTI PER MANAGER/ADMIN
// ============================================================================

/**
 * GET /api/bookings/dashboard - Dashboard prenotazioni per manager/admin
 */
exports.getBookingsDashboard = catchAsync(async (req, res) => {
    const filters = {};
    
    // Filtri per la dashboard
    if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;

    const dashboard = await BookingService.getBookingsDashboard(req.user, filters);

    return ApiResponse.success(res, 200, 'Dashboard prenotazioni recuperata con successo', dashboard);
});

/**
 * PATCH /api/bookings/:id/status - Aggiorna solo lo status (manager/admin)
 */
exports.updateBookingStatus = catchAsync(async (req, res) => {
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

    return ApiResponse.updated(res, { booking }, `Status prenotazione aggiornato a '${status}'`);
});

/**
 * PATCH /api/bookings/:id/payment-status - Aggiorna stato pagamento (manager/admin)
 */
exports.updatePaymentStatus = catchAsync(async (req, res) => {
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

    return ApiResponse.updated(res, { booking }, `Stato pagamento aggiornato a '${payment_status}'`);
});

// ============================================================================
// ENDPOINT PUBBLICI (SENZA AUTENTICAZIONE)
// ============================================================================

/**
 * GET /api/public/bookings/space/:spaceId/availability - Verifica disponibilità pubblica
 */
exports.getPublicAvailability = catchAsync(async (req, res) => {
    const spaceId = parseInt(req.params.spaceId);
    const { date } = req.query;

    if (isNaN(spaceId)) {
        throw AppError.badRequest('ID spazio non valido');
    }

    if (!date) {
        throw AppError.badRequest('Data è obbligatoria');
    }

    // Ottieni informazioni sullo spazio
    const Space = require('../models/Space');
    const space = await Space.findById(spaceId);
    
    if (!space) {
        throw AppError.notFound('Spazio non trovato');
    }

    // Ottieni slot disponibili per la data specificata
    const slots = await Space.getAvailableSlots(spaceId, date);

    return ApiResponse.success(res, 200, 'Informazioni disponibilità recuperate con successo', {
        space: {
            id: space.space_id,
            name: space.space_name,
            capacity: space.capacity,
            price_per_hour: space.price_per_hour,
            price_per_day: space.price_per_day,
            status: space.status,
            operating_hours: {
                opening_time: space.opening_time,
                closing_time: space.closing_time,
                available_days: space.available_days
            }
        },
        availability: slots
    });
});

/**
 * GET /api/bookings/space/:spaceId/schedule - Programma prenotazioni per uno spazio
 */
exports.getSpaceSchedule = catchAsync(async (req, res) => {
    const spaceId = parseInt(req.params.spaceId);
    const { date_from, date_to } = req.query;

    if (isNaN(spaceId)) {
        throw AppError.badRequest('ID spazio non valido');
    }

    // Default a 7 giorni a partire da oggi se non specificato
    const startDate = date_from || new Date().toISOString().split('T')[0];
    const endDate = date_to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const filters = {
        space_id: spaceId,
        start_date: startDate,
        end_date: endDate,
        status: ['confirmed', 'pending'] // Escludi prenotazioni cancellate
    };

    const bookings = await BookingService.getBookings(req.user, filters);

    return ApiResponse.success(res, 200, 'Programma spazio recuperato con successo', {
        space_id: spaceId,
        period: { from: startDate, to: endDate },
        bookings: bookings.map(booking => ({
            booking_id: booking.booking_id,
            start_datetime: booking.start_datetime,
            end_datetime: booking.end_datetime,
            status: booking.status,
            user_name: booking.user_name,
            total_hours: booking.total_hours,
            notes: booking.notes
        }))
    });
});

/**
 * POST /api/bookings/find-overlapping - Trova prenotazioni che si sovrappongono
 */
exports.findOverlappingBookings = catchAsync(async (req, res) => {
    const { space_id, start_datetime, end_datetime } = req.body;

    if (!space_id || !start_datetime || !end_datetime) {
        throw AppError.badRequest('space_id, start_datetime e end_datetime sono obbligatori');
    }

    const Booking = require('../models/Booking');
    const overlapping = await Booking.findOverlappingBookings(
        parseInt(space_id),
        start_datetime,
        end_datetime
    );

    return ApiResponse.success(res, 200, 'Prenotazioni sovrapposte trovate', {
        space_id: parseInt(space_id),
        requested_period: { start_datetime, end_datetime },
        overlapping_bookings: overlapping,
        conflicts_found: overlapping.length > 0
    });
});

/**
 * GET /api/bookings/space/:spaceId/slots - Ottieni slot disponibili per una data
 */
exports.getAvailableSlots = catchAsync(async (req, res) => {
    const spaceId = parseInt(req.params.spaceId);
    const { date } = req.query;

    if (isNaN(spaceId)) {
        throw AppError.badRequest('ID spazio non valido');
    }

    if (!date) {
        throw AppError.badRequest('Data è obbligatoria (formato: YYYY-MM-DD)');
    }

    // Validazione formato data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        throw AppError.badRequest('Formato data non valido (deve essere YYYY-MM-DD)');
    }

    const Space = require('../models/Space');
    const slots = await Space.getAvailableSlots(spaceId, date);

    return ApiResponse.success(res, 200, 'Slot disponibili recuperati con successo', slots);
});


