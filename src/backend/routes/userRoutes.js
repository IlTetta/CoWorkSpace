// src/backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { registerValidation, loginValidation, updateProfileValidation } = require('../middleware/validators/authValidator');const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // Limita a 5 richieste per IP
    message: 'Troppi tentativi di accesso. Riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Registrazione utente
router.post('/register', registerValidation, validateRequest, userController.register);

// Login utente
router.post('/login', loginLimiter, loginValidation, validateRequest, userController.login);

// Profilo utente (protetto)
router.get('/profile', authMiddleware.protect, userController.getProfile);

// Logout utente (protetto)
router.post('/logout', authMiddleware.protect, userController.logout);

// Aggiornamento profilo utente (protetto)
router.put('/profile', authMiddleware.protect, updateProfileValidation, validateRequest, userController.updateProfile);

module.exports = router;