const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Middleware per ottenere tutti i servizi aggiuntivi attivi.
exports.getAllAdditionalServices = catchAsync(async (req, res, next) => {
    // Esegue una query per selezionare tutti i servizi aggiuntivi.
    // L'uso di `is_active = TRUE` filtra solo i servizi disponibili.
    const result = await pool.query('SELECT * FROM additional_services WHERE is_active = TRUE ORDER BY service_name');
    
    // Invia una risposta con stato 200 (OK), il numero di risultati e i dati.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            additionalServices: result.rows // Contiene l'array di servizi trovati.
        }
    });
});

// Middleware per ottenere un singolo servizio aggiuntivo tramite il suo ID.
exports.getAdditionalServiceById = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della richiesta.
    const { id } = req.params;
    
    // Esegue una query per cercare il servizio con l'ID specificato.
    const result = await pool.query('SELECT * FROM additional_services WHERE service_id = $1', [id]);

    // Se non viene trovata alcuna riga, il servizio non esiste.
    if (result.rows.length === 0) {
        // Invia un errore 404 (Not Found).
        return res.status(404).json({
            status: 'fail',
            message: 'Servizio aggiuntivo non trovato'
        });
    }

    // Invia una risposta con stato 200 e i dati del servizio trovato.
    res.status(200).json({
        status: 'success',
        data: {
            additionalService: result.rows[0] // Restituisce il primo (e unico) servizio trovato.
        }
    });
});

// Middleware per creare un nuovo servizio aggiuntivo.
exports.createAdditionalService = catchAsync(async (req, res, next) => {
    // Estrae i dati del nuovo servizio dal corpo della richiesta.
    const { service_name, description, price, is_active } = req.body;

    // Validazione: controlla che il nome e il prezzo siano presenti.
    if (!service_name || price === undefined) {
        return res.status(400).json({ message: 'Nome del servizio e prezzo sono obbligatori.' });
    }

    try {
        // Esegue la query di inserimento per creare un nuovo servizio.
        const result = await pool.query(
            `INSERT INTO additional_services (service_name, description, price, is_active)
             VALUES ($1, $2, $3, $4) RETURNING *`, // `RETURNING *` restituisce la riga appena creata.
            // Se `is_active` non è specificato, viene impostato su `true` di default.
            [service_name, description, price, is_active !== undefined ? is_active : true]
        );
        
        // Risposta di successo con stato 201 (Created) e il nuovo servizio.
        res.status(201).json({
            status: 'success',
            data: {
                additionalService: result.rows[0]
            }
        });
    } catch (error) {
        // Gestione di un errore di database specifico (codice '23505' per UNIQUE constraint).
        if (error.code === '23505') {
            // Invia un errore 409 (Conflict) se il nome del servizio è già in uso.
            return res.status(409).json({ message: 'Un servizio con questo nome esiste già.' });
        }
        // Per tutti gli altri errori, li passa al middleware di gestione errori globale.
        next(error);
    }
});

// Middleware per aggiornare un servizio aggiuntivo esistente.
exports.updateAdditionalService = catchAsync(async (req, res, next) => {
    // Estrae l'ID dalla URL e i campi da aggiornare dal corpo della richiesta.
    const { id } = req.params;
    const { service_name, description, price, is_active } = req.body;

    const updateFields = []; // Array per costruire dinamicamente la parte `SET` della query.
    const queryParams = [id]; // Array per i valori della query, partendo dall'ID.
    let queryIndex = 2; // Inizia da 2 perché $1 è già usato per l'ID.

    // Aggiunge dinamicamente i campi da aggiornare e i loro valori.
    if (service_name) {
        updateFields.push(`service_name = $${queryIndex++}`);
        queryParams.push(service_name);
    }
    if (description !== undefined) {
        updateFields.push(`description = $${queryIndex++}`);
        queryParams.push(description);
    }
    if (price !== undefined) {
        updateFields.push(`price = $${queryIndex++}`);
        queryParams.push(price);
    }
    if (is_active !== undefined) {
        updateFields.push(`is_active = $${queryIndex++}`);
        queryParams.push(is_active);
    }

    // Se non viene fornito nessun campo, invia un errore 400.
    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    try {
        // Costruisce ed esegue la query di aggiornamento.
        const query = `UPDATE additional_services SET ${updateFields.join(', ')} WHERE service_id = $1 RETURNING *`;
        const result = await pool.query(query, queryParams);

        // Se non viene trovata alcuna riga, l'ID non esiste.
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Servizio aggiuntivo non trovato'
            });
        }
        
        // Risposta di successo con l'oggetto aggiornato.
        res.status(200).json({
            status: 'success',
            data: {
                additionalService: result.rows[0]
            }
        });
    } catch (error) {
        // Gestione di un errore di conflitto (nome duplicato).
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Un servizio con questo nome esiste già.' });
        }
        next(error);
    }
});

// Middleware per eliminare un servizio aggiuntivo.
exports.deleteAdditionalService = catchAsync(async (req, res, next) => {
    // Estrae l'ID dalla URL.
    const { id } = req.params;
    
    // Esegue la query DELETE e restituisce la riga eliminata.
    const result = await pool.query('DELETE FROM additional_services WHERE service_id = $1 RETURNING *', [id]);

    // Se non viene eliminata alcuna riga, l'ID non è stato trovato.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Servizio aggiuntivo non trovato'
        });
    }

    // Risposta di successo con stato 204 (No Content), poiché non c'è corpo da restituire.
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Middleware per associare un servizio aggiuntivo a uno spazio specifico.
exports.addServiceToSpace = catchAsync(async (req, res, next) => {
    // Estrae gli ID del servizio e dello spazio dai parametri della URL.
    const { serviceId, spaceId } = req.params;

    // Verifica che sia il servizio che lo spazio esistano nel database.
    const serviceExists = await pool.query('SELECT 1 FROM additional_services WHERE service_id = $1', [serviceId]);
    if (serviceExists.rows.length === 0) {
        return res.status(404).json({ message: 'Servizio non trovato.' });
    }

    const spaceExists = await pool.query('SELECT 1 FROM spaces WHERE space_id = $1', [spaceId]);
    if (spaceExists.rows.length === 0) {
        return res.status(404).json({ message: 'Spazio non trovato.' });
    }

    try {
        // Esegue la query di inserimento per creare l'associazione nella tabella `space_services`.
        await pool.query(
            `INSERT INTO space_services (space_id, service_id) VALUES ($1, $2) RETURNING *`,
            [spaceId, serviceId]
        );
        
        // Risposta di successo con stato 201 (Created).
        res.status(201).json({
            status: 'success',
            message: 'Servizio associato allo spazio con successo.'
        });
    } catch (error) {
        // Gestisce l'errore se l'associazione esiste già (chiave unica duplicata).
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Questo servizio è già associato a questo spazio.' });
        }
        next(error);
    }
});

// Middleware per dissociare (rimuovere) un servizio da uno spazio.
exports.removeServiceFromSpace = catchAsync(async (req, res, next) => {
    // Estrae gli ID del servizio e dello spazio dai parametri della URL.
    const { serviceId, spaceId } = req.params;

    // Esegue una query DELETE per rimuovere la riga corrispondente all'associazione.
    const result = await pool.query(
        `DELETE FROM space_services WHERE space_id = $1 AND service_id = $2 RETURNING *`,
        [spaceId, serviceId]
    );

    // Se non viene trovata e cancellata alcuna riga, l'associazione non esisteva.
    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Associazione servizio-spazio non trovata.'
        });
    }

    // Risposta di successo con stato 204 (No Content).
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Middleware per ottenere tutti i servizi aggiuntivi associati a uno specifico spazio.
exports.getServicesBySpace = catchAsync(async (req, res, next) => {
    // Estrae l'ID dello spazio dai parametri della URL.
    const { spaceId } = req.params;

    // Esegue una query con JOIN per recuperare i dettagli dei servizi
    // associati allo spazio, filtrando solo quelli attivi.
    const result = await pool.query(
        `SELECT ads.*
         FROM additional_services ads
         JOIN space_services ss ON ads.service_id = ss.service_id
         WHERE ss.space_id = $1 AND ads.is_active = TRUE
         ORDER BY ads.service_name`,
        [spaceId]
    );

    // Risposta di successo con stato 200, il numero di servizi trovati e i dati.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            services: result.rows
        }
    });
});