/**
 * @swagger
 * tags:
 *   name: SpaceTypes
 *   description: Gestione dei tipi di spazio
 */

const express = require('express');
const router = express.Router();
const spaceTypeController = require('../controllers/spaceTypeController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /space-types:
 *   get:
 *     summary: Ottieni tutti i tipi di spazio
 *     tags: [SpaceTypes]
 *     responses:
 *       200:
 *         description: Lista dei tipi di spazio
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
 *                         spaceTypes:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SpaceType'
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crea un nuovo tipo di spazio
 *     tags: [SpaceTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type_name
 *             properties:
 *               type_name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Sala riunioni'
 *               description:
 *                 type: string
 *                 example: 'Sala per meeting e presentazioni con proiettore'
 *     responses:
 *       201:
 *         description: Tipo di spazio creato con successo
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
 *                         spaceType:
 *                           $ref: '#/components/schemas/SpaceType'
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
router.get('/', spaceTypeController.getAllSpaceTypes);
/**
 * @swagger
 * /space-types/{id}:
 *   get:
 *     summary: Ottieni un tipo di spazio specifico
 *     tags: [SpaceTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo di spazio
 *     responses:
 *       200:
 *         description: Dettagli del tipo di spazio
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
 *                         spaceType:
 *                           $ref: '#/components/schemas/SpaceType'
 *       404:
 *         description: Tipo di spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Aggiorna un tipo di spazio
 *     tags: [SpaceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo di spazio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type_name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Sala riunioni aggiornata'
 *               description:
 *                 type: string
 *                 example: 'Descrizione aggiornata'
 *     responses:
 *       200:
 *         description: Tipo di spazio aggiornato con successo
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
 *                         spaceType:
 *                           $ref: '#/components/schemas/SpaceType'
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
 *         description: Tipo di spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Elimina un tipo di spazio
 *     tags: [SpaceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo di spazio
 *     responses:
 *       200:
 *         description: Tipo di spazio eliminato con successo
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
 *         description: Accesso negato (solo manager/admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tipo di spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', spaceTypeController.getSpaceTypeById);
router.post('/', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), spaceTypeController.createSpaceType);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), spaceTypeController.updateSpaceType);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), spaceTypeController.deleteSpaceType);

module.exports = router;