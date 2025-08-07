const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const SpaceType = require('../models/SpaceType');

// Middleware per ottenere tutti i tipi di spazio.
exports.getAllSpaceTypes = catchAsync(async (req, res, next) => {
    // Utilizza il modello per ottenere tutti i tipi di spazio
    const spaceTypes = await SpaceType.findAll();
    
    // Invia una risposta di successo con lo stato 200, il numero di risultati e i dati.
    res.status(200).json({
        status: 'success',
        results: spaceTypes.length,
        data: {
            spaceTypes: spaceTypes
        }
    });
});

// Middleware per ottenere i dettagli di un singolo tipo di spazio tramite il suo ID.
exports.getSpaceTypeById = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;
    
    // Utilizza il modello per trovare il tipo di spazio
    const spaceType = await SpaceType.findById(id);

    // Se il tipo di spazio non è stato trovato, restituisce un errore 404.
    if (!spaceType) {
        return res.status(404).json({
            status: 'fail',
            message: 'Tipo di spazio non trovato'
        });
    }

    // Invia una risposta di successo con i dati del tipo di spazio trovato.
    res.status(200).json({
        status: 'success',
        data: {
            spaceType: spaceType
        }
    });
});

// Middleware per creare un nuovo tipo di spazio.
exports.createSpaceType = catchAsync(async (req, res, next) => {
    // Estrae i dati del nuovo tipo di spazio dal corpo della richiesta.
    const { type_name, description } = req.body;

    // Validazione dei campi obbligatori (gestita dal modello, ma mantengo per compatibilità).
    if (!type_name) {
        return res.status(400).json({
            status: 'fail',
            message: 'Il nome del tipo di spazio è obbligatorio'
        });
    }

    // `try...catch` per gestire specifici errori del database.
    try {
        // Utilizza il modello per creare il nuovo tipo di spazio
        const spaceType = await SpaceType.create({ type_name, description });

        // Invia una risposta con stato 201 (Created) e i dati del nuovo tipo di spazio.
        res.status(201).json({
            status: 'success',
            data: {
                spaceType: spaceType
            }
        });
    } catch (error) {
        // Gestisce l'errore di violazione del vincolo di unicità (codice '23505' in PostgreSQL).
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        }
        // Passa l'errore al middleware di gestione globale.
        next(error);
    }
});

// Middleware per aggiornare i dati di un tipo di spazio esistente.
exports.updateSpaceType = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL e i campi da aggiornare dal corpo della richiesta.
    const { id } = req.params;
    const { type_name, description } = req.body;
    
    // Verifica che almeno un campo sia fornito per l'aggiornamento
    if (!type_name && !description) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nessun campo valido fornito per l\'aggiornamento'
        });
    }

    // `try...catch` per gestire specifici errori del database, come la violazione di unicità.
    try {
        // Utilizza il modello per aggiornare il tipo di spazio
        const spaceType = await SpaceType.update(id, { type_name, description });

        // Se il tipo di spazio non è stato trovato
        if (!spaceType) {
            return res.status(404).json({
                status: 'fail',
                message: 'Tipo di spazio non trovato'
            });
        }

        // Invia una risposta di successo con i dati aggiornati.
        res.status(200).json({
            status: 'success',
            data: {
                spaceType: spaceType
            }
        });
    } catch (error) {
        // Gestisce l'errore di violazione del vincolo di unicità.
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        }
        next(error);
    }
});

// Middleware per eliminare un tipo di spazio esistente.
exports.deleteSpaceType = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;
    
    // Utilizza il modello per eliminare il tipo di spazio
    const deletedSpaceType = await SpaceType.delete(id);

    // Se il tipo di spazio non è stato trovato
    if (!deletedSpaceType) {
        return res.status(404).json({
            status: 'fail',
            message: 'Tipo di spazio non trovato'
        });
    }

    // Invia una risposta di successo con stato 204 (No Content), poiché non c'è un corpo da restituire.
    res.status(204).json({
        status: 'success',
        data: null
    });
});

