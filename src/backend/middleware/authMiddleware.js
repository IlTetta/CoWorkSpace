// src/backend/middleware/authMiddlewareMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Middleware per proteggere le rotte con JWT
exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // Controlla se il token è presente e ha i formato corretto
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('Non sei loggato!', 401));
    }

    // Verifica il token e decodifica l'ID utente
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
    // Controlla se l'utente esiste ancora nel database
    const result = await db.query(
       'SELECT user_id, email, role FROM users WHERE user_id = $1',
        [decoded.id]
    );

    if (result.rows.length === 0) {
        return next(new AppError('L\'utente non esiste più!', 401));
    }

    // Collega l'utente all'oggetto richiesta per i middleware successivi    
    req.user = result.rows[0];
    next();    
});

// Middleware per autorizzare l'accesso in base al ruolo
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('Non hai il permesso per accedere a questa risorsa!', 403));
        }
        next();
    };
};