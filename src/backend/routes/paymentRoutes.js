// src/backend/routes/paymentRoutes.js
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestione dei pagamenti
 */

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// MIDDLEWARE DI AUTENTICAZIONE
// ============================================================================
// Tutte le route richiedono autenticazione
router.use(authMiddleware.protect);

// ============================================================================
// ROUTES GENERALI (utenti autenticati)
// ============================================================================

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Ottieni lista dei pagamenti
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, failed, refunded]
 *         description: Filtra per stato del pagamento
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [credit_card, paypal, bank_transfer, cash]
 *         description: Filtra per metodo di pagamento
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
 *     responses:
 *       200:
 *         description: Lista dei pagamenti (filtrata per ruolo utente)
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
 *                         payments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Payment'
 *                         totalCount:
 *                           type: integer
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crea un nuovo pagamento
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *               - amount
 *               - payment_method
 *             properties:
 *               booking_id:
 *                 type: integer
 *                 description: ID della prenotazione da pagare
 *                 example: 1
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Importo del pagamento
 *                 example: 124.00
 *               payment_method:
 *                 type: string
 *                 enum: [credit_card, paypal, bank_transfer, cash]
 *                 description: Metodo di pagamento
 *                 example: 'credit_card'
 *               transaction_id:
 *                 type: string
 *                 maxLength: 100
 *                 description: ID transazione del gateway esterno
 *                 example: 'txn_1234567890'
 *     responses:
 *       201:
 *         description: Pagamento creato con successo
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
 *                         payment:
 *                           $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Dati non validi o prenotazione già pagata
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
 *         description: Prenotazione non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/payments
 * Lista pagamenti filtrati per ruolo utente
 * - User: Solo propri pagamenti
 * - Manager: Pagamenti delle proprie location
 * - Admin: Tutti i pagamenti
 */
router.get('/', PaymentController.getPayments);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Ottieni dettagli di un pagamento specifico
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pagamento
 *     responses:
 *       200:
 *         description: Dettagli del pagamento
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
 *                         payment:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Payment'
 *                             - type: object
 *                               properties:
 *                                 booking:
 *                                   $ref: '#/components/schemas/Booking'
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
 *         description: Pagamento non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/payments/:id
 * Dettagli pagamento specifico (con controlli autorizzazione)
 */
router.get('/:id', PaymentController.getPaymentById);

/**
 * POST /api/payments
 * Crea nuovo pagamento
 * - Tutti gli utenti autenticati possono creare pagamenti per le proprie prenotazioni
 * - Manager/Admin possono creare pagamenti per qualsiasi prenotazione
 */
router.post('/', PaymentController.createPayment);

/**
 * @swagger
 * /payments/check-booking/{bookingId}:
 *   get:
 *     summary: Verifica se una prenotazione può essere pagata
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della prenotazione
 *     responses:
 *       200:
 *         description: Risultato verifica pagabilità
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
 *                         canPay:
 *                           type: boolean
 *                           description: Se la prenotazione può essere pagata
 *                         reason:
 *                           type: string
 *                           description: Motivo se non pagabile
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *                         existingPayment:
 *                           $ref: '#/components/schemas/Payment'
 *                           nullable: true
 *       401:
 *         description: Non autorizzato
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
 * GET /api/payments/check-booking/:bookingId
 * Verifica se una prenotazione può essere pagata
 */
router.get('/check-booking/:bookingId', PaymentController.checkBookingPayment);

// ============================================================================
// ROUTES MANAGER/ADMIN (autorizzazione elevata)
// ============================================================================

/**
 * @swagger
 * /payments/statistics:
 *   get:
 *     summary: Ottieni statistiche dei pagamenti (Manager/Admin)
 *     tags: [Payments]
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
 *         description: Statistiche dei pagamenti
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
 *                         totalRevenue:
 *                           type: number
 *                           format: decimal
 *                           description: Ricavi totali
 *                         totalPayments:
 *                           type: integer
 *                           description: Numero totale pagamenti
 *                         paymentsByStatus:
 *                           type: object
 *                           properties:
 *                             completed:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                             refunded:
 *                               type: integer
 *                         paymentsByMethod:
 *                           type: object
 *                           properties:
 *                             credit_card:
 *                               type: number
 *                               format: decimal
 *                             paypal:
 *                               type: number
 *                               format: decimal
 *                             bank_transfer:
 *                               type: number
 *                               format: decimal
 *                             cash:
 *                               type: number
 *                               format: decimal
 *                         monthlyRevenue:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
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
/**
 * GET /api/payments/statistics
 * Statistiche pagamenti per manager/admin
 */
router.get('/statistics', 
    authMiddleware.authorize('manager', 'admin'),
    PaymentController.getPaymentStatistics
);

/**
 * @swagger
 * /payments/{id}/status:
 *   patch:
 *     summary: Aggiorna stato di un pagamento (Manager/Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pagamento
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
 *                 enum: [completed, failed, refunded]
 *                 description: Nuovo stato del pagamento
 *                 example: 'refunded'
 *               refund_reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Motivo del rimborso (obbligatorio se status = refunded)
 *                 example: 'Cancellazione prenotazione per maltempo'
 *     responses:
 *       200:
 *         description: Stato pagamento aggiornato con successo
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
 *                         payment:
 *                           $ref: '#/components/schemas/Payment'
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
 *         description: Pagamento non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PATCH /api/payments/:id/status
 * Aggiorna solo status pagamento (manager/admin)
 */
router.patch('/:id/status', 
    authMiddleware.authorize('manager', 'admin'),
    PaymentController.updatePaymentStatus
);

/**
 * @swagger
 * /payments/{id}:
 *   delete:
 *     summary: Elimina un pagamento (Solo Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pagamento da eliminare
 *     responses:
 *       200:
 *         description: Pagamento eliminato con successo
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
 *                         deletedPaymentId:
 *                           type: integer
 *                           description: ID del pagamento eliminato
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
 *         description: Pagamento non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Impossibile eliminare pagamento (vincoli di integrità)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * DELETE /api/payments/:id
 * Elimina pagamento (solo admin - operazione sensibile)
 */
router.delete('/:id', 
    authMiddleware.authorize('admin'),
    PaymentController.deletePayment
);

module.exports = router;