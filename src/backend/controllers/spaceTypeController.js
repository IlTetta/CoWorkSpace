const SpaceTypeService = require('../services/SpaceTypeService');
const catchAsync = require('../utils/catchAsync');

// Middleware per ottenere tutti i tipi di spazio.
exports.getAllSpaceTypes = catchAsync(async (req, res, next) => {
    // Recupera filtri opzionali dalla query string
    const filters = {
        type_name: req.query.type_name,
        description: req.query.description
    };

    const spaceTypes = await SpaceTypeService.getAllSpaceTypes(filters);
    
    res.status(200).json({
        success: true,
        message: 'Tipi di spazio recuperati con successo',
        data: {
            spaceTypes: spaceTypes,
            count: spaceTypes.length
        }
    });
});

// Middleware per ottenere i dettagli di un singolo tipo di spazio tramite il suo ID.
exports.getSpaceTypeById = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    
    const spaceType = await SpaceTypeService.getSpaceTypeById(space_type_id);

    res.status(200).json({
        success: true,
        message: 'Tipo di spazio recuperato con successo',
        data: {
            spaceType: spaceType
        }
    });
});

// Middleware per creare un nuovo tipo di spazio.
exports.createSpaceType = catchAsync(async (req, res, next) => {
    const spaceTypeData = req.body;

    const newSpaceType = await SpaceTypeService.createSpaceType(spaceTypeData);
        
    res.status(201).json({
        success: true,
        message: 'Tipo di spazio creato con successo',
        data: {
            spaceType: newSpaceType
        }
    });
});

// Middleware per aggiornare un tipo di spazio esistente.
exports.updateSpaceType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    const updateData = req.body;

    const updatedSpaceType = await SpaceTypeService.updateSpaceType(space_type_id, updateData);
        
    res.status(200).json({
        success: true,
        message: 'Tipo di spazio aggiornato con successo',
        data: {
            spaceType: updatedSpaceType
        }
    });
});

// Middleware per eliminare un tipo di spazio.
exports.deleteSpaceType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;
    
    await SpaceTypeService.deleteSpaceType(space_type_id);

    res.status(200).json({
        success: true,
        message: 'Tipo di spazio eliminato con successo'
    });
});

// Middleware per ottenere gli spazi che utilizzano un tipo specifico.
exports.getSpacesByType = catchAsync(async (req, res, next) => {
    const { space_type_id } = req.params;

    const spaces = await SpaceTypeService.getSpacesByType(space_type_id);

    res.status(200).json({
        success: true,
        message: 'Spazi per tipo recuperati con successo',
        data: {
            spaces: spaces,
            count: spaces.length
        }
    });
});

// Middleware per cercare tipi di spazio.
exports.searchSpaceTypes = catchAsync(async (req, res, next) => {
    const { q } = req.query;

    const spaceTypes = await SpaceTypeService.searchSpaceTypes(q);

    res.status(200).json({
        status: 'success',
        results: spaceTypes.length,
        data: {
            spaceTypes: spaceTypes
        }
    });
});

// Middleware per ottenere statistiche sui tipi di spazio.
exports.getSpaceTypeStatistics = catchAsync(async (req, res, next) => {
    const statistics = await SpaceTypeService.getSpaceTypeStatistics();

    res.status(200).json({
        status: 'success',
        data: {
            statistics: statistics
        }
    });
});

// Middleware per verificare se un tipo di spazio può essere eliminato.
exports.canDeleteSpaceType = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await SpaceTypeService.canDelete(id);

    res.status(200).json({
        status: 'success',
        data: result
    });
});
