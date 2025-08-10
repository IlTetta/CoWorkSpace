// src/backend/routes/bookingRoutes.js
/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Gestione delle prenotazioni
 */

const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// ROUTES PUBBLICHE (senza autenticazione)
// ============================================================================

/**
 * GET /api/public/bookings/space/:spaceId/availability
 * Informazioni base disponibilità spazio (pubblico)
 */
router.get('/public/space/:spaceId/availability', 
    BookingController.getPublicAvailability
);

/**
 * @swagger
 * /bookings/check-availability:
 *   post:
 *     summary: Verifica disponibilità di uno spazio
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - space_id
 *               - booking_date
 *               - start_time
 *               - end_time
 *             properties:
 *               space_id:
 *                 type: integer
 *                 description: ID dello spazio
 *                 example: 1
 *               booking_date:
 *                 type: string
 *                 format: date
 *                 description: Data della prenotazione
 *                 example: '2024-01-20'
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di inizio
 *                 example: '09:00:00'
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di fine
 *                 example: '17:00:00'
 *     responses:
 *       200:
 *         description: Risultato verifica disponibilità
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
 *                         available:
 *                           type: boolean
 *                           description: Se lo spazio è disponibile
 *                         conflictingBookings:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Booking'
 *                           description: Prenotazioni in conflitto (se presenti)
 *       400:
 *         description: Parametri non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/bookings/check-availability
 * Verifica disponibilità spazio per periodo specifico (pubblico)
 */
router.post('/check-availability', BookingController.checkAvailability);

/**
 * POST /api/bookings/calculate-price
 * Calcola prezzo prenotazione per periodo specifico (pubblico)
 */
router.post('/calculate-price', BookingController.calculatePrice);

// ============================================================================
// MIDDLEWARE DI AUTENTICAZIONE
// ============================================================================
// Tutte le route seguenti richiedono autenticazione
router.use(authMiddleware.protect);

// ============================================================================
// ROUTES GENERALI (utenti autenticati)
// ============================================================================

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Ottieni lista delle prenotazioni
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filtra per stato
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di inizio per filtro periodo
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di fine per filtro periodo
 *       - in: query
 *         name: spaceId
 *         schema:
 *           type: integer
 *         description: Filtra per spazio
 *     responses:
 *       200:
 *         description: Lista delle prenotazioni
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
 *                         bookings:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Booking'
 *                         totalCount:
 *                           type: integer
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crea una nuova prenotazione
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - space_id
 *               - booking_date
 *               - start_time
 *               - end_time
 *             properties:
 *               space_id:
 *                 type: integer
 *                 description: ID dello spazio da prenotare
 *                 example: 1
 *               booking_date:
 *                 type: string
 *                 format: date
 *                 description: Data della prenotazione
 *                 example: '2024-01-20'
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di inizio
 *                 example: '09:00:00'
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di fine
 *                 example: '17:00:00'
 *               notes:
 *                 type: string
 *                 description: Note aggiuntive
 *                 example: 'Richiesta accesso anticipato'
 *               additionalServices:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: ID dei servizi aggiuntivi
 *                 example: [1, 2]
 *     responses:
 *       201:
 *         description: Prenotazione creata con successo
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
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Dati non validi o spazio non disponibile
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
/**
 * GET /api/bookings
 * Lista prenotazioni filtrate per ruolo utente
 * - User: Solo proprie prenotazioni
 * - Manager: Prenotazioni delle proprie location
 * - Admin: Tutte le prenotazioni
 */
router.get('/', BookingController.getBookings);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Ottieni dettagli di una prenotazione specifica
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della prenotazione
 *     responses:
 *       200:
 *         description: Dettagli della prenotazione
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
 *                         booking:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Booking'
 *                             - type: object
 *                               properties:
 *                                 user:
 *                                   $ref: '#/components/schemas/User'
 *                                 space:
 *                                   $ref: '#/components/schemas/Space'
 *                                 payment:
 *                                   $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Prenotazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Aggiorna una prenotazione completa
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della prenotazione
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               booking_date:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-21'
 *               start_time:
 *                 type: string
 *                 format: time
 *                 example: '10:00:00'
 *               end_time:
 *                 type: string
 *                 format: time
 *                 example: '16:00:00'
 *               status:
 *                 type: string
 *                 enum: [confirmed, pending, cancelled, completed]
 *                 example: 'confirmed'
 *     responses:
 *       200:
 *         description: Prenotazione aggiornata con successo
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
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Dati non validi o conflitto di disponibilità
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
 *       403:
 *         description: Accesso negato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Prenotazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Elimina una prenotazione
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della prenotazione
 *     responses:
 *       200:
 *         description: Prenotazione eliminata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Prenotazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/bookings/:id
 * Dettagli prenotazione specifica (con controlli autorizzazione)
 */
router.get('/:id', BookingController.getBookingById);

/**
 * POST /api/bookings
 * Crea nuova prenotazione
 * - User: Solo per se stesso
 * - Manager/Admin: Per qualsiasi utente
 */
router.post('/', BookingController.createBooking);

/**
 * PUT /api/bookings/:id
 * Aggiorna prenotazione completa (con controlli autorizzazione)
 */
router.put('/:id', BookingController.updateBooking);

/**
 * DELETE /api/bookings/:id
 * Elimina prenotazione (con controlli autorizzazione)
 */
router.delete('/:id', BookingController.deleteBooking);

// ============================================================================
// ROUTES UTILITY (utenti autenticati)
// ============================================================================

// Nessun endpoint utility richiede autenticazione per ora

// ============================================================================
// ROUTES MANAGER/ADMIN (autorizzazione elevata)
// ============================================================================

/**
 * GET /api/bookings/dashboard
 * Dashboard statistiche prenotazioni per manager/admin
 */
router.get('/dashboard', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.getBookingsDashboard
);

/**
 * PATCH /api/bookings/:id/status
 * Aggiorna solo status prenotazione (manager/admin)
 */
router.patch('/:id/status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updateBookingStatus
);

/**
 * PATCH /api/bookings/:id/payment-status
 * Aggiorna solo payment_status prenotazione (manager/admin)
 */
router.patch('/:id/payment-status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updatePaymentStatus
);

module.exports = router;