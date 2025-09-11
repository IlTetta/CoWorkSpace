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
 *                 minLength: 8
 *                 example: Password123!
 *               name:
 *                 type: string
 *                 example: Mario
 *               surname:
 *                 type: string
 *                 example: Rossi
 *               requestManagerRole:
 *                 type: boolean
 *                 default: false
 *                 description: Richiedi di diventare manager (l'utente non potrà fare login fino all'approvazione)
 *                 example: false
 *     responses:
 *       201:
 *         description: Utente registrato con successo (può fare login)
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
 *                         canLogin:
 *                           type: boolean
 *                           example: true
 *       202:
 *         description: Utente registrato, in attesa di approvazione manager (non può fare login)
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
 *                           nullable: true
 *                           example: null
 *                         canLogin:
 *                           type: boolean
 *                           example: false
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
 * /users/dashboard:
 *   get:
 *     summary: Ottieni dashboard utente con storico prenotazioni e pagamenti
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard utente recuperata con successo
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
 *                           type: object
 *                           properties:
 *                             user_id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: 'Mario'
 *                             surname:
 *                               type: string
 *                               example: 'Rossi'
 *                             email:
 *                               type: string
 *                               format: email
 *                               example: 'mario.rossi@email.com'
 *                             role:
 *                               type: string
 *                               example: 'user'
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             total_bookings:
 *                               type: integer
 *                               example: 15
 *                             completed_bookings:
 *                               type: integer
 *                               example: 12
 *                             confirmed_bookings:
 *                               type: integer
 *                               example: 2
 *                             cancelled_bookings:
 *                               type: integer
 *                               example: 1
 *                             total_spent:
 *                               type: number
 *                               format: decimal
 *                               example: 450.00
 *                             total_days_booked:
 *                               type: number
 *                               format: decimal
 *                               example: 15.0
 *                             locations_visited:
 *                               type: integer
 *                               example: 3
 *                             space_types_used:
 *                               type: integer
 *                               example: 4
 *                         bookings:
 *                           type: object
 *                           properties:
 *                             all:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   booking_id:
 *                                     type: integer
 *                                   booking_date:
 *                                     type: string
 *                                     format: date
 *                                   start_time:
 *                                     type: string
 *                                     format: time
 *                                   end_time:
 *                                     type: string
 *                                     format: date
 *                                   total_days:
 *                                     type: number
 *                                     format: decimal
 *                                   total_price:
 *                                     type: number
 *                                     format: decimal
 *                                   status:
 *                                     type: string
 *                                     enum: ['confirmed', 'pending', 'cancelled', 'completed']
 *                                   space_name:
 *                                     type: string
 *                                   location_name:
 *                                     type: string
 *                                   payment_status:
 *                                     type: string
 *                                     enum: ['completed', 'failed', 'refunded']
 *                             upcoming:
 *                               type: array
 *                               description: Prossime prenotazioni confermate
 *                             recent:
 *                               type: array
 *                               description: Ultime 5 prenotazioni
 *                             total:
 *                               type: integer
 *                         preferences:
 *                           type: object
 *                           properties:
 *                             top_locations:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   location_name:
 *                                     type: string
 *                                   city:
 *                                     type: string
 *                                   booking_count:
 *                                     type: integer
 *                             top_space_types:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   type_name:
 *                                     type: string
 *                                   booking_count:
 *                                     type: integer
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Dashboard utente (protetto)
router.get('/dashboard', authMiddleware.protect, userController.getDashboard);

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

/**
 * @swagger
 * /users/request-password-reset:
 *   post:
 *     summary: Richiede reset password (password dimenticata)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email dell'utente che vuole resettare la password
 *                 example: 'mario.rossi@email.com'
 *     responses:
 *       200:
 *         description: Richiesta di reset password inviata
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
 *                           example: "Se l'email è registrata, riceverai le istruzioni per il reset"
 *       400:
 *         description: Email non fornita
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Troppi tentativi di reset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Richiesta reset password (pubblica)
router.post('/request-password-reset', loginLimiter, userController.requestPasswordReset);

/**
 * @swagger
 * /users/initiate-password-change:
 *   post:
 *     summary: Inizia procedura cambio password dal profilo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Procedura cambio password iniziata
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
 *                         requiresPasswordReset:
 *                           type: boolean
 *                           example: true
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Inizia cambio password dal profilo (protetto)
router.post('/initiate-password-change', authMiddleware.protect, userController.initiatePasswordChange);

/**
 * @swagger
 * /users/fcm-token:
 *   post:
 *     summary: Salva il token FCM per le notifiche push
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
 *               fcm_token:
 *                 type: string
 *                 description: Il token FCM da salvare
 *                 example: 'fcm_token_example'
 *     responses:
 *       200:
 *         description: Token FCM salvato con successo
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
 *                           example: "Token FCM salvato con successo"
 *       400:
 *         description: Richiesta non valida
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
 */
router.post('/fcm-token', authMiddleware.protect, userController.saveFcmToken);

/**
 * @swagger
 * /users/check-email:
 *   get:
 *     summary: Verifica se un'email è già registrata
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email da verificare
 *         example: 'test@email.com'
 *     responses:
 *       200:
 *         description: Verifica email completata
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
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: 'test@email.com'
 *                         exists:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Email non fornita o formato non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Verifica esistenza email (pubblica)
router.get('/check-email', userController.checkEmailExists);

module.exports = router;