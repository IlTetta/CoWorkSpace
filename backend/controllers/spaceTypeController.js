const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

exports.getAllSpaceTypes = catchAsync(async (req, res, next) => {
    const result = await pool.query('SELECT * FROM space_types');
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            spaceTypes: result.rows
        }
    });
});

exports.getSpaceTypeById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM space_types WHERE space_type_id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Tipo di spazio non trovato'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            spaceType: result.rows[0]
        }
    });
});

exports.createSpaceType = catchAsync(async (req, res, next) => {
    const { type_name, description } = req.body;

    if (!type_name) {
        return res.status(400).json({
            status: 'fail',
            message: 'Il nome del tipo di spazio è obbligatorio'
        });
    }

    try {
        const result = await pool.query(
            'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
            [type_name, description]
        );

        res.status(201).json({
            status: 'success',
            data: {
                spaceType: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        }
        next(error);
    }
});

exports.updateSpaceType = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { type_name, description } = req.body;
    const updateFields = [];
    const queryParams = [id];
    let queryIndex = 2;

    if (type_name) {
        updateFields.push(`type_name = $${queryIndex++}`);
        queryParams.push(type_name);
    }
    if (description) {
        updateFields.push(`description = $${queryIndex++}`);
        queryParams.push(description);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Nessun campo valido fornito per l\'aggiornamento'
        });
    }

    try {
        const query = `UPDATE space_types SET ${updateFields.join(', ')} WHERE space_type_id = $1 RETURNING *`;
        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Tipo di spazio non trovato'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                spaceType: result.rows[0]
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        }
        next(error);
    }
});

exports.deleteSpaceType = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM space_types WHERE space_type_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'fail',
            message: 'Tipo di spazio non trovato'
        });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

