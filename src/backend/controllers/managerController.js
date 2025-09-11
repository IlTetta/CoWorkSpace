// src/backend/controllers/managerController.js
/**
 * Controller Manager - Implementa ROLE_REDESIGN.md
 * Responsabilità: Responsabile operativo di una o più sedi
 * - Gestione Spazi: CRUD completo su spazi delle proprie location
 * - Gestione Orari: Disponibilità, orari apertura
 * - Gestione Prenotazioni: TUTTE le prenotazioni delle proprie sedi
 * - Assistenza Clienti: Prenotare per conto di clienti
 * - Gestione Pagamenti: TUTTI i pagamenti delle proprie sedi
 * - Reports: Dashboard completa delle proprie location
 */
const LocationService = require('../services/LocationService');
const SpaceService = require('../services/SpaceService');
const BookingService = require('../services/BookingService');
const PaymentService = require('../services/PaymentService');
const AvailabilityService = require('../services/AvailabilityService');
const AuthService = require('../services/AuthService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Dashboard operativa completa del manager
 */
exports.getDashboard = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        throw AppError.forbidden('Accesso riservato ai manager');
    }

    const dashboard = await AuthService.getManagerDashboard(req.user.user_id);
    return ApiResponse.success(res, 200, 'Dashboard manager recuperata', dashboard);
});

// ============================================================================
// GESTIONE LOCATION - Location gestite dal manager
// ============================================================================

/**
 * Ottieni tutte le location gestite dal manager
 */
exports.getMyLocations = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        throw AppError.forbidden('Accesso riservato ai manager');
    }

    const locations = await LocationService.getLocationsByManager(req.user.user_id);
    return ApiResponse.list(res, locations, 'Location gestite recuperate con successo');
});

/**
 * Crea una nuova location per il manager
 */
exports.createLocation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        throw AppError.forbidden('Accesso riservato ai manager');
    }
    
    console.log('[MANAGER] Creazione nuova location per manager:', req.user.user_id);
    
    // Assegna automaticamente il manager corrente alla location
    const locationData = {
        ...req.body,
        manager_id: req.user.user_id
    };
    
    const location = await LocationService.createLocation(locationData, req.user);
    return ApiResponse.created(res, location, 'Location creata con successo');
});

/**
 * Aggiorna una location gestita dal manager
 */
exports.updateLocation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        throw AppError.forbidden('Accesso riservato ai manager');
    }
    
    console.log('[MANAGER] Aggiornamento location:', req.params.locationId, 'per manager:', req.user.user_id);
    
    const location = await LocationService.updateLocation(req.params.locationId, req.body, req.user);
    return ApiResponse.success(res, location, 'Location aggiornata con successo');
});

/**
 * Elimina una location gestita dal manager (solo admin può eliminare)
 */
exports.deleteLocation = catchAsync(async (req, res, next) => {
    console.log('[MANAGER] Tentativo eliminazione location:', req.params.locationId, 'per manager:', req.user.user_id);
    
    await LocationService.deleteLocation(req.params.locationId, req.user);
    return ApiResponse.success(res, null, 'Location eliminata con successo');
});

// ============================================================================
// GESTIONE SPAZI - CRUD completo su spazi delle proprie location
// ============================================================================

exports.getMySpaces = catchAsync(async (req, res, next) => {
    const spaces = await SpaceService.getSpaces(req.query, req.user);
    return ApiResponse.list(res, spaces, 'Spazi recuperati');
});

exports.createSpace = catchAsync(async (req, res, next) => {
    const space = await SpaceService.createSpace(req.body, req.user);
    return ApiResponse.created(res, 'Spazio creato con successo', space);
});

exports.updateSpace = catchAsync(async (req, res, next) => {
    const spaceId = parseInt(req.params.spaceId);
    const space = await SpaceService.updateSpace(spaceId, req.body, req.user);
    return ApiResponse.updated(res, space, 'Spazio aggiornato');
});

exports.deleteSpace = catchAsync(async (req, res, next) => {
    const spaceId = parseInt(req.params.spaceId);
    await SpaceService.deleteSpace(spaceId, req.user);
    return ApiResponse.deleted(res, 'Spazio eliminato con successo');
});

