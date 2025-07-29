const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Ottieni tutti gli spazi (con possibilità di filtro per location_id e space_type_id)
exports.getAllSpaces = catchAsync(async (req, res, next) => {
    const { location_id, space_type_id } = req.query; // Filtri per tipologia di spazio 
    let query = 'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id';
    const queryParams = [];
    const conditions = [];
    let queryIndex = 1;

    if (location_id) {
        conditions.push(`s.location_id = $${queryIndex++}`);
        queryParams.push(location_id);
    }
    if (space_type_id) {
        conditions.push(`s.space_type_id = $${queryIndex++}`);
        queryParams.push(space_type_id);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, queryParams);
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            spaces: result.rows
        }
    });
});

// Ottieni un singolo spazio per ID
exports.getSpaceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const query = `
        SELECT s.*, l.location_name, st.type_name
        FROM spaces s
        JOIN locations l ON s.location_id = l.location_id
        JOIN space_types st ON s.space_type_id = st.space_type_id
        WHERE s.space_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Crea un nuovo spazio
exports.createSpace = catchAsync(async (req, res, next) => {
    const { location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day } = req.body;

    if (!location_id || !space_type_id || !space_name || !capacity || price_per_hour === undefined || price_per_day === undefined) {
        return res.status(400).json({ message: 'Location ID, Space Type ID, nome, capacità, prezzo orario e prezzo giornaliero sono obbligatori.' });
    }

    const locationExists = await pool.query('SELECT 1 FROM locations WHERE location_id = $1', [location_id]);
    if (locationExists.rows.length === 0) {
        return res.status(400).json({ message: 'Location ID non valida.' });
    }

    const spaceTypeExists = await pool.query('SELECT 1 FROM space_types WHERE space_type_id = $1', [space_type_id]);
    if (spaceTypeExists.rows.length === 0) {
        return res.status(400).json({ message: 'Space Type ID non valido.' });
    }

    const result = await pool.query(
        `INSERT INTO spaces (location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day]
    );

    res.status(201).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Aggiorna uno spazio esistente
exports.updateSpace = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day } = req.body;
    const updateFields = [];
    const queryParams = [id];
    let queryIndex = 2;

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

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nessun campo valido fornito per l\'aggiornamento.' });
    }

    const query = `UPDATE spaces SET ${updateFields.join(', ')} WHERE space_id = $1 RETURNING *`;
    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            space: result.rows[0]
        }
    });
});

// Elimina uno spazio
exports.deleteSpace = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM spaces WHERE space_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Spazio non trovato'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});