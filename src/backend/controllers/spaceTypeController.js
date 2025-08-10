const SpaceTypeService = require('../services/SpaceTypeService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');

// Middleware per ottenere tutti i tipi di spazio.
exports.getAllSpaceTypes = catchAsync(async (req, res, next) => {
    // Recupera filtri opzionali dalla query string
    const filters = {
        type_name: req.query.type_name,
        description: req.query.description
    };

    const spaceTypes = await SpaceTypeService.getAllSpaceTypes(filters);
    
    return ApiResponse.list(res, spaceTypes, 'Tipi di spazio recuperati con successo', filters);
});

// Middleware per ottenere i dettagli di un singolo tipo di spazio tramite il suo ID.
exports.getSpaceTypeById = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    
    const spaceType = await SpaceTypeService.getSpaceTypeById(space_type_id);

    return ApiResponse.success(res, 200, 'Tipo di spazio recuperato con successo', {
        spaceType: spaceType
    });
});

// Middleware per creare un nuovo tipo di spazio.
exports.createSpaceType = catchAsync(async (req, res, next) => {
    const spaceTypeData = req.body;

    const newSpaceType = await SpaceTypeService.createSpaceType(spaceTypeData);
        
    return ApiResponse.created(res, 'Tipo di spazio creato con successo', {
        spaceType: newSpaceType
    });
});

// Middleware per aggiornare un tipo di spazio esistente.
exports.updateSpaceType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    const updateData = req.body;

    const updatedSpaceType = await SpaceTypeService.updateSpaceType(space_type_id, updateData);
        
    return ApiResponse.updated(res, {
        spaceType: updatedSpaceType
    }, 'Tipo di spazio aggiornato con successo');
});

// Middleware per eliminare un tipo di spazio.
exports.deleteSpaceType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    
    await SpaceTypeService.deleteSpaceType(space_type_id);

    return ApiResponse.deleted(res, 'Tipo di spazio eliminato con successo');
});

// Middleware per ottenere gli spazi che utilizzano un tipo specifico.
exports.getSpacesByType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;

    const spaces = await SpaceTypeService.getSpacesByType(space_type_id);

    return ApiResponse.list(res, spaces, 'Spazi per tipo recuperati con successo');
});

// Middleware per cercare tipi di spazio.
exports.searchSpaceTypes = catchAsync(async (req, res, next) => {
    const { q } = req.query;

    const spaceTypes = await SpaceTypeService.searchSpaceTypes(q);

    return ApiResponse.list(res, spaceTypes, 'Ricerca tipi di spazio completata');
});

// Middleware per ottenere statistiche sui tipi di spazio.
exports.getSpaceTypeStatistics = catchAsync(async (req, res, next) => {
    const statistics = await SpaceTypeService.getSpaceTypeStatistics();

    return ApiResponse.success(res, 200, 'Statistiche tipi di spazio recuperate con successo', {
        statistics: statistics
    });
});

// Middleware per verificare se un tipo di spazio può essere eliminato.
exports.canDeleteSpaceType = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await SpaceTypeService.canDelete(id);

    return ApiResponse.success(res, 200, 'Verifica eliminazione tipo di spazio completata', result);
});
