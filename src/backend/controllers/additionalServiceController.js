const AdditionalServiceService = require('../services/AdditionalServiceService');
const catchAsync = require('../utils/catchAsync');

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
    
    res.status(200).json({
        success: true,
        message: 'Servizi aggiuntivi recuperati con successo',
        data: {
            additionalServices: services,
            count: services.length
        }
    });
});

// Middleware per ottenere un singolo servizio aggiuntivo tramite il suo ID.
exports.getAdditionalServiceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    const service = await AdditionalServiceService.getServiceById(id);

    res.status(200).json({
        success: true,
        message: 'Servizio aggiuntivo recuperato con successo',
        data: {
            additionalService: service
        }
    });
});

// Middleware per creare un nuovo servizio aggiuntivo.
exports.createAdditionalService = catchAsync(async (req, res, next) => {
    const serviceData = req.body;

    const newService = await AdditionalServiceService.createService(serviceData);
        
    res.status(201).json({
        success: true,
        message: 'Servizio aggiuntivo creato con successo',
        data: {
            additionalService: newService
        }
    });
});

// Middleware per aggiornare un servizio aggiuntivo esistente.
exports.updateAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedService = await AdditionalServiceService.updateService(id, updateData);
        
    res.status(200).json({
        success: true,
        message: 'Servizio aggiuntivo aggiornato con successo',
        data: {
            additionalService: updatedService
        }
    });
});

// Middleware per eliminare un servizio aggiuntivo.
exports.deleteAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    await AdditionalServiceService.deleteService(id);

    res.status(200).json({
        success: true,
        message: 'Servizio aggiuntivo eliminato con successo'
    });
});

// Middleware per associare un servizio aggiuntivo a uno spazio specifico.
exports.addServiceToSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    await AdditionalServiceService.addServiceToSpace(spaceId, serviceId);
        
    res.status(201).json({
        success: true,
        message: 'Servizio associato allo spazio con successo'
    });
});

// Middleware per dissociare (rimuovere) un servizio da uno spazio.
exports.removeServiceFromSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    await AdditionalServiceService.removeServiceFromSpace(spaceId, serviceId);

    res.status(200).json({
        success: true,
        message: 'Servizio rimosso dallo spazio con successo'
    });
});

// Middleware per ottenere tutti i servizi aggiuntivi associati a uno specifico spazio.
exports.getServicesBySpace = catchAsync(async (req, res, next) => {
    const { spaceId } = req.params;

    const services = await AdditionalServiceService.getServicesBySpace(spaceId);

    res.status(200).json({
        success: true,
        message: 'Servizi per spazio recuperati con successo',
        data: {
            services: services,
            count: services.length
        }
    });
});