// src/backend/routes/userRoutes.js
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestione utenti e autenticazione
 */

const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { registerValidation, loginValidation, updateProfileValidation } = require('../middleware/validators/authValidator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            status: 'fail',
            message: 'Dati non validi',
            errors: errors.array() 
        });
    }
    next();
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // Limita a 5 richieste per IP
    message: {
        status: 'error',
        message: 'Troppi tentativi di accesso. Riprova tra 15 minuti.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Registrazione di un nuovo utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - surname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario.rossi@email.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: Mario
 *               surname:
 *                 type: string
 *                 example: Rossi
 *               phoneNumber:
 *                 type: string
 *                 example: +39 123 456 7890
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT token per autenticazione
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Utente già esistente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Registrazione utente
router.post('/register', registerValidation, validateRequest, userController.register);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario.rossi@email.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT token per autenticazione
 *       401:
 *         description: Credenziali non valide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Troppi tentativi di login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Login utente
router.post('/login', loginLimiter, loginValidation, validateRequest, userController.login);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Ottieni profilo utente corrente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profilo utente recuperato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Profilo utente (protetto)
router.get('/profile', authMiddleware.protect, userController.getProfile);

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Logout utente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: 'Logout effettuato con successo'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Logout utente (protetto)
router.post('/logout', authMiddleware.protect, userController.logout);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Aggiorna profilo utente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Mario'
 *               surname:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Rossi'
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: 'mario.rossi.new@email.com'
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email già in uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Aggiornamento profilo utente (protetto)
router.put('/profile', authMiddleware.protect, updateProfileValidation, validateRequest, userController.updateProfile);

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Cambia password utente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Password attuale
 *                 example: 'oldpassword123'
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Nuova password (minimo 6 caratteri)
 *                 example: 'newpassword456'
 *               confirmPassword:
 *                 type: string
 *                 description: Conferma nuova password
 *                 example: 'newpassword456'
 *     responses:
 *       200:
 *         description: Password cambiata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: 'Password aggiornata con successo'
 *       400:
 *         description: Dati non validi o password non coincidenti
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Password attuale non corretta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Cambio password (protetto)
router.put('/change-password', authMiddleware.protect, userController.changePassword);

module.exports = router;