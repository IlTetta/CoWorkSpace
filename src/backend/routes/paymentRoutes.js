// src/backend/routes/paymentRoutes.js
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
 * GET /api/payments
 * Lista pagamenti filtrati per ruolo utente
 * - User: Solo propri pagamenti
 * - Manager: Pagamenti delle proprie location
 * - Admin: Tutti i pagamenti
 */
router.get('/', PaymentController.getPayments);

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
 * GET /api/payments/check-booking/:bookingId
 * Verifica se una prenotazione può essere pagata
 */
router.get('/check-booking/:bookingId', PaymentController.checkBookingPayment);

// ============================================================================
// ROUTES MANAGER/ADMIN (autorizzazione elevata)
// ============================================================================

/**
 * GET /api/payments/statistics
 * Statistiche pagamenti per manager/admin
 */
router.get('/statistics', 
    authMiddleware.authorize('manager', 'admin'),
    PaymentController.getPaymentStatistics
);

/**
 * PATCH /api/payments/:id/status
 * Aggiorna solo status pagamento (manager/admin)
 */
router.patch('/:id/status', 
    authMiddleware.authorize('manager', 'admin'),
    PaymentController.updatePaymentStatus
);

/**
 * DELETE /api/payments/:id
 * Elimina pagamento (solo admin - operazione sensibile)
 */
router.delete('/:id', 
    authMiddleware.authorize('admin'),
    PaymentController.deletePayment
);

module.exports = router;