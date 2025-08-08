const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Route per la gestione degli spazi
 * Organizzate seguendo il pattern:
 * - Public endpoints (non autenticati)
 * - Protected endpoints (autenticati)
 * - Manager endpoints (manager/admin)
 * - Admin endpoints (solo admin)
 */

// ============================================================================
// PUBLIC ROUTES - Non richiedono autenticazione
// ============================================================================

// Lista spazi (con filtri opzionali)
router.get('/', spaceController.getSpaces);

// Ricerca spazi disponibili
router.get('/search/available', spaceController.searchAvailableSpaces);

// Verifica disponibilità spazio
router.post('/availability/check', spaceController.checkSpaceAvailability);

// Calcola prezzo prenotazione
router.post('/pricing/calculate', spaceController.calculateBookingPrice);

// Dettagli spazio specifico (DEVE essere dopo le route con path specifici)
router.get('/:id', spaceController.getSpaceById);

// ============================================================================
// PROTECTED ROUTES - Richiedono autenticazione
// ============================================================================

// Crea nuovo spazio (solo manager/admin)
router.post('/', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.createSpace
);

// Aggiorna spazio (solo manager/admin)
router.put('/:id', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.updateSpace
);

// Elimina spazio (solo admin)
router.delete('/:id', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.deleteSpace
);

// Lista spazi posseduti dall'utente
router.get('/user/owned', 
  authMiddleware.protect, 
  spaceController.getUserOwnedSpaces
);

// ============================================================================
// MANAGER ROUTES - Richiedono ruolo manager o admin
// ============================================================================

// Dashboard per manager
router.get('/dashboard/manager', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.getManagerDashboard
);

// Statistiche per manager
router.get('/statistics/manager', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.getManagerStatistics
);

// Aggiornamento bulk dello status degli spazi
router.post('/bulk/status', 
  authMiddleware.protect, 
  authMiddleware.authorize('manager', 'admin'), 
  spaceController.bulkUpdateSpaceStatus
);

// ============================================================================
// ADMIN ROUTES - Richiedono ruolo admin
// ============================================================================

// Lista completa per admin
router.get('/admin/all', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.getAdminSpacesList
);

// Dashboard completa per admin
router.get('/admin/dashboard', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.getAdminDashboard
);

// Assegnazione bulk spazi a location
router.post('/admin/bulk/assign', 
  authMiddleware.protect, 
  authMiddleware.authorize('admin'), 
  spaceController.bulkAssignSpacesToLocation
);

module.exports = router;