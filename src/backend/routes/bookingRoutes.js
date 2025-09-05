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

/**
 * POST /api/bookings/find-overlapping
 * Trova prenotazioni che si sovrappongono con un periodo specificato (pubblico)
 */
router.post('/find-overlapping', BookingController.findOverlappingBookings);

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

/**
 * @swagger
 * /bookings/space/{spaceId}/schedule:
 *   get:
 *     summary: Ottieni programma prenotazioni per uno spazio specifico
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di inizio del periodo
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di fine del periodo
 *     responses:
 *       200:
 *         description: Programma prenotazioni dello spazio
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
 *                         space:
 *                           $ref: '#/components/schemas/Space'
 *                         schedule:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               bookings:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Booking'
 *                               availableSlots:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     start_time:
 *                                       type: string
 *                                       format: time
 *                                     end_time:
 *                                       type: string
 *                                       format: time
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/space/:spaceId/schedule', BookingController.getSpaceSchedule);

/**
 * @swagger
 * /bookings/space/{spaceId}/slots:
 *   get:
 *     summary: Ottieni slot disponibili per uno spazio in una data specifica
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data per cui ottenere gli slot
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *         description: Durata desiderata in ore (per trovare slot compatibili)
 *     responses:
 *       200:
 *         description: Slot disponibili per la data specificata
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
 *                         space:
 *                           $ref: '#/components/schemas/Space'
 *                         date:
 *                           type: string
 *                           format: date
 *                         availableSlots:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               start_time:
 *                                 type: string
 *                                 format: time
 *                               end_time:
 *                                 type: string
 *                                 format: time
 *                               duration:
 *                                 type: number
 *                                 description: Durata in ore
 *                         occupiedSlots:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               start_time:
 *                                 type: string
 *                                 format: time
 *                               end_time:
 *                                 type: string
 *                                 format: time
 *                               booking_id:
 *                                 type: integer
 *       400:
 *         description: Data non valida
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
 *       404:
 *         description: Spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/space/:spaceId/slots', BookingController.getAvailableSlots);

/**
 * POST /api/bookings/find-overlapping
 * Trova prenotazioni che si sovrappongono a un periodo
 */
router.post('/find-overlapping', BookingController.findOverlappingBookings);

// ============================================================================
// ROUTES PER GESTIONE PAGAMENTI
// ============================================================================

/**
 * @swagger
 * /bookings/my-payments:
 *   get:
 *     summary: Ottieni i propri pagamenti (shortcut per utente corrente)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, unpaid, stats]
 *         description: Tipo di informazioni sui pagamenti richieste
 *         example: 'summary'
 *     responses:
 *       200:
 *         description: Informazioni sui pagamenti dell'utente corrente
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
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalAmount:
 *                               type: number
 *                               format: decimal
 *                               description: Importo totale da pagare
 *                             unpaidBookings:
 *                               type: integer
 *                               description: Numero di prenotazioni non pagate
 *                         payments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/my-payments', BookingController.getMyPayments);

/**
 * @swagger
 * /bookings/user/{userId}/payment-summary:
 *   get:
 *     summary: Ottieni riepilogo pagamenti per un utente specifico
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'utente
 *     responses:
 *       200:
 *         description: Riepilogo pagamenti dell'utente
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
 *                         userId:
 *                           type: integer
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                         paidAmount:
 *                           type: number
 *                           format: decimal
 *                         unpaidAmount:
 *                           type: number
 *                           format: decimal
 *                         totalBookings:
 *                           type: integer
 *                         unpaidBookings:
 *                           type: integer
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId/payment-summary', BookingController.getUserPaymentSummary);

/**
 * @swagger
 * /bookings/user/{userId}/unpaid:
 *   get:
 *     summary: Ottieni prenotazioni non pagate per un utente specifico
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'utente
 *     responses:
 *       200:
 *         description: Lista delle prenotazioni non pagate
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
 *                         userId:
 *                           type: integer
 *                         unpaidBookings:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Booking'
 *                               - type: object
 *                                 properties:
 *                                   space:
 *                                     $ref: '#/components/schemas/Space'
 *                         totalUnpaidAmount:
 *                           type: number
 *                           format: decimal
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId/unpaid', BookingController.getUserUnpaidBookings);

/**
 * @swagger
 * /bookings/user/{userId}/payment-stats:
 *   get:
 *     summary: Ottieni statistiche pagamenti per un utente specifico
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'utente
 *     responses:
 *       200:
 *         description: Statistiche pagamenti dell'utente
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
 *                         userId:
 *                           type: integer
 *                         totalSpent:
 *                           type: number
 *                           format: decimal
 *                         totalBookings:
 *                           type: integer
 *                         averageBookingValue:
 *                           type: number
 *                           format: decimal
 *                         paymentMethods:
 *                           type: object
 *                           properties:
 *                             credit_card:
 *                               type: number
 *                             paypal:
 *                               type: number
 *                             bank_transfer:
 *                               type: number
 *                             cash:
 *                               type: number
 *                         monthlySpending:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                                 format: decimal
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId/payment-stats', BookingController.getUserPaymentStats);

// ============================================================================
// ROUTES UTILITY (utenti autenticati)
// ============================================================================

// Nessun endpoint utility richiede autenticazione per ora

// ============================================================================
// ROUTES MANAGER/ADMIN (autorizzazione elevata)
// ============================================================================

/**
 * @swagger
 * /bookings/dashboard:
 *   get:
 *     summary: Dashboard statistiche prenotazioni (Manager/Admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di inizio per periodo statistiche
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di fine per periodo statistiche
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: ID location per filtrare statistiche (solo admin)
 *     responses:
 *       200:
 *         description: Dashboard con statistiche delle prenotazioni
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
 *                         totalBookings:
 *                           type: integer
 *                           description: Numero totale di prenotazioni
 *                         totalRevenue:
 *                           type: number
 *                           format: decimal
 *                           description: Ricavi totali
 *                         bookingsByStatus:
 *                           type: object
 *                           properties:
 *                             confirmed:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *                             cancelled:
 *                               type: integer
 *                             completed:
 *                               type: integer
 *                         topSpaces:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               space:
 *                                 $ref: '#/components/schemas/Space'
 *                               bookingCount:
 *                                 type: integer
 *                               revenue:
 *                                 type: number
 *                                 format: decimal
 *                         monthlyTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *                               revenue:
 *                                 type: number
 *                                 format: decimal
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (richiede ruolo Manager o Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.getBookingsDashboard
);

/**
 * @swagger
 * /bookings/{id}/status:
 *   patch:
 *     summary: Aggiorna solo lo stato di una prenotazione (Manager/Admin)
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, pending, cancelled, completed]
 *                 description: Nuovo stato della prenotazione
 *                 example: 'confirmed'
 *               cancellation_reason:
 *                 type: string
 *                 description: Motivo della cancellazione (obbligatorio se status = cancelled)
 *                 example: 'Richiesta del cliente'
 *     responses:
 *       200:
 *         description: Stato della prenotazione aggiornato con successo
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
 *         description: Stato non valido o transizione non consentita
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
 *         description: Accesso negato (richiede ruolo Manager o Admin)
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
router.patch('/:id/status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updateBookingStatus
);

/**
 * @swagger
 * /bookings/{id}/payment-status:
 *   patch:
 *     summary: Aggiorna solo lo stato del pagamento di una prenotazione (Manager/Admin)
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
 *             required:
 *               - payment_status
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *                 description: Nuovo stato del pagamento
 *                 example: 'paid'
 *               payment_notes:
 *                 type: string
 *                 description: Note sul pagamento
 *                 example: 'Pagamento confermato via bonifico'
 *     responses:
 *       200:
 *         description: Stato del pagamento aggiornato con successo
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
 *         description: Stato del pagamento non valido
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
 *         description: Accesso negato (richiede ruolo Manager o Admin)
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
router.patch('/:id/payment-status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updatePaymentStatus
);

module.exports = router;