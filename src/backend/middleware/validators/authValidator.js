// src/backend/middleware/validators/authValidator.js
const { body } = require('express-validator');

exports.registerValidation = [
    body('name').trim().notEmpty().withMessage('Nome obbligatorio.'),
    body('surname').trim().notEmpty().withMessage('Cognome obbligatorio.'),
    body('email').isEmail().withMessage('Email non valida.').normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('La password deve contenere almeno 8 caratteri.')
        .matches(/\d/).withMessage('La password deve contenere almeno un numero.')
        .matches(/[a-z]/).withMessage('La password deve contenere almeno una lettera minuscola.')
        .matches(/[A-Z]/).withMessage('La password deve contenere almeno una lettera maiuscola.')
        .matches(/[@$!%*?&]/).withMessage('La password deve contenere almeno un carattere speciale.'),
    body('role')
        .isIn(['user', 'manager', 'admin']).withMessage('Ruolo non valido')
];

exports.loginValidation = [
    body('email').isEmail().withMessage('Email non valida.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password obbligatoria.')
];

exports.updateProfileValidation = [
    body('name').optional().trim().notEmpty().withMessage('Nome non può essere vuoto.'),
    body('surname').optional().trim().notEmpty().withMessage('Cognome non può essere vuoto.'),
    body('email').optional().isEmail().withMessage('Email non valida.').normalizeEmail(),
];