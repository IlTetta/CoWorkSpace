const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Ottiene la disponibilità per uno spazio e un intervallo di date
exposrts.getSpaceAvailability = catchAsync(async (req, res, next) => {
    const { space_id, start_date, end_date } = req.body;

    if (!space_id || !start_date || !end_date) {
        return res.status(400).json({
            message: 'Space ID, data di inizio e data di fine sono obbligatori per la ricerca di disponibilità.'
        });
    }
    
    // Verifica che lo spazio esista
    const spaceExists = await pool.query (
        'SELECT 1 FROM spaces WHERE space_id = $1',
        [space_id]
    );
    if (spaceExists.rows.length === 0) {
        return res.status(404).json({
            message: 'Spazio non trovato.'
        });
    }

    const result = await pool.query(
        `SELECT * FROM availability
         WHERE space_id = $1
         AND availability_date >= $2
         AND availability_date <= $3
         AND is_available = true
         ORDER BY availability_date, start_time`,
        [space_id, start_date, end_date]
    );

    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            availability: result.rows
        }
    });
});

// Crea un nuovo blocco di disponibilità
exports.createAvailability = catchAsync(async (req, res, next) => {
    const { space_id, availability_date, start_time, end_time, is_available } = req.body;

    if (!space_id || !availability_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
        });
    }

    // Verifica che lo spazio esista
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
        const result = await pool.query(
            `INSERT INTO availability (space_id, availability_date, start_time, end_time, is_available)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
             [space_id, availability_date, start_time, end_time, is_available !== undefined ? is_available : true]
        );

        res.status(201).json({
            status: 'success',
            data: {
                availability: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        }
        next(error);
    }
});

// Aggiorna un blocco di disponibilità
exports.updateAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { space_id, availability_date, start_time, end_time, is_available } = req.body;
    const updateFields = [];
    const queryParams = [];
    let queryIndex = 2;

    if (space_id) {
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

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    try {
        const query = `
            UPDATE availability
            SET ${updateFields.join(', ')}
            WHERE availability_id = $1
            RETURNING *
        `;
        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Disponibilità non trovata.'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                availability: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        }
        next(error);
    }
});

// Elimina un blocco di disponibilità
exports.deleteAvailability = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await pool.query(
        'DELETE FROM availability WHERE availability_id = $1 RETURNING *',
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Disponibilità non trovata.'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
})