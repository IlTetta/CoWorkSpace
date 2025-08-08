const AvailabilityService = require('../services/AvailabilityService');
const catchAsync = require('../utils/catchAsync');

// Middleware per ottenere la disponibilità di uno spazio in un intervallo di date.
exports.getSpaceAvailability = catchAsync(async (req, res, next) => {
    // Prende i parametri dalla query string per GET requests
    const { space_id, start_date, end_date } = req.query;

    const availability = await AvailabilityService.getSpaceAvailability(space_id, start_date, end_date);

    res.status(200).json({
        success: true,
        message: 'Disponibilità spazio recuperata con successo',
        data: {
            availability: availability,
            count: availability.length
        }
    });
});

// Middleware per creare un nuovo blocco di disponibilità.
exports.createAvailability = catchAsync(async (req, res, next) => {
    const availabilityData = req.body;

    const newAvailability = await AvailabilityService.createAvailability(availabilityData);

    res.status(201).json({
        success: true,
        message: 'Disponibilità creata con successo',
        data: {
            availability: newAvailability
        }
    });
});

// Middleware per aggiornare un blocco di disponibilità esistente.
exports.updateAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedAvailability = await AvailabilityService.updateAvailability(id, updateData);

    res.status(200).json({
        success: true,
        message: 'Disponibilità aggiornata con successo',
        data: {
            availability: updatedAvailability
        }
    });
});

// Middleware per eliminare un blocco di disponibilità.
exports.deleteAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    await AvailabilityService.deleteAvailability(id);

    res.status(200).json({
        success: true,
        message: 'Disponibilità eliminata con successo'
    });
});