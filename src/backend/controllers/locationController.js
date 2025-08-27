// src/backend/controllers/locationController.js
const LocationService = require('../services/LocationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

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

    return ApiResponse.list(res, locations.map(location => location.toJSON()), 'Locations recuperate con successo', filters);
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

    return ApiResponse.success(res, 200, 'Dettagli location recuperati con successo', locationDetails);
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

    return ApiResponse.created(res, 'Location creata con successo', {
        location: location.toJSON()
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

    return ApiResponse.updated(res, {
        location: location.toJSON()
    }, 'Location aggiornata con successo');
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

    return ApiResponse.deleted(res, 'Location eliminata con successo');
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

    return ApiResponse.list(res, locations, 'Locations disponibili recuperate con successo');
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

    return ApiResponse.updated(res, {
        location: location.toJSON()
    }, 'Gestione location trasferita con successo');
});

/**
 * Dashboard per manager
 */
exports.getManagerDashboard = catchAsync(async (req, res, next) => {
    const dashboard = await LocationService.getManagerDashboard(req.user);

    return ApiResponse.success(res, 200, 'Dashboard manager recuperata con successo', dashboard);
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

    return ApiResponse.success(res, 200, 'Statistiche location recuperate con successo', {
        statistics: locationDetails.statistics
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

    return ApiResponse.list(res, sortedLocations, 'Locations ordinate recuperate con successo');
});

/**
 * Ottieni locations con filtri avanzati e ordinamento
 * Supporta filtri per nome, città e varie opzioni di ordinamento
 */
exports.getFilteredLocations = catchAsync(async (req, res, next) => {
    const { 
        name,           // Filtro per nome (ricerca parziale)
        city,           // Filtro per città (ricerca esatta)
        sortBy,         // Tipo di ordinamento: 'name', 'city', 'date'
        sortOrder       // Ordine: 'asc', 'desc'
    } = req.query;

    // Costruisci i filtri
    const filters = {};
    if (name) filters.name = name;
    if (city) filters.city = city;

    // Ottieni le locations filtrate
    const locations = await LocationService.getFilteredLocations(filters, {
        sortBy: sortBy || 'name',
        sortOrder: sortOrder || 'asc'
    }, req.user || null);

    return ApiResponse.list(res, locations, 'Locations filtrate recuperate con successo', {
        filters: { name, city },
        sorting: { sortBy: sortBy || 'name', sortOrder: sortOrder || 'asc' }
    });
});

/**
 * Ottieni informazioni complete di una location con tutti i dati associati
 * Include spazi, prenotazioni, statistiche, servizi aggiuntivi e manager
 */
exports.getLocationCompleteInfo = catchAsync(async (req, res, next) => {
    const location_id = parseInt(req.params.location_id);
    
    if (!location_id || location_id <= 0) {
        return next(AppError.badRequest('ID location non valido'));
    }

    // req.user può essere undefined per richieste pubbliche
    const completeInfo = await LocationService.getLocationCompleteInfo(location_id, req.user || null);

    return ApiResponse.success(res, 200, 'Informazioni complete location recuperate con successo', completeInfo);
});