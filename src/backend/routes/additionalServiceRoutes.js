/**
 * @swagger
 * tags:
 *   name: AdditionalServices
 *   description: Gestione dei servizi aggiuntivi
 */

const express = require('express');
const router = express.Router();
const additionalServiceController = require('../controllers/additionalServiceController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /additional-services:
 *   get:
 *     summary: Ottieni tutti i servizi aggiuntivi
 *     tags: [AdditionalServices]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtra per servizi attivi
 *         example: true
 *     responses:
 *       200:
 *         description: Lista dei servizi aggiuntivi
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
 *                         services:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AdditionalService'
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crea un nuovo servizio aggiuntivo
 *     tags: [AdditionalServices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_name
 *               - price
 *             properties:
 *               service_name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nome del servizio
 *                 example: 'Catering colazione'
 *               description:
 *                 type: string
 *                 description: Descrizione del servizio
 *                 example: 'Colazione continentale con caffè e cornetti'
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: Prezzo del servizio
 *                 example: 12.50
 *               is_active:
 *                 type: boolean
 *                 description: Se il servizio è attivo
 *                 example: true
 *     responses:
 *       201:
 *         description: Servizio creato con successo
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
 *                         service:
 *                           $ref: '#/components/schemas/AdditionalService'
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
 *         description: Accesso negato (solo admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rotte pubbliche per vedere i servizi disponibili
router.get('/', additionalServiceController.getAllAdditionalServices);

/**
 * @swagger
 * /additional-services/{id}:
 *   get:
 *     summary: Ottieni dettagli di un servizio aggiuntivo specifico
 *     tags: [AdditionalServices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servizio aggiuntivo
 *     responses:
 *       200:
 *         description: Dettagli del servizio aggiuntivo
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
 *                         service:
 *                           $ref: '#/components/schemas/AdditionalService'
 *       404:
 *         description: Servizio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', additionalServiceController.getAdditionalServiceById);

// Rotte protette per la gestione dei servizi (solo admin)
router.post('/', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.createAdditionalService);

/**
 * @swagger
 * /additional-services/{id}:
 *   put:
 *     summary: Aggiorna un servizio aggiuntivo esistente (Solo Admin)
 *     tags: [AdditionalServices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servizio aggiuntivo da aggiornare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nome del servizio
 *                 example: 'Catering pranzo business'
 *               description:
 *                 type: string
 *                 description: Descrizione del servizio
 *                 example: 'Pranzo di lavoro per meeting aziendali'
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: Prezzo del servizio
 *                 example: 25.00
 *               is_active:
 *                 type: boolean
 *                 description: Se il servizio è attivo
 *                 example: true
 *     responses:
 *       200:
 *         description: Servizio aggiornato con successo
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
 *                         service:
 *                           $ref: '#/components/schemas/AdditionalService'
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
 *         description: Accesso negato (richiede ruolo Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Servizio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Elimina un servizio aggiuntivo (Solo Admin)
 *     tags: [AdditionalServices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servizio aggiuntivo da eliminare
 *     responses:
 *       200:
 *         description: Servizio eliminato con successo
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
 *                         deletedServiceId:
 *                           type: integer
 *                           description: ID del servizio eliminato
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
 *         description: Servizio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Impossibile eliminare servizio (in uso in prenotazioni)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.updateAdditionalService);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.deleteAdditionalService);

/**
 * @swagger
 * /additional-services/{serviceId}/spaces/{spaceId}:
 *   post:
 *     summary: Associa un servizio aggiuntivo a uno spazio (Manager/Admin)
 *     tags: [AdditionalServices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servizio aggiuntivo
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *     responses:
 *       201:
 *         description: Servizio associato allo spazio con successo
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
 *                         serviceId:
 *                           type: integer
 *                         spaceId:
 *                           type: integer
 *                         associatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Associazione già esistente
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
 *         description: Servizio o spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Rimuovi associazione servizio-spazio (Manager/Admin)
 *     tags: [AdditionalServices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servizio aggiuntivo
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *     responses:
 *       200:
 *         description: Associazione rimossa con successo
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
 *                         serviceId:
 *                           type: integer
 *                         spaceId:
 *                           type: integer
 *                         removedAt:
 *                           type: string
 *                           format: date-time
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
 *         description: Associazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rotte per associare/dissociare servizi a spazi (manager/admin)
router.post('/:serviceId/spaces/:spaceId', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), additionalServiceController.addServiceToSpace);
router.delete('/:serviceId/spaces/:spaceId', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), additionalServiceController.removeServiceFromSpace);

/**
 * @swagger
 * /additional-services/space/{spaceId}:
 *   get:
 *     summary: Ottieni tutti i servizi aggiuntivi associati a uno spazio
 *     tags: [AdditionalServices]
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dello spazio
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtra solo servizi attivi
 *         example: true
 *     responses:
 *       200:
 *         description: Lista dei servizi aggiuntivi per lo spazio
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
 *                         spaceId:
 *                           type: integer
 *                         services:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/AdditionalService'
 *                               - type: object
 *                                 properties:
 *                                   associatedAt:
 *                                     type: string
 *                                     format: date-time
 *                                     description: Quando il servizio è stato associato
 *       404:
 *         description: Spazio non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Errore del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Rotta per ottenere i servizi associati a uno specifico spazio
router.get('/space/:spaceId', additionalServiceController.getServicesBySpace);


module.exports = router;