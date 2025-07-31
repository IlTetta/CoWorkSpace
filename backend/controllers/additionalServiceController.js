const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Ottieni tutti i servizi aggiuntivi
exports.getAllAdditionalServices = catchAsync(async (req, res, next) => {
    const result = await pool.query('SELECT * FROM additional_services WHERE is_active = TRUE ORDER BY service_name');
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            additionalServices: result.rows
        }
    });
});

// Ottieni un singolo servizio aggiuntivo per ID
exports.getAdditionalServiceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM additional_services WHERE service_id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Servizio aggiuntivo non trovato'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            additionalService: result.rows[0]
        }
    });
});

// Crea un nuovo servizio aggiuntivo
exports.createAdditionalService = catchAsync(async (req, res, next) => {
    const { service_name, description, price, is_active } = req.body;

    if (!service_name || price === undefined) {
        return res.status(400).json({ message: 'Nome del servizio e prezzo sono obbligatori.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO additional_services (service_name, description, price, is_active)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [service_name, description, price, is_active !== undefined ? is_active : true]
        );
        res.status(201).json({
            status: 'success',
            data: {
                additionalService: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') { // UNIQUE service_name
            return res.status(409).json({ message: 'Un servizio con questo nome esiste già.' });
        }
        next(error);
    }
});

// Aggiorna un servizio aggiuntivo esistente
exports.updateAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { service_name, description, price, is_active } = req.body;
    const updateFields = [];
    const queryParams = [id];
    let queryIndex = 2;

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

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    try {
        const query = `UPDATE additional_services SET ${updateFields.join(', ')} WHERE service_id = $1 RETURNING *`;
        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Servizio aggiuntivo non trovato'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                additionalService: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Un servizio con questo nome esiste già.' });
        }
        next(error);
    }
});

// Elimina un servizio aggiuntivo
exports.deleteAdditionalService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM additional_services WHERE service_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Servizio aggiuntivo non trovato'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Associa un servizio a uno spazio
exports.addServiceToSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    // Verifica che il servizio e lo spazio esistano
    const serviceExists = await pool.query('SELECT 1 FROM additional_services WHERE service_id = $1', [serviceId]);
    if (serviceExists.rows.length === 0) {
        return res.status(404).json({ message: 'Servizio non trovato.' });
    }

    const spaceExists = await pool.query('SELECT 1 FROM spaces WHERE space_id = $1', [spaceId]);
    if (spaceExists.rows.length === 0) {
        return res.status(404).json({ message: 'Spazio non trovato.' });
    }

    try {
        await pool.query(
            `INSERT INTO space_services (space_id, service_id) VALUES ($1, $2) RETURNING *`,
            [spaceId, serviceId]
        );
        res.status(201).json({
            status: 'success',
            message: 'Servizio associato allo spazio con successo.'
        });
    } catch (error) {
        if (error.code === '23505') { // UNIQUE (space_id, service_id)
            return res.status(409).json({ message: 'Questo servizio è già associato a questo spazio.' });
        }
        next(error);
    }
});

// Dissocia un servizio da uno spazio
exports.removeServiceFromSpace = catchAsync(async (req, res, next) => {
    const { serviceId, spaceId } = req.params;

    const result = await pool.query(
        `DELETE FROM space_services WHERE space_id = $1 AND service_id = $2 RETURNING *`,
        [spaceId, serviceId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Associazione servizio-spazio non trovata.'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Ottieni tutti i servizi associati a uno specifico spazio
exports.getServicesBySpace = catchAsync(async (req, res, next) => {
    const { spaceId } = req.params;

    const result = await pool.query(
        `SELECT ads.*
         FROM additional_services ads
         JOIN space_services ss ON ads.service_id = ss.service_id
         WHERE ss.space_id = $1 AND ads.is_active = TRUE
         ORDER BY ads.service_name`,
        [spaceId]
    );

    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            services: result.rows
        }
    });
});