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
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data per cui verificare la disponibilità
 *         required: true
 *         example: '2024-01-20'
 *     responses:
 *       200:
 *         description: Disponibilità dello spazio per la data specificata
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
 *                         spaceInfo:
 *                           type: object
 *                           properties:
 *                             space_id:
 *                               type: integer
 *                             space_name:
 *                               type: string
 *                             price_per_hour:
 *                               type: number
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
 *                 description: ID dello spazio
 *                 example: 1
 *               availability_date:
 *                 type: string
 *                 format: date
 *                 description: Data di disponibilità
 *                 example: '2024-01-20'
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di inizio disponibilità
 *                 example: '09:00:00'
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: Ora di fine disponibilità
 *                 example: '18:00:00'
 *               is_available:
 *                 type: boolean
 *                 description: Se lo spazio è disponibile
 *                 example: true
 *     responses:
 *       201:
 *         description: Disponibilità creata con successo
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
 *                           $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Dati non validi o conflitto con disponibilità esistente
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
// Rotta pubblica: ottenere la disponibilità di uno spazio per data
router.get('/', availabilityController.getSpaceAvailability);

// Rotta protetta: per aggiungere/modificare/eliminare blocchi di disponibilità
router.post('/', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.createAvailability);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.updateAvailability);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.deleteAvailability);

module.exports = router;