const AvailabilityService = require('../services/AvailabilityService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// Middleware per ottenere la disponibilità di uno spazio in un intervallo di date
exports.getSpaceAvailability = catchAsync(async (req, res, next) => {
    const { space_id, start_date, end_date } = req.query;

    if (!space_id || !start_date || !end_date) {
        return next(new AppError('Space ID, data di inizio e data di fine sono obbligatori', 400));
    }

    const availability = await AvailabilityService.getSpaceAvailability(
        parseInt(space_id), 
        start_date, 
        end_date
    );

    return ApiResponse.list(res, availability, 'Disponibilità spazio recuperata con successo');
});

// Middleware per creare un nuovo blocco di disponibilità
exports.createAvailability = catchAsync(async (req, res, next) => {
    const availabilityData = req.body;

    const newAvailability = await AvailabilityService.createAvailability(availabilityData);

    return ApiResponse.created(res, 'Disponibilità creata con successo', {
        availability: newAvailability
    });
});

// Middleware per aggiornare un blocco di disponibilità esistente
exports.updateAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedAvailability = await AvailabilityService.updateAvailability(
        parseInt(id), 
        updateData
    );

    return ApiResponse.updated(res, {
        availability: updatedAvailability
    }, 'Disponibilità aggiornata con successo');
});

// Middleware per eliminare un blocco di disponibilità
exports.deleteAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    await AvailabilityService.deleteAvailability(parseInt(id));

    return ApiResponse.deleted(res, 'Disponibilità eliminata con successo');
});

// Middleware per generare automaticamente la disponibilità per uno spazio
exports.generateAvailabilitySchedule = catchAsync(async (req, res, next) => {
    const { 
        space_id, 
        start_date, 
        end_date, 
        start_time, 
        end_time, 
        exclude_days 
    } = req.body;

    if (!space_id || !start_date || !end_date || !start_time || !end_time) {
        return next(new AppError('Tutti i campi temporali sono obbligatori', 400));
    }

    const generatedBlocks = await AvailabilityService.generateAvailabilitySchedule(
        parseInt(space_id),
        start_date,
        end_date,
        start_time,
        end_time,
        exclude_days || []
    );

    return ApiResponse.created(res, 'Disponibilità generate con successo', {
        blocks: generatedBlocks,
        count: generatedBlocks.length
    });
});

// Middleware per verificare la disponibilità per una prenotazione giornaliera
exports.checkBookingAvailability = catchAsync(async (req, res, next) => {
    let { space_id, start_date, end_date } = req.query;

    // Supporto per formato legacy
    if (!start_date && req.query.booking_date) {
        start_date = req.query.booking_date;
    }
    
    if (!end_date && req.query.booking_date) {
        end_date = req.query.booking_date; // Per singolo giorno
    }

    if (!space_id || !start_date || !end_date) {
        return next(new AppError('space_id, start_date e end_date sono obbligatori', 400));
    }

    const Space = require('../models/Space');
    const availabilityCheck = await Space.checkDailyAvailability(
        parseInt(space_id),
        start_date,
        end_date
    );

    return ApiResponse.success(res, 200, 'Verifica disponibilità completata', availabilityCheck);
});

// Middleware per ottenere statistiche sulla disponibilità
exports.getAvailabilityStatistics = catchAsync(async (req, res, next) => {
    const { space_id, start_date, end_date } = req.query;

    if (!space_id || !start_date || !end_date) {
        return next(new AppError('Space ID e intervallo date sono obbligatori', 400));
    }

    const statistics = await AvailabilityService.getAvailabilityStatistics(
        parseInt(space_id),
        start_date,
        end_date
    );

    return ApiResponse.success(res, 200, 'Statistiche disponibilità recuperate', statistics);
});

// Middleware per disabilitare un periodo di disponibilità
exports.disableAvailabilityPeriod = catchAsync(async (req, res, next) => {
    const { space_id, start_date, end_date, reason } = req.body;

    if (!space_id || !start_date || !end_date) {
        return next(new AppError('Space ID e intervallo date sono obbligatori', 400));
    }

    const disabledBlocks = await AvailabilityService.disableAvailabilityPeriod(
        parseInt(space_id),
        start_date,
        end_date,
        reason
    );

    return ApiResponse.success(res, 200, 'Periodo disabilitato con successo', {
        disabledBlocks,
        count: disabledBlocks.length
    });
});