const AdditionalServiceService = require('../services/AdditionalServiceService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');

// Middleware per ottenere tutti i servizi aggiuntivi attivi.
exports.getAllAdditionalServices = catchAsync(async (req, res, next) => {
    // Recupera filtri opzionali dalla query string
    const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : true,
        service_name: req.query.service_name,
        min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
        max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined
    };

    const services = await AdditionalServiceService.getAllActiveServices();
    
    return ApiResponse.list(res, services, 'Servizi aggiuntivi recuperati con successo', filters);
});

// Middleware per ottenere un singolo servizio aggiuntivo tramite il suo ID.
exports.getAdditionalServiceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    const service = await AdditionalServiceService.getServiceById(id);

    return ApiResponse.success(res, 200, 'Servizio aggiuntivo recuperato con successo', {
        additionalService: service
    });
});

// Middleware per creare un nuovo servizio aggiuntivo.
exports.createAdditionalService = catchAsync(async (req, res, next) => {
    const serviceData = req.body;

    const newService = await AdditionalServiceService.createService(serviceData);
        
    return ApiResponse.created(res, 'Servizio aggiuntivo creato con successo', {
        additionalService: newService
    });
});

// Middleware per aggiornare un servizio aggiuntivo esistente.
exports.updateAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedService = await AdditionalServiceService.updateService(id, updateData);
        
    return ApiResponse.updated(res, {
        additionalService: updatedService
    }, 'Servizio aggiuntivo aggiornato con successo');
});

// Middleware per eliminare un servizio aggiuntivo.
exports.deleteAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    await AdditionalServiceService.deleteService(id);

    return ApiResponse.deleted(res, 'Servizio aggiuntivo eliminato con successo');
});

// Middleware per associare un servizio aggiuntivo a uno spazio specifico.
exports.addServiceToSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    await AdditionalServiceService.addServiceToSpace(spaceId, serviceId);
        
    return ApiResponse.created(res, 'Servizio associato allo spazio con successo');
});

// Middleware per dissociare (rimuovere) un servizio da uno spazio.
exports.removeServiceFromSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    await AdditionalServiceService.removeServiceFromSpace(spaceId, serviceId);

    return ApiResponse.success(res, 200, 'Servizio rimosso dallo spazio con successo');
});

// Middleware per ottenere tutti i servizi aggiuntivi associati a uno specifico spazio.
exports.getServicesBySpace = catchAsync(async (req, res, next) => {
    const { spaceId } = req.params;

    const services = await AdditionalServiceService.getServicesBySpace(spaceId);

    return ApiResponse.list(res, services, 'Servizi per spazio recuperati con successo');
});