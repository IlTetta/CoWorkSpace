const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const cathAsync = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Verifica che l'utente sia chi dice di essere
exports.protect = cathAsync(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Non sei loggato!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await pool.query(
            'SELECT user_id, email, role FROM users WHERE user_id = $1',
            [decoded.id]
        );
        req.user = result.rows[0];

        if(!req.user){
            return res.status(401).json({ message: 'L\'utente non esiste!' });
        }
        next();
    } catch (error){
        return res.status(401).json({ message: 'Token non valido o scaduto!' });
    }
});

// Controlla se l'utente ha i permessi per accedere a una risorsa
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Accesso negato!' });
        }
        next();
    };
};