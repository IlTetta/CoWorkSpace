/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Gestione delle location coworking
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Ottieni tutte le location
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtra per città
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtra per stato attivo
 *     responses:
 *       200:
 *         description: Lista delle location
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
 *                         locations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Location'
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /locations/search/available:
 *   get:
 *     summary: Ricerca location con spazi disponibili
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: startDateTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data e ora di inizio
 *         example: '2024-01-20T09:00:00Z'
 *       - in: query
 *         name: endDateTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data e ora di fine
 *         example: '2024-01-20T17:00:00Z'
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtra per città
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         description: Capacità minima richiesta
 *     responses:
 *       200:
 *         description: Location con spazi disponibili
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
 *                         locations:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Location'
 *                               - type: object
 *                                 properties:
 *                                   availableSpaces:
 *                                     type: array
 *                                     items:
 *                                       $ref: '#/components/schemas/Space'
 *                                   availableSpacesCount:
 *                                     type: integer
 *       400:
 *         description: Parametri non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /locations/filter:
 *   get:
 *     summary: Ottieni location con filtri avanzati e ordinamento
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtra per nome (ricerca parziale, case-insensitive)
 *         example: 'roma'
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtra per città (ricerca esatta, case-insensitive)
 *         example: 'Roma'
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, city, date]
 *           default: name
 *         description: Campo per ordinamento
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Ordine di ordinamento (asc = crescente, desc = decrescente)
 *     responses:
 *       200:
 *         description: Location filtrate e ordinate
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
 *                         locations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Location'
 *                         filters:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             city:
 *                               type: string
 *                         sorting:
 *                           type: object
 *                           properties:
 *                             sortBy:
 *                               type: string
 *                             sortOrder:
 *                               type: string
 *       400:
 *         description: Parametri non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /locations/alphabetical:
 *   get:
 *     summary: Ottieni location ordinate alfabeticamente
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtra per città
 *     responses:
 *       200:
 *         description: Location ordinate alfabeticamente
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
 *                         locations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Location'
 */
// Rotte pubbliche (senza autenticazione)
router.get('/search/available', locationController.searchAvailableLocations);
router.get('/filter', locationController.getFilteredLocations);
router.get('/alphabetical', locationController.getAllLocationsAlphabetically);
router.get('/', locationController.getAllLocations);
/**
 * @swagger
 * /locations/{location_id}:
 *   get:
 *     summary: Ottieni una location specifica
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: location_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numerico della location
 *     responses:
 *       200:
 *         description: Dettagli della location
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
 *       404:
 *         description: Location non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:location_id', locationController.getLocationById);

/**
 * @swagger
 * /locations/{location_id}/complete:
 *   get:
 *     summary: Ottieni informazioni complete di una location
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: location_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numerico della location
 *     responses:
 *       200:
 *         description: Informazioni complete della location
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
 *                         spaces:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               capacity:
 *                                 type: integer
 *                               pricePerHour:
 *                                 type: number
 *                               pricePerDay:
 *                                 type: number
 *                               spaceType:
 *                                 type: object
 *                               statistics:
 *                                 type: object
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             totalSpaces:
 *                               type: integer
 *                             totalBookings:
 *                               type: integer
 *                             totalRevenue:
 *                               type: number
 *                             monthlyRevenue:
 *                               type: array
 *                             topSpaces:
 *                               type: array
 *                         recentBookings:
 *                           type: array
 *                           items:
 *                             type: object
 *                         spaceTypes:
 *                           type: array
 *                           items:
 *                             type: object
 *                         availableServices:
 *                           type: array
 *                           items:
 *                             type: object
 *                         summary:
 *                           type: object
 *       404:
 *         description: Location non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (per manager che non gestiscono questa location)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:location_id/complete', locationController.getLocationCompleteInfo);

/**
 * @swagger
 * /locations/dashboard/manager:
 *   get:
 *     summary: Dashboard per manager delle location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard con dati delle location gestite dal manager
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
 *                         managedLocations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Location'
 *                         totalRevenue:
 *                           type: number
 *                           format: decimal
 *                         totalBookings:
 *                           type: integer
 *                         monthlyStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                               bookings:
 *                                 type: integer
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
// Rotte protette - Dashboard manager
router.get('/dashboard/manager', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.getManagerDashboard
);

/**
 * @swagger
 * /locations/{id}/stats:
 *   get:
 *     summary: Ottieni statistiche di una location specifica (Manager/Admin)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della location
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
 *     responses:
 *       200:
 *         description: Statistiche della location
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalSpaces:
 *                               type: integer
 *                             totalBookings:
 *                               type: integer
 *                             totalRevenue:
 *                               type: number
 *                               format: decimal
 *                             averageOccupancy:
 *                               type: number
 *                               format: decimal
 *                               description: Percentuale di occupazione media
 *                             topSpaces:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   space:
 *                                     $ref: '#/components/schemas/Space'
 *                                   bookingCount:
 *                                     type: integer
 *                                   revenue:
 *                                     type: number
 *                             monthlyTrends:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   month:
 *                                     type: string
 *                                   bookings:
 *                                     type: integer
 *                                   revenue:
 *                                     type: number
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
 *         description: Location non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rotte protette - Statistiche location (prima di /:id/stats per evitare conflitti)
router.get('/:id/stats', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.getLocationStats
);

// Rotte protette - CRUD operations
/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Crea una nuova location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_name
 *               - address
 *               - city
 *             properties:
 *               location_name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Nome della location
 *                 example: 'CoWork Roma Termini'
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Indirizzo completo
 *                 example: 'Via Giovanni Giolitti 34, Roma'
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: Città
 *                 example: 'Roma'
 *               description:
 *                 type: string
 *                 description: Descrizione della location
 *                 example: 'Spazio coworking moderno vicino alla stazione Termini'
 *               manager_id:
 *                 type: integer
 *                 description: ID del manager responsabile (opzionale)
 *                 example: 2
 *     responses:
 *       201:
 *         description: Location creata con successo
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
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
 */
router.post('/', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.createLocation
);

/**
 * @swagger
 * /locations/{id}:
 *   put:
 *     summary: Aggiorna una location esistente (Manager/Admin)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della location da aggiornare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location_name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nome della location
 *                 example: 'CoWork Roma Centro - Termini'
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Indirizzo completo
 *                 example: 'Via Nazionale 194, 00184 Roma RM'
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: Città
 *                 example: 'Roma'
 *               postal_code:
 *                 type: string
 *                 maxLength: 20
 *                 description: Codice postale
 *                 example: '00184'
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 description: Paese
 *                 example: 'Italia'
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *                 description: Numero di telefono
 *                 example: '+39 06 1234567'
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email di contatto
 *                 example: 'roma.termini@coworkspace.it'
 *               description:
 *                 type: string
 *                 description: Descrizione della location
 *                 example: 'Spazio coworking moderno vicino alla stazione Termini'
 *               manager_id:
 *                 type: integer
 *                 description: ID del manager responsabile
 *                 example: 2
 *     responses:
 *       200:
 *         description: Location aggiornata con successo
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
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
 *         description: Location non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Elimina una location (Solo Admin)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della location da eliminare
 *     responses:
 *       200:
 *         description: Location eliminata con successo
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
 *                         deletedLocationId:
 *                           type: integer
 *                           description: ID della location eliminata
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (richiede ruolo Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Location non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Impossibile eliminare location (contiene spazi attivi)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.updateLocation
);

router.delete('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('admin'), 
    locationController.deleteLocation
);

/**
 * @swagger
 * /locations/{id}/transfer:
 *   put:
 *     summary: Trasferisci gestione di una location a un altro manager (Solo Admin)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della location da trasferire
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_manager_id
 *             properties:
 *               new_manager_id:
 *                 type: integer
 *                 description: ID del nuovo manager (null per rimuovere il manager)
 *                 example: 5
 *               transfer_reason:
 *                 type: string
 *                 description: Motivo del trasferimento
 *                 example: 'Riorganizzazione aziendale'
 *               effective_date:
 *                 type: string
 *                 format: date
 *                 description: Data di effettivazione del trasferimento
 *                 example: '2024-02-01'
 *     responses:
 *       200:
 *         description: Location trasferita con successo
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
 *                         location:
 *                           $ref: '#/components/schemas/Location'
 *                         previousManager:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                         newManager:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                         transferredAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Dati non validi o nuovo manager non idoneo
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
 *         description: Accesso negato (richiede ruolo Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Location o nuovo manager non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rotte protette - Trasferimento gestione (solo admin)
router.put('/:id/transfer', 
    authMiddleware.protect, 
    authMiddleware.authorize('admin'), 
    locationController.transferLocation
);

module.exports = router;