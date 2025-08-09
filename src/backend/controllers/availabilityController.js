const AvailabilityService = require('../services/AvailabilityService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');

// Middleware per ottenere la disponibilità di uno spazio in un intervallo di date.
exports.getSpaceAvailability = catchAsync(async (req, res, next) => {
    // Prende i parametri dalla query string per GET requests
    const { space_id, start_date, end_date } = req.query;

    const availability = await AvailabilityService.getSpaceAvailability(space_id, start_date, end_date);

    return ApiResponse.list(res, availability, 'Disponibilità spazio recuperata con successo');
});

// Middleware per creare un nuovo blocco di disponibilità.
exports.createAvailability = catchAsync(async (req, res, next) => {
    const availabilityData = req.body;

    const newAvailability = await AvailabilityService.createAvailability(availabilityData);

    return ApiResponse.created(res, 'Disponibilità creata con successo', {
        availability: newAvailability
    });
});

// Middleware per aggiornare un blocco di disponibilità esistente.
exports.updateAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedAvailability = await AvailabilityService.updateAvailability(id, updateData);

    return ApiResponse.updated(res, {
        availability: updatedAvailability
    }, 'Disponibilità aggiornata con successo');
});

// Middleware per eliminare un blocco di disponibilità.
exports.deleteAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    await AvailabilityService.deleteAvailability(id);

    return ApiResponse.deleted(res, 'Disponibilità eliminata con successo');
});