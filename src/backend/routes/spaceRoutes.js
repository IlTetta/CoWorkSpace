/**
 * @swagger
 * tags:
 *   name: Spaces
 *   description: Gestione degli spazi coworking
 */

const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Route per la gestione degli spazi
 * Organizzate seguendo il pattern:
 * - Public endpoints (non autenticati)
 * - Protected endpoints (autenticati)
 * - Manager endpoints (manager/admin)
 * - Admin endpoints (solo admin)
 */

// ============================================================================
// PUBLIC ROUTES - Non richiedono autenticazione
// ============================================================================

/**
 * @swagger
 * /spaces:
 *   get:
 *     summary: Ottieni lista degli spazi
 *     tags: [Spaces]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filtra per location
 *       - in: query
 *         name: spaceTypeId
 *         schema:
 *           type: integer
 *         description: Filtra per tipo di spazio
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         description: Capacità minima richiesta
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: Prezzo minimo per ora
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: Prezzo massimo per ora
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtra per stato attivo
 *     responses:
 *       200:
 *         description: Lista degli spazi
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
 *                         spaces:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Space'
 *                         totalCount:
 *                           type: integer
 *                           description: Numero totale di spazi
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Lista spazi (con filtri opzionali)
router.get('/', spaceController.getSpaces);

/**
 * @swagger
 * /spaces/search/available:
 *   get:
 *     summary: Ricerca spazi disponibili per periodo
 *     tags: [Spaces]
 *     parameters:
 *       - in: query
 *         name: startDateTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data e ora di inizio periodo
 *         example: '2024-01-20T09:00:00Z'
 *       - in: query
 *         name: endDateTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data e ora di fine periodo
 *         example: '2024-01-20T17:00:00Z'
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filtra per location
 *       - in: query
 *         name: spaceTypeId
 *         schema:
 *           type: integer
 *         description: Filtra per tipo di spazio
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         description: Capacità minima richiesta
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prezzo massimo per ora
 *     responses:
 *       200:
 *         description: Lista spazi disponibili nel periodo specificato
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
 *                         availableSpaces:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Space'
 *                               - type: object
 *                                 properties:
 *                                   calculatedPrice:
 *                                     type: number
 *                                     format: decimal
 *                                     description: Prezzo calcolato per il periodo
 *                         searchCriteria:
 *                           type: object
 *                           properties:
 *                             startDateTime:
 *                               type: string
 *                               format: date-time
 *                             endDateTime:
 *                               type: string
 *                               format: date-time
 *                             totalHours:
 *                               type: number
 *       400:
 *         description: Parametri di ricerca non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Ricerca spazi disponibili
router.get('/search/available', spaceController.searchAvailableSpaces);

/**
 * @swagger
 * /spaces/availability/check:
 *   post:
 *     summary: Verifica disponibilità specifica di uno spazio
 *     tags: [Spaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - space_id
 *               - startDateTime
 *               - endDateTime
 *             properties:
 *               space_id:
 *                 type: integer
 *                 description: ID dello spazio da verificare
 *                 example: 1
 *               startDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Data e ora di inizio
 *                 example: '2024-01-20T09:00:00Z'
 *               endDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Data e ora di fine
 *                 example: '2024-01-20T17:00:00Z'
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
 *                         spaceInfo:
 *                           $ref: '#/components/schemas/Space'
 *                         conflictingBookings:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Booking'
 *                           description: Prenotazioni in conflitto (se presenti)
 *       400:
 *         description: Dati non validi
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
// Verifica disponibilità spazio
router.post('/availability/check', spaceController.checkSpaceAvailability);

/**
 * @swagger
 * /spaces/pricing/calculate:
 *   post:
 *     summary: Calcola prezzo per prenotazione spazio
 *     tags: [Spaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - space_id
 *               - startDateTime
 *               - endDateTime
 *             properties:
 *               space_id:
 *                 type: integer
 *                 description: ID dello spazio
 *                 example: 1
 *               startDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Data e ora di inizio
 *                 example: '2024-01-20T09:00:00Z'
 *               endDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Data e ora di fine
 *                 example: '2024-01-20T17:00:00Z'
 *               additionalServices:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: ID dei servizi aggiuntivi
 *                 example: [1, 2]
 *     responses:
 *       200:
 *         description: Calcolo prezzo completato
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
 *                         spacePrice:
 *                           type: number
 *                           format: decimal
 *                           description: Prezzo base dello spazio
 *                         servicesPrice:
 *                           type: number
 *                           format: decimal
 *                           description: Prezzo servizi aggiuntivi
 *                         totalPrice:
 *                           type: number
 *                           format: decimal
 *                           description: Prezzo totale
 *                         totalHours:
 *                           type: number
 *                           format: decimal
 *                           description: Numero totale di ore
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             hourlyRate:
 *                               type: number
 *                             additionalServices:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   service_id:
 *                                     type: integer
 *                                   service_name:
 *                                     type: string
 *                                   price:
 *                                     type: number
 *       400:
 *         description: Dati non validi
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
// Calcola prezzo prenotazione
router.post('/pricing/calculate', spaceController.calculateBookingPrice);

/**
 * @swagger
 * /spaces/{id}:
 *   get:
 *     summary: Ottieni dettagli di uno spazio specifico
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *     responses:
 *       200:
 *         description: Dettagli dello spazio
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
 *                           allOf:
 *                             - $ref: '#/components/schemas/Space'
 *                             - type: object
 *                               properties:
 *                                 location:
 *                                   $ref: '#/components/schemas/Location'
 *                                 spaceType:
 *                                   $ref: '#/components/schemas/SpaceType'
 *                                 additionalServices:
 *                                   type: array
 *                                   items:
 *                                     $ref: '#/components/schemas/AdditionalService'
 *       404:
 *         description: Spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Aggiorna uno spazio
 *     tags: [Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               space_name:
 *                 type: string
 *                 maxLength: 255
 *                 example: 'Stanza 102 Aggiornata'
 *               description:
 *                 type: string
 *                 example: 'Descrizione aggiornata'
 *               capacity:
 *                 type: integer
 *                 example: 6
 *               price_per_hour:
 *                 type: number
 *                 format: decimal
 *                 example: 18.00
 *               price_per_day:
 *                 type: number
 *                 format: decimal
 *                 example: 140.00
 *               location_id:
 *                 type: integer
 *                 example: 1
 *               space_type_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Spazio aggiornato con successo
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
 *       403:
 *         description: Accesso negato (solo manager/admin)
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
 *   delete:
 *     summary: Elimina uno spazio
 *     tags: [Spaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *     responses:
 *       200:
 *         description: Spazio eliminato con successo
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
 *         description: Accesso negato (solo admin)
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
// Dettagli spazio specifico (DEVE essere dopo le route con path specifici)
router.get('/:id', spaceController.getSpaceById);

// ============================================================================
// PROTECTED ROUTES - Richiedono autenticazione
// ============================================================================

/**
 * @swagger
 * /spaces:
 *   post:
 *     summary: Crea un nuovo spazio (Manager/Admin)
 *     tags: [Spaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - space_name
 *               - location_id
 *               - space_type_id
 *               - capacity
 *               - hourly_rate
 *             properties:
 *               space_name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nome dello spazio
 *                 example: 'Sala Meeting Alpha'
 *               description:
 *                 type: string
 *                 description: Descrizione dello spazio
 *                 example: 'Sala meeting con lavagna interattiva e videoconferenza'
 *               location_id:
 *                 type: integer
 *                 description: ID della location
 *                 example: 1
 *               space_type_id:
 *                 type: integer
 *                 description: ID del tipo di spazio
 *                 example: 3
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Capacità massima dello spazio
 *                 example: 8
 *               hourly_rate:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Tariffa oraria
 *                 example: 25.00
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista degli amenities
 *                 example: ['Wi-Fi', 'Proiettore', 'Aria condizionata']
 *               is_active:
 *                 type: boolean
 *                 description: Se lo spazio è attivo
 *                 example: true
 *     responses:
 *       201:
 *         description: Spazio creato con successo
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
 *       403:
 *         description: Accesso negato (richiede ruolo Manager o Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Location o tipo spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Crea nuovo spazio (solo manager/admin)
router.post('/', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.createSpace
);

// Aggiorna spazio (solo manager/admin)
router.put('/:id', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.updateSpace
);

// Elimina spazio (solo admin)
router.delete('/:id', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.deleteSpace
);

// Lista spazi posseduti dall'utente
router.get('/user/owned', 
  authMiddleware.protect, 
  spaceController.getUserOwnedSpaces
);

// ============================================================================
// MANAGER ROUTES - Richiedono ruolo manager o admin
// ============================================================================

// Dashboard per manager
router.get('/dashboard/manager', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.getManagerDashboard
);

// Statistiche per manager
router.get('/statistics/manager', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.getManagerStatistics
);

// Aggiornamento bulk dello status degli spazi
router.post('/bulk/status', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.bulkUpdateSpaceStatus
);

// ============================================================================
// ADMIN ROUTES - Richiedono ruolo admin
// ============================================================================

// Lista completa per admin
router.get('/admin/all', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.getAdminSpacesList
);

// Dashboard completa per admin
router.get('/admin/dashboard', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.getAdminDashboard
);

// Assegnazione bulk spazi a location
router.post('/admin/bulk/assign', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.bulkAssignSpacesToLocation
);

module.exports = router;