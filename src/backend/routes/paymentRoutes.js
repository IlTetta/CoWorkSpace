const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

// Rotta per creare un pagamento (avviata dal frontend dopo la creazione della prenotazione)
router.post('/', authMiddleware.protect, authMiddleware.authorize('user'), paymentController.createPayment);

// Rotte per ottenere i pagamenti (un utente vede i suoi, manager/admin vedono tutti o della loro sede)
router.get('/', authMiddleware.protect, paymentController.getAllPayments);
router.get('/:id', authMiddleware.protect, paymentController.getPaymentById);

// Rotta per aggiornare lo stato di un pagamento (tramite webhook da gateway di pagamento, o manuale per admin)
router.put('/:id/status', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), paymentController.updatePaymentStatus);

// Non necessaria una rotta DELETE per i pagamenti, poiché sono record finanziari.
// In caso di errore, si cambia lo stato a 'failed' o 'refunded'.

module.exports = router;