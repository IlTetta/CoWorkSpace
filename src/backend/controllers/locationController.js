// src/backend/controllers/locationController.js
const LocationService = require('../services/LocationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Ottieni tutte le locations con filtri opzionali
 */
exports.getAllLocations = catchAsync(async (req, res, next) => {
    const filters = {
        city: req.query.city,
        name: req.query.name,
        manager_id: req.query.manager_id
    };

    // Rimuovi filtri vuoti
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });

    // req.user può essere undefined per richieste pubbliche
    const locations = await LocationService.getLocations(filters, req.user || null);

    res.status(200).json({
        success: true,
        message: 'Locations recuperate con successo',
        data: {
            locations: locations.map(location => location.toJSON()),
            count: locations.length
        }
    });
});

/**
 * Ottieni dettagli di una location specifica
 */
exports.getLocationById = catchAsync(async (req, res, next) => {
    const location_id = parseInt(req.params.location_id);
    
    if (!location_id || location_id <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    // req.user può essere undefined per richieste pubbliche
    const locationDetails = await LocationService.getLocationDetails(location_id, req.user || null);

    res.status(200).json({
        success: true,
        message: 'Dettagli location recuperati con successo',
        data: locationDetails
    });
});

/**
 * Crea una nuova location
 */
exports.createLocation = catchAsync(async (req, res, next) => {
    const { location_name, address, city, description, manager_id } = req.body;

    const locationData = {
        location_name,
        address,
        city,
        description,
        manager_id
    };

    const location = await LocationService.createLocation(locationData, req.user);

    res.status(201).json({
        success: true,
        message: 'Location creata con successo',
        data: {
            location: location.toJSON()
        }
    });
});

/**
 * Aggiorna una location esistente
 */
exports.updateLocation = catchAsync(async (req, res, next) => {
    const location_id = parseInt(req.params.location_id);
    
    if (!location_id || location_id <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    const { location_name, address, city, description, manager_id } = req.body;

    const updateData = {};
    if (location_name !== undefined) updateData.location_name = location_name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (description !== undefined) updateData.description = description;
    if (manager_id !== undefined) updateData.manager_id = manager_id;

    const location = await LocationService.updateLocation(location_id, updateData, req.user);

    res.status(200).json({
        success: true,
        message: 'Location aggiornata con successo',
        data: {
            location: location.toJSON()
        }
    });
});

/**
 * Elimina una location
 */
exports.deleteLocation = catchAsync(async (req, res, next) => {
    const location_id = parseInt(req.params.location_id);
    
    if (!location_id || location_id <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    await LocationService.deleteLocation(location_id, req.user);

    res.status(200).json({
        success: true,
        message: 'Location eliminata con successo'
    });
});

/**
 * Cerca locations disponibili per prenotazione
 */
exports.searchAvailableLocations = catchAsync(async (req, res, next) => {
    const { city, startDate, endDate, capacity, spaceType } = req.query;

    const searchCriteria = {
        city,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        spaceType
    };

    const locations = await LocationService.searchAvailableLocations(searchCriteria);

    res.status(200).json({
        success: true,
        message: 'Locations disponibili recuperate con successo',
        data: {
            locations,
            count: locations.length
        }
    });
});

/**
 * Trasferisci gestione di una location
 */
exports.transferLocation = catchAsync(async (req, res, next) => {
    const locationId = parseInt(req.params.id);
    const { newManagerId } = req.body;

    if (!locationId || locationId <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    if (!newManagerId || newManagerId <= 0) {
        return next(AppError.badRequest('ID nuovo manager non valido'));
    }

    const location = await LocationService.transferLocation(locationId, newManagerId, req.user);

    res.status(200).json({
        success: true,
        message: 'Gestione location trasferita con successo',
        data: {
            location: location.toJSON()
        }
    });
});

/**
 * Dashboard per manager
 */
exports.getManagerDashboard = catchAsync(async (req, res, next) => {
    const dashboard = await LocationService.getManagerDashboard(req.user);

    res.status(200).json({
        success: true,
        message: 'Dashboard manager recuperata con successo',
        data: dashboard
    });
});

/**
 * Ottieni statistiche di una location
 */
exports.getLocationStats = catchAsync(async (req, res, next) => {
    const locationId = parseInt(req.params.id);
    
    if (!locationId || locationId <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    const locationDetails = await LocationService.getLocationDetails(locationId, req.user);

    res.status(200).json({
        success: true,
        message: 'Statistiche location recuperate con successo',
        data: {
            statistics: locationDetails.statistics
        }
    });
});

/**
 * Ottieni locations ordinate alfabeticamente (compatibilità)
 */
exports.getAllLocationsAlphabetically = catchAsync(async (req, res, next) => {
    const locations = await LocationService.getLocations({}, req.user || null);

    // Ordina alfabeticamente
    const sortedLocations = locations
        .sort((a, b) => a.location_name.localeCompare(b.location_name))
        .map(location => location.toJSON());

    res.status(200).json({
        success: true,
        message: 'Locations ordinate recuperate con successo',
        data: {
            locations: sortedLocations,
            count: sortedLocations.length
        }
    });
});