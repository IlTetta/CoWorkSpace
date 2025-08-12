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
router.get('/alphabetical', locationController.getAllLocationsAlphabetically);
router.get('/', locationController.getAllLocations);
/**
 * @swagger
 * /locations/{id}:
 *   get:
 *     summary: Ottieni una location specifica
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
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

// Rotte protette - Dashboard manager
router.get('/dashboard/manager', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.getManagerDashboard
);

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

// Rotte protette - Trasferimento gestione (solo admin)
router.put('/:id/transfer', 
    authMiddleware.protect, 
    authMiddleware.authorize('admin'), 
    locationController.transferLocation
);

module.exports = router;