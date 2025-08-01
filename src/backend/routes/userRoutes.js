const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Router per la registrazione degli utenti
router.post('/register', userController.register);
// Router per il login degli utenti
router.post('/login', userController.login);
// Router per ottenere il profilo utente, protetto da middleware di autenticazione
router.get('/profile', authMiddleware.protect, userController.getProfile);

module.exports = router;