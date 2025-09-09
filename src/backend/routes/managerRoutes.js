// src/backend/routes/managerRoutes.js
/**
 * Routes Manager - Implementa ROLE_REDESIGN.md
 * Responsabile operativo di una o più sedi con controllo completo
 */

const express = require('express');
const managerController = require('../controllers/managerController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware: tutte le route richiedono autenticazione
router.use(authMiddleware.protect);

/**
 * @swagger
 * /api/manager/dashboard:
 *   get:
 *     summary: Dashboard operativa completa del manager
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard con statistiche delle location gestite
 */
router.get('/dashboard', managerController.getDashboard);

// ============================================================================
// GESTIONE SPAZI - CRUD completo
// ============================================================================

/**
 * @swagger
 * /api/manager/spaces:
 *   get:
 *     summary: Ottieni tutti gli spazi delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Crea nuovo spazio
 *     tags: [Manager]
 */
router.route('/spaces')
  .get(managerController.getMySpaces)
  .post(managerController.createSpace);

/**
 * @swagger
 * /api/manager/spaces/{spaceId}:
 *   put:
 *     summary: Aggiorna spazio
 *     tags: [Manager]
 *   delete:
 *     summary: Elimina spazio
 *     tags: [Manager]
 */
router.route('/spaces/:spaceId')
  .put(managerController.updateSpace)
  .delete(managerController.deleteSpace);

// ============================================================================
// GESTIONE ORARI E DISPONIBILITÀ
// ============================================================================

/**
 * @swagger
 * /api/manager/spaces/{spaceId}/availability:
 *   post:
 *     summary: Imposta disponibilità spazio per data specifica
 *     tags: [Manager]
 */
router.post('/spaces/:spaceId/availability', managerController.updateSpaceAvailability);

/**
 * @swagger
 * /api/manager/spaces/{spaceId}/hours:
 *   put:
 *     summary: Imposta orari di apertura e giorni disponibili
 *     tags: [Manager]
 */
router.put('/spaces/:spaceId/hours', managerController.setSpaceHours);

// ============================================================================
// GESTIONE PRENOTAZIONI - TUTTE le prenotazioni delle proprie sedi
// ============================================================================

/**
 * @swagger
 * /api/manager/bookings:
 *   get:
 *     summary: Tutte le prenotazioni delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Crea prenotazione per cliente (assistenza)
 *     tags: [Manager]
 */
router.route('/bookings')
  .get(managerController.getAllMyBookings)
  .post(managerController.createBookingForClient);

/**
 * @swagger
 * /api/manager/bookings/{bookingId}:
 *   put:
 *     summary: Modifica prenotazione (per assistenza clienti)
 *     tags: [Manager]
 */
router.put('/bookings/:bookingId', managerController.updateBooking);

// ============================================================================
// GESTIONE PAGAMENTI - TUTTI i pagamenti delle proprie sedi
// ============================================================================

/**
 * @swagger
 * /api/manager/payments:
 *   get:
 *     summary: Tutti i pagamenti delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Processa pagamento per cliente (contanti, ecc)
 *     tags: [Manager]
 */
router.route('/payments')
  .get(managerController.getAllMyPayments)
  .post(managerController.processClientPayment);

/**
 * @swagger
 * /api/manager/payments/{paymentId}:
 *   put:
 *     summary: Aggiorna stato pagamento
 *     tags: [Manager]
 */
router.put('/payments/:paymentId', managerController.updatePayment);

module.exports = router;
