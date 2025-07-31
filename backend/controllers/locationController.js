const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// Funzione per ottenere tutte le sedi (con possibilità di filtro per città)
exports.getAllLocations = catchAsync(async (req, res, next) => {
    const { city } = req.query; // Filtro per città
    let query = 'SELECT * FROM locations';
    const queryParams = [];

    if (city) {
        query += ' WHERE city ILIKE $1'; // Case-insensitive search
        queryParams.push(`%${city}%`);
    }

    const result = await pool.query(query, queryParams);
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            locations: result.rows
        }
    });
});

exports.getAllLocationsAlphabetically...

// Funzione per ottenere una singola sede per ID
exports.getLocationById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM locations WHERE location_id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per creare una nuova sede
exports.createLocation = catchAsync(async (req, res, next) => {
    const { location_name, address, city, description, manager_id } = req.body;

    if( !location_name || !address || !city) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nome, indirizzo e città sono obbligatori'
        });
    }

    if (manager_id) {
        const managerCheck = await pool.query(
            'SELECT user_id FROM users WHERE user_id = $1 AND role = "manager"',
            [manager_id]
        );
        if (managerCheck.rows.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'L\'ID del manager non è valido o non è un manager'
            });
        }
    }

    const result = await pool.query(
        `INSERT INTO locations (location_name, address, city, description, manager_id) 
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [location_name, address, city, description, manager_id || null] // manager_id può essere null
    );

    res.status(201).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per aggiornare una sede esistente
exports.updateLocation = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { location_name, address, city, description, manager_id } = req.body;
    const updateFields = [];
    const queryParams = [id];
    let queryIndex = 2;

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
    if (manager_id !== undefined) {
        if (manager_id !== null) {
            const managerCheck = await pool.query(
                'SELECT user_id FROM users WHERE user_id = $1 AND role = "manager"',
                [manager_id]
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

    if (updateFields.length === 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nessun campo valido fornito per l\'aggiornamento'
        });
    }

    const query = `UPDATE locations SET ${updateFields.join(', ')} WHERE location_id = $1 RETURNING *`;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            location: result.rows[0]
        }
    });
});

// Funzione per eliminare una sede
exports.deleteLocation = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM locations WHERE location_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Sede non trovata'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});