// src/backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// ROUTES PUBBLICHE (senza autenticazione)
// ============================================================================

/**
 * GET /api/public/bookings/space/:spaceId/availability
 * Informazioni base disponibilità spazio (pubblico)
 */
router.get('/public/space/:spaceId/availability', 
    BookingController.getPublicAvailability
);

/**
 * POST /api/bookings/check-availability
 * Verifica disponibilità spazio per periodo specifico (pubblico)
 */
router.post('/check-availability', BookingController.checkAvailability);

/**
 * POST /api/bookings/calculate-price
 * Calcola prezzo prenotazione per periodo specifico (pubblico)
 */
router.post('/calculate-price', BookingController.calculatePrice);

// ============================================================================
// MIDDLEWARE DI AUTENTICAZIONE
// ============================================================================
// Tutte le route seguenti richiedono autenticazione
router.use(authMiddleware.protect);

// ============================================================================
// ROUTES GENERALI (utenti autenticati)
// ============================================================================

/**
 * GET /api/bookings
 * Lista prenotazioni filtrate per ruolo utente
 * - User: Solo proprie prenotazioni
 * - Manager: Prenotazioni delle proprie location
 * - Admin: Tutte le prenotazioni
 */
router.get('/', BookingController.getBookings);

/**
 * GET /api/bookings/:id
 * Dettagli prenotazione specifica (con controlli autorizzazione)
 */
router.get('/:id', BookingController.getBookingById);

/**
 * POST /api/bookings
 * Crea nuova prenotazione
 * - User: Solo per se stesso
 * - Manager/Admin: Per qualsiasi utente
 */
router.post('/', BookingController.createBooking);

/**
 * PUT /api/bookings/:id
 * Aggiorna prenotazione completa (con controlli autorizzazione)
 */
router.put('/:id', BookingController.updateBooking);

/**
 * DELETE /api/bookings/:id
 * Elimina prenotazione (con controlli autorizzazione)
 */
router.delete('/:id', BookingController.deleteBooking);

// ============================================================================
// ROUTES UTILITY (utenti autenticati)
// ============================================================================

// Nessun endpoint utility richiede autenticazione per ora

// ============================================================================
// ROUTES MANAGER/ADMIN (autorizzazione elevata)
// ============================================================================

/**
 * GET /api/bookings/dashboard
 * Dashboard statistiche prenotazioni per manager/admin
 */
router.get('/dashboard', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.getBookingsDashboard
);

/**
 * PATCH /api/bookings/:id/status
 * Aggiorna solo status prenotazione (manager/admin)
 */
router.patch('/:id/status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updateBookingStatus
);

/**
 * PATCH /api/bookings/:id/payment-status
 * Aggiorna solo payment_status prenotazione (manager/admin)
 */
router.patch('/:id/payment-status', 
    authMiddleware.authorize('manager', 'admin'),
    BookingController.updatePaymentStatus
);

module.exports = router;