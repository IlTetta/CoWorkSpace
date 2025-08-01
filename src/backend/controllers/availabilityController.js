const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Middleware per ottenere la disponibilità di uno spazio in un intervallo di date.
exports.getSpaceAvailability = catchAsync(async (req, res, next) => {
    // Estrae i parametri richiesti dal corpo della richiesta (body).
    const { space_id, start_date, end_date } = req.body;

    // --- Validazione dei dati di input ---
    // Controlla che tutti i campi obbligatori siano presenti.
    if (!space_id || !start_date || !end_date) {
        // Se un campo manca, invia un errore 400 (Bad Request).
        return res.status(400).json({
            message: 'Space ID, data di inizio e data di fine sono obbligatori per la ricerca di disponibilità.'
        });
    }

    // --- Verifica l'esistenza dello spazio ---
    // Esegue una query per controllare se lo spazio con l'ID fornito esiste nel database.
    const spaceExists = await pool.query (
        'SELECT 1 FROM spaces WHERE space_id = $1',
        [space_id]
    );
    // Se non viene trovata alcuna riga, lo spazio non esiste.
    if (spaceExists.rows.length === 0) {
        // Invia un errore 404 (Not Found).
        return res.status(404).json({
            message: 'Spazio non trovato.'
        });
    }

    // --- Query per la disponibilità ---
    // Esegue la query principale per trovare i blocchi di disponibilità.
    const result = await pool.query(
        `SELECT * FROM availability
         WHERE space_id = $1
         AND availability_date >= $2
         AND availability_date <= $3
         AND is_available = true
         ORDER BY availability_date, start_time`,
        [space_id, start_date, end_date]
    );

    // --- Risposta di successo ---
    // Invia una risposta con stato 200 (OK) e i dati trovati.
    res.status(200).json({
        status: 'success',
        results: result.rows.length, // Numero di risultati trovati.
        data: {
            availability: result.rows // I dati effettivi di disponibilità.
        }
    });
});

// Middleware per creare un nuovo blocco di disponibilità.
exports.createAvailability = catchAsync(async (req, res, next) => {
    // Estrae i campi necessari dal corpo della richiesta.
    const { space_id, availability_date, start_time, end_time, is_available } = req.body;

    // --- Validazione dei dati di input ---
    if (!space_id || !availability_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
        });
    }

    // --- Verifica l'esistenza dello spazio ---
    const spaceExists = await pool.query(
        'SELECT 1 FROM spaces WHERE space_id = $1',
        [space_id]
    );
    if (spaceExists.rows.length === 0) {
        return res.status(404).json({
            message: 'Spazio non trovato.'
        });
    }

    try {
        // --- Inserimento nel database ---
        // Esegue la query di inserimento per creare il nuovo blocco di disponibilità.
        const result = await pool.query(
            `INSERT INTO availability (space_id, availability_date, start_time, end_time, is_available)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`, // `RETURNING *` restituisce la riga appena creata.
            // Imposta is_available a true se non è specificato.
            [space_id, availability_date, start_time, end_time, is_available !== undefined ? is_available : true]
        );

        // --- Risposta di successo ---
        // Invia una risposta con stato 201 (Created) e il nuovo oggetto creato.
        res.status(201).json({
            status: 'success',
            data: {
                availability: result.rows[0]
            }
        });
    } catch (error) {
        // --- Gestione degli errori del database ---
        // Se si verifica un errore di tipo '23505' (chiave primaria duplicata),
        // significa che il blocco di disponibilità esiste già.
        if (error.code === '23505') {
            return res.status(409).json({ // Invia un errore 409 (Conflict).
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        }
        // Per tutti gli altri errori, passa l'errore al middleware di gestione errori globale.
        next(error);
    }
});

// Middleware per aggiornare un blocco di disponibilità esistente.
exports.updateAvailability = catchAsync(async (req, res, next) => {
    // Estrae l'ID dalla URL e i campi da aggiornare dal corpo della richiesta.
    const { id } = req.params;
    const { space_id, availability_date, start_time, end_time, is_available } = req.body;

    const updateFields = []; // Array per costruire dinamicamente la parte SET della query.
    const queryParams = [id]; // Array per i valori della query, partendo dall'ID.
    let queryIndex = 2; // Inizia da 2 perché $1 è già usato per l'ID.

    // --- Costruzione dinamica della query ---
    // Controlla quali campi sono presenti nella richiesta e li aggiunge alla query.
    if (space_id) {
        // Se space_id è presente, verifica prima che esista nel DB.
        const spaceExists = await pool.query('SELECT 1 FROM spaces WHERE space_id = $1', [space_id]);
        if (spaceExists.rows.length === 0) {
            return res.status(400).json({ message: 'Space ID non valido.' });
        }
        updateFields.push(`space_id = $${queryIndex++}`);
        queryParams.push(space_id);
    }
    if (availability_date) {
        updateFields.push(`availability_date = $${queryIndex++}`);
        queryParams.push(availability_date);
    }
    if (start_time) {
        updateFields.push(`start_time = $${queryIndex++}`);
        queryParams.push(start_time);
    }
    if (end_time) {
        updateFields.push(`end_time = $${queryIndex++}`);
        queryParams.push(end_time);
    }
    if (is_available !== undefined) {
        updateFields.push(`is_available = $${queryIndex++}`);
        queryParams.push(is_available);
    }

    // Se non viene fornito alcun campo da aggiornare, invia un errore.
    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    try {
        // --- Esecuzione della query di aggiornamento ---
        const query = `
            UPDATE availability
            SET ${updateFields.join(', ')}
            WHERE availability_id = $1
            RETURNING *
        `;
        const result = await pool.query(query, queryParams);

        // Se non viene trovata e aggiornata alcuna riga, l'ID non esiste.
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Disponibilità non trovata.'
            });
        }

        // Risposta di successo con l'oggetto aggiornato.
        res.status(200).json({
            status: 'success',
            data: {
                availability: result.rows[0]
            }
        });
    } catch (error) {
        // Gestione di un eventuale errore di conflitto (chiave duplicata).
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        }
        next(error);
    }
});

// Middleware per eliminare un blocco di disponibilità.
exports.deleteAvailability = catchAsync(async (req, res, next) => {
    // Estrae l'ID dalla URL.
    const { id } = req.params;

    // --- Esecuzione della query di eliminazione ---
    // Esegue la query DELETE. `RETURNING *` restituisce la riga eliminata.
    const result = await pool.query(
        'DELETE FROM availability WHERE availability_id = $1 RETURNING *',
        [id]
    );

    // Se `result.rows.length` è 0, significa che non è stata trovata alcuna riga
    // con l'ID specificato e quindi nulla è stato eliminato.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Disponibilità non trovata.'
        });
    }

    // --- Risposta di successo ---
    // Invia una risposta con stato 204 (No Content), che indica che l'operazione
    // ha avuto successo ma non c'è contenuto da restituire.
    res.status(204).json({
        status: 'success',
        data: null // In caso di 204, il corpo della risposta è vuoto.
    });
});