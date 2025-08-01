const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Funzione per ottenere tutte le sedi, con un filtro opzionale per la città.
exports.getAllLocations = catchAsync(async (req, res, next) => {
    // Estrae il parametro 'city' dalla query string (es. /api/locations?city=Roma).
    const { city } = req.query;
    let query = 'SELECT * FROM locations';
    const queryParams = [];

    // Se il filtro per la città è presente, modifica la query SQL.
    if (city) {
        // Aggiunge una clausola WHERE per cercare la città in modo case-insensitive.
        // `ILIKE` è un operatore di PostgreSQL per la ricerca case-insensitive.
        // I caratteri `%` sono wildcard che permettono di trovare la città anche se è solo una parte del nome.
        query += ' WHERE city ILIKE $1';
        queryParams.push(`%${city}%`);
    }

    // Esegue la query costruita dinamicamente.
    const result = await pool.query(query, queryParams);
    
    // Invia una risposta di successo con lo stato 200, il numero di risultati e i dati delle sedi.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            locations: result.rows
        }
    });
});

// Funzione mancante: ottiene tutte le sedi ordinate alfabeticamente per nome.
exports.getAllLocationsAlphabetically = catchAsync(async (req, res, next) => {
    // La query seleziona tutte le sedi e le ordina per 'location_name' in ordine crescente.
    const result = await pool.query('SELECT * FROM locations ORDER BY location_name ASC');

    // Invia una risposta di successo con lo stato 200 e i dati delle sedi ordinate.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            locations: result.rows
        }
    });
});

// Funzione per ottenere i dettagli di una singola sede tramite il suo ID.
exports.getLocationById = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;
    
    // Esegue la query per trovare la sede con l'ID specificato.
    const result = await pool.query('SELECT * FROM locations WHERE location_id = $1', [id]);

    // Se non viene trovata alcuna riga, significa che la sede non esiste.
    if (result.rows.length === 0) {
        // Invia un errore 404 (Not Found).
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    // Invia una risposta di successo con i dati della sede trovata.
    res.status(200).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per creare una nuova sede.
exports.createLocation = catchAsync(async (req, res, next) => {
    // Estrae i dati della nuova sede dal corpo della richiesta.
    const { location_name, address, city, description, manager_id } = req.body;

    // Validazione dei campi obbligatori.
    if( !location_name || !address || !city) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nome, indirizzo e città sono obbligatori'
        });
    }

    // Se viene specificato un `manager_id`, esegue una verifica.
    if (manager_id) {
        // Controlla se l'ID esiste e se l'utente associato ha il ruolo di "manager".
        const managerCheck = await pool.query(
            'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
            [manager_id, 'manager']
        );
        if (managerCheck.rows.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'L\'ID del manager non è valido o non è un manager'
            });
        }
    }

    // Esegue la query di inserimento per creare la nuova sede.
    const result = await pool.query(
        `INSERT INTO locations (location_name, address, city, description, manager_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        // Imposta `manager_id` a `null` se non è stato fornito.
        [location_name, address, city, description, manager_id || null]
    );

    // Invia una risposta con stato 201 (Created) e i dati della nuova sede.
    res.status(201).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per aggiornare i dati di una sede esistente.
exports.updateLocation = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL e i campi da aggiornare dal corpo della richiesta.
    const { id } = req.params;
    const { location_name, address, city, description, manager_id } = req.body;
    
    // Array per costruire la query di aggiornamento dinamicamente.
    const updateFields = [];
    const queryParams = [id]; // L'ID della sede è sempre il primo parametro.
    let queryIndex = 2; // Inizia l'indice per i placeholder dei parametri da $2.

    // Aggiunge i campi forniti alla lista da aggiornare.
    if (location_name) {
        updateFields.push(`location_name = $${queryIndex++}`);
        queryParams.push(location_name);
    }
    if (address) {
        updateFields.push(`address = $${queryIndex++}`);
        queryParams.push(address);
    }
    if (city) {
        updateFields.push(`city = $${queryIndex++}`);
        queryParams.push(city);
    }
    if (description) {
        updateFields.push(`description = $${queryIndex++}`);
        queryParams.push(description);
    }
    
    // Gestione dell'ID del manager.
    if (manager_id !== undefined) {
        if (manager_id !== null) {
            // Se un nuovo manager_id è fornito e non è null, verifica che sia valido.
            const managerCheck = await pool.query(
                'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
                [manager_id, 'manager']
            );
            if (managerCheck.rows.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'L\'ID del manager non è valido o non è un manager'
                });
            }
        }
        updateFields.push(`manager_id = $${queryIndex++}`);
        queryParams.push(manager_id);
    }

    // Se nessun campo da aggiornare è stato fornito, invia un errore 400.
    if (updateFields.length === 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nessun campo valido fornito per l\'aggiornamento'
        });
    }

    // Costruisce ed esegue la query di aggiornamento.
    const query = `UPDATE locations SET ${updateFields.join(', ')} WHERE location_id = $1 RETURNING *`;
    const result = await pool.query(query, queryParams);

    // Se nessuna riga è stata aggiornata, la sede non è stata trovata.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    // Invia una risposta di successo con i dati aggiornati.
    res.status(200).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per eliminare una sede.
exports.deleteLocation = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;
    
    // Esegue la query DELETE e restituisce la riga eliminata.
    const result = await pool.query('DELETE FROM locations WHERE location_id = $1 RETURNING *', [id]);

    // Se non viene eliminata alcuna riga, la sede non è stata trovata.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    // Invia una risposta di successo con stato 204 (No Content), poiché non c'è corpo da restituire.
    res.status(204).json({
        status: 'success',
        data: null
    });
});