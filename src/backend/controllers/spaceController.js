const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Middleware per ottenere tutti gli spazi, con filtri opzionali.
exports.getAllSpaces = catchAsync(async (req, res, next) => {
    // Estrae i parametri di filtro 'location_id' e 'space_type_id' dalla query string (es. ?location_id=1).
    const { location_id, space_type_id } = req.query;

    // Query di base per recuperare gli spazi, unendoli con le tabelle `locations` e `space_types`
    // per ottenere nomi descrittivi invece dei soli ID.
    let query = 'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id';

    // Array per costruire dinamicamente la clausola `WHERE` e i parametri della query.
    const queryParams = [];
    const conditions = [];
    let queryIndex = 1;

    // Se `location_id` è presente, aggiunge una condizione e il parametro.
    if (location_id) {
        conditions.push(`s.location_id = $${queryIndex++}`);
        queryParams.push(location_id);
    }
    // Se `space_type_id` è presente, aggiunge una condizione e il parametro.
    if (space_type_id) {
        conditions.push(`s.space_type_id = $${queryIndex++}`);
        queryParams.push(space_type_id);
    }

    // Costruisce la query finale aggiungendo la clausola `WHERE` se ci sono condizioni.
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Esegue la query.
    const result = await pool.query(query, queryParams);

    // Invia una risposta di successo con lo stato 200, il numero di risultati e i dati degli spazi.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            spaces: result.rows
        }
    });
});

// Middleware per ottenere i dettagli di un singolo spazio tramite il suo ID.
exports.getSpaceById = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;

    // Query per recuperare lo spazio, unendo le tabelle per avere tutti i dettagli.
    const query = `
        SELECT s.*, l.location_name, st.type_name
        FROM spaces s
        JOIN locations l ON s.location_id = l.location_id
        JOIN space_types st ON s.space_type_id = st.space_type_id
        WHERE s.space_id = $1
    `;
    const result = await pool.query(query, [id]);

    // Se non viene trovata nessuna riga, lo spazio non esiste.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    // Invia una risposta di successo con i dati dello spazio.
    res.status(200).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Middleware per creare un nuovo spazio.