// ============================================================================
// GESTIONE ORARI - Disponibilità, orari apertura
// ============================================================================

exports.updateSpaceAvailability = catchAsync(async (req, res, next) => {
    const spaceId = parseInt(req.params.spaceId);
    
    const availabilityData = {
        space_id: spaceId,
        availability_date: req.body.availability_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        is_available: req.body.is_available
    };

    const availability = await AvailabilityService.createAvailability(availabilityData);
    return ApiResponse.created(res, 'Disponibilità aggiornata', availability);
});

exports.setSpaceHours = catchAsync(async (req, res, next) => {
    const spaceId = parseInt(req.params.spaceId);
    
    const hoursData = {
        opening_time: req.body.opening_time,
        closing_time: req.body.closing_time,
        available_days: req.body.available_days
    };

    const space = await SpaceService.updateSpace(spaceId, hoursData, req.user);
    return ApiResponse.updated(res, space, 'Orari spazio aggiornati');
});

// ============================================================================
// GESTIONE PRENOTAZIONI - TUTTE le prenotazioni delle proprie sedi
// ============================================================================

exports.getAllMyBookings = catchAsync(async (req, res, next) => {
    // BookingService già filtra per manager, restituendo TUTTE le prenotazioni delle sue location
    const bookings = await BookingService.getBookings(req.user, req.query);
    return ApiResponse.list(res, bookings, 'Prenotazioni recuperate');
});

exports.updateBooking = catchAsync(async (req, res, next) => {
    const bookingId = parseInt(req.params.bookingId);
    const booking = await BookingService.updateBooking(req.user, bookingId, req.body);
    return ApiResponse.updated(res, booking, 'Prenotazione aggiornata');
});

// ============================================================================  
// ASSISTENZA CLIENTI - Prenotare per conto di clienti
// ============================================================================

exports.createBookingForClient = catchAsync(async (req, res, next) => {
    const bookingData = {
        ...req.body,
        notes: req.body.notes || `Prenotazione creata da manager ${req.user.name} ${req.user.surname}`,
        created_by_manager: req.user.user_id
    };

    const booking = await BookingService.createBooking(req.user, bookingData);
    return ApiResponse.created(res, 'Prenotazione creata per il cliente', booking);
});

// ============================================================================
// GESTIONE PAGAMENTI - TUTTI i pagamenti delle proprie sedi  
// ============================================================================

exports.getAllMyPayments = catchAsync(async (req, res, next) => {
    // PaymentService già filtra per manager, restituendo TUTTI i pagamenti delle sue location
    const payments = await PaymentService.getPayments(req.user, req.query);
    return ApiResponse.list(res, payments, 'Pagamenti recuperati');
});

exports.processClientPayment = catchAsync(async (req, res, next) => {
    const paymentData = {
        ...req.body,
        processed_by_manager: req.user.user_id,
        transaction_id: req.body.transaction_id || `MANAGER_${Date.now()}`
    };

    const payment = await PaymentService.createPayment(req.user, paymentData);
    return ApiResponse.created(res, 'Pagamento processato con successo', payment);
});

exports.updatePayment = catchAsync(async (req, res, next) => {
    const paymentId = parseInt(req.params.paymentId);
    const payment = await PaymentService.updatePaymentStatus(req.user, paymentId, req.body);
    return ApiResponse.updated(res, payment, 'Pagamento aggiornato');
});

module.exports = {
    getDashboard: exports.getDashboard,
    getMyLocations: exports.getMyLocations,
    createLocation: exports.createLocation,
    updateLocation: exports.updateLocation,
    deleteLocation: exports.deleteLocation,
    getMySpaces: exports.getMySpaces,
    createSpace: exports.createSpace,
    updateSpace: exports.updateSpace,
    deleteSpace: exports.deleteSpace,
    updateSpaceAvailability: exports.updateSpaceAvailability,
    setSpaceHours: exports.setSpaceHours,
    getAllMyBookings: exports.getAllMyBookings,
    updateBooking: exports.updateBooking,
    createBookingForClient: exports.createBookingForClient,
    getAllMyPayments: exports.getAllMyPayments,
    processClientPayment: exports.processClientPayment,
    updatePayment: exports.updatePayment
};
