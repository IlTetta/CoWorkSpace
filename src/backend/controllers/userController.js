const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Gestore errori
const catchAsync = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

exports.register = catchAsync(async (req, res, next) => {
    const {name, surname, email,  password, role} = req.body;

    if(!name || !surname || !email || !password || !role) {
        return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
    }

    // Hashing della password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    try{
        const result = await pool.query(
           `INSERT INTO users (name, surname, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role`,
           [name, surname, email, password_hash, role] 
        );

        const newUser = result.rows[0];

        // Genera JWT
        const token = jwt.sign(
            { id: newUser.user_id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Registrazione avvenuta con successo.',
            token,
            user: {
                id: newUser.user_id,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        if (error.code === '23505'){ // Unique violation
            return res.status(409).json({ message: 'Email già registrata.' });
        }
        next(error); // Passa l'errore al middleware di gestione degli errori
    }
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e password sono obbligatori.' });
    }

    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    const user = result.rows[0];

    if(!user) {
        return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    // Verifica la password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    // Genera JWT
    const token = jwt.sign(
        { id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.status(200).json({
        message: 'Login avvenuto con successo.',
        token,
        user: {
            id: user.user_id,
            email: user.email,
            role: user.role
        }
    });
});

exports.getProfile = catchAsync(async (req, res, next) => {
    // L'ID utente è disponibile in req.user.id grazie al middleware di autenticazione
    const result = await pool.query(
        'SELECT user_id, name, surname, email, role FROM users WHERE user_id = $1',
        [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
        return res.status(404).json({ message: 'Utente non trovato.' });
    }

    res.status(200).json({user});
});