exports.createSpace = catchAsync(async (req, res, next) => {
    // Estrae i dati del nuovo spazio dal corpo della richiesta.
    const { location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day } = req.body;

    // --- Validazione dei campi obbligatori ---
    if (!location_id || !space_type_id || !space_name || !capacity || price_per_hour === undefined || price_per_day === undefined) {
        return res.status(400).json({ message: 'Location ID, Space Type ID, nome, capacità, prezzo orario e prezzo giornaliero sono obbligatori.' });
    }

    // --- Validazione delle chiavi esterne ---
    // Verifica che l'ID della sede (`location_id`) esista.
    const locationExists = await pool.query('SELECT 1 FROM locations WHERE location_id = $1', [location_id]);
    if (locationExists.rows.length === 0) {
        return res.status(400).json({ message: 'Location ID non valida.' });
    }

    // Verifica che l'ID del tipo di spazio (`space_type_id`) esista.
    const spaceTypeExists = await pool.query('SELECT 1 FROM space_types WHERE space_type_id = $1', [space_type_id]);
    if (spaceTypeExists.rows.length === 0) {
        return res.status(400).json({ message: 'Space Type ID non valido.' });
    }

    // Esegue la query di inserimento.
    const result = await pool.query(
        `INSERT INTO spaces (location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day]
    );

    // Invia una risposta con stato 201 (Created) e i dati del nuovo spazio.
    res.status(201).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Middleware per aggiornare i dati di uno spazio esistente.
exports.updateSpace = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL e i campi da aggiornare dal corpo della richiesta.
    const { id } = req.params;
    const { location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day } = req.body;

    // Array per costruire la query di aggiornamento dinamicamente.
    const updateFields = [];
    const queryParams = [id]; // L'ID dello spazio è sempre il primo parametro.
    let queryIndex = 2; // Inizia l'indice per i placeholder dei parametri da $2.

    // Aggiunge i campi da aggiornare solo se sono forniti nel corpo della richiesta.
    // Per ogni campo che è una chiave esterna, viene eseguita una validazione prima di aggiungerlo alla query.
    if (location_id) {
        const locationExists = await pool.query('SELECT 1 FROM locations WHERE location_id = $1', [location_id]);
        if (locationExists.rows.length === 0) {
            return res.status(400).json({ message: 'Location ID non valida.' });
        }
        updateFields.push(`location_id = $${queryIndex++}`);
        queryParams.push(location_id);
    }
    if (space_type_id) {
        const spaceTypeExists = await pool.query('SELECT 1 FROM space_types WHERE space_type_id = $1', [space_type_id]);
        if (spaceTypeExists.rows.length === 0) {
            return res.status(400).json({ message: 'Space Type ID non valido.' });
        }
        updateFields.push(`space_type_id = $${queryIndex++}`);
        queryParams.push(space_type_id);
    }
    if (space_name) {
        updateFields.push(`space_name = $${queryIndex++}`);
        queryParams.push(space_name);
    }
    if (description !== undefined) {
        updateFields.push(`description = $${queryIndex++}`);
        queryParams.push(description);
    }
    if (capacity !== undefined) {
        updateFields.push(`capacity = $${queryIndex++}`);
        queryParams.push(capacity);
    }
    if (price_per_hour !== undefined) {
        updateFields.push(`price_per_hour = $${queryIndex++}`);
        queryParams.push(price_per_hour);
    }
    if (price_per_day !== undefined) {
        updateFields.push(`price_per_day = $${queryIndex++}`);
        queryParams.push(price_per_day);
    }

    // Se non sono stati forniti campi da aggiornare, invia un errore 400.
    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    // Costruisce ed esegue la query di aggiornamento.
    const query = `UPDATE spaces SET ${updateFields.join(', ')} WHERE space_id = $1 RETURNING *`;
    const result = await pool.query(query, queryParams);

    // Se nessuna riga è stata aggiornata, lo spazio non è stato trovato.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    // Invia una risposta di successo con i dati aggiornati.
    res.status(200).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Middleware per eliminare uno spazio esistente.
exports.deleteSpace = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL.
    const { id } = req.params;

    // Esegue la query DELETE.
    const result = await pool.query('DELETE FROM spaces WHERE space_id = $1 RETURNING *', [id]);

    // Se non viene eliminata alcuna riga, lo spazio non è stato trovato.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    // Invia una risposta con stato 204 (No Content), poiché non c'è un corpo da restituire.
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Middleware per ottenere una lista di spazi con filtri opzionali.
exports.getSpaceList = catchAsync(async (req, res, next) => {
    const { space_type, city, asc } = req.query;
    const order = asc === 'false' ? 'DESC' : 'ASC';

    const query = `
        SELECT 
            s.space_name,
            st.type_name,
            l.city,
            l.address
        FROM spaces s
        JOIN space_types st ON s.space_type_id = st.space_type_id
        JOIN locations l ON s.location_id = l.location_id
        WHERE ($1::text IS NULL OR st.type_name = $1)
          AND ($2::text IS NULL OR l.city = $2)
        ORDER BY s.space_name ${order};
    `;

    try {
        const result = await pool.query(query, [space_type || null, city || null]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware per ottenere i dettagli di uno spazio specifico.
exports.getSpaceDetails = catchAsync(async (req, res, next) => {
    const spaceId = req.params.id;

    const query = `
        SELECT 
            s.space_id,
            s.space_name,
            s.description AS space_description,
            s.capacity,
            s.price_per_hour,
            s.price_per_day,
            st.type_name AS space_type,
            l.location_name AS location_name,
            l.city AS location_city,
            l.description AS location_description,
        FROM spaces s
        JOIN space_types st ON s.space_type_id = st.space_type_id
        JOIN locations l ON s.location_id = l.location_id
        WHERE s.space_id = $1;
    `;

    try {
        const result = await pool.query(query, [spaceId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Spazio non trovato' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});