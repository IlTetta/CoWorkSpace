/**
 * @swagger
 * tags:
 *   name: Availability
 *   description: Gestione della disponibilità degli spazi
 */

const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /availability:
 *   get:
 *     summary: Ottieni disponibilità degli spazi
 *     tags: [Availability]
 *     parameters:
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: integer
 *         description: ID dello spazio (obbligatorio)
 *         required: true
 *         example: 1
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di inizio periodo
 *         required: true
 *         example: '2024-01-20'
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data di fine periodo
 *         required: true
 *         example: '2024-01-27'
 *     responses:
 *       200:
 *         description: Disponibilità dello spazio per il periodo specificato
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
 *                         availability:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Parametri mancanti o non validi
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
router.get('/', availabilityController.getSpaceAvailability);

/**
 * @swagger
 * /availability/check:
 *   get:
 *     summary: Verifica disponibilità per una prenotazione
 *     tags: [Availability]
 *     parameters:
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *         required: true
 *       - in: query
 *         name: booking_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data della prenotazione
 *         required: true
 *       - in: query
 *         name: start_time
 *         schema:
 *           type: string
 *           format: time
 *         description: Ora di inizio
 *         required: true
 *       - in: query
 *         name: end_time
 *         schema:
 *           type: string
 *           format: time
 *         description: Ora di fine
 *         required: true
 *     responses:
 *       200:
 *         description: Risultato della verifica disponibilità
 */
router.get('/check', availabilityController.checkBookingAvailability);

/**
 * @swagger
 * /availability/statistics:
 *   get:
 *     summary: Ottieni statistiche sulla disponibilità
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: Statistiche sulla disponibilità
 */
router.get('/statistics', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.getAvailabilityStatistics
);

/**
 * @swagger
 * /availability:
 *   post:
 *     summary: Crea nuova disponibilità per uno spazio
 *     tags: [Availability]
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
 *               - availability_date
 *               - start_time
 *               - end_time
 *             properties:
 *               space_id:
 *                 type: integer
 *               availability_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *               is_available:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Disponibilità creata con successo
 */
router.post('/', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.createAvailability
);

/**
 * @swagger
 * /availability/generate:
 *   post:
 *     summary: Genera automaticamente la disponibilità per uno spazio
 *     tags: [Availability]
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
 *               - start_date
 *               - end_date
 *               - start_time
 *               - end_time
 *             properties:
 *               space_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *               exclude_days:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Disponibilità generate con successo
 */
router.post('/generate', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.generateAvailabilitySchedule
);

/**
 * @swagger
 * /availability/disable:
 *   post:
 *     summary: Disabilita un periodo di disponibilità
 *     tags: [Availability]
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
 *               - start_date
 *               - end_date
 *             properties:
 *               space_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Periodo disabilitato con successo
 */
router.post('/disable', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.disableAvailabilityPeriod
);

/**
 * @swagger
 * /availability/{id}:
 *   put:
 *     summary: Aggiorna un blocco di disponibilità
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *               is_available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Disponibilità aggiornata con successo
 */
router.put('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.updateAvailability
);

/**
 * @swagger
 * /availability/{id}:
 *   delete:
 *     summary: Elimina un blocco di disponibilità
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Disponibilità eliminata con successo
 */
router.delete('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    availabilityController.deleteAvailability
);

module.exports = router;