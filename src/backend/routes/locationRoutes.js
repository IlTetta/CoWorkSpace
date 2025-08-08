const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotte pubbliche (senza autenticazione)
router.get('/search/available', locationController.searchAvailableLocations);
router.get('/alphabetical', locationController.getAllLocationsAlphabetically);
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Rotte protette - Dashboard manager
router.get('/dashboard/manager', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.getManagerDashboard
);

// Rotte protette - Statistiche location (prima di /:id/stats per evitare conflitti)
router.get('/:id/stats', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.getLocationStats
);

// Rotte protette - CRUD operations
router.post('/', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.createLocation
);

router.put('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('manager', 'admin'), 
    locationController.updateLocation
);

router.delete('/:id', 
    authMiddleware.protect, 
    authMiddleware.authorize('admin'), 
    locationController.deleteLocation
);

// Rotte protette - Trasferimento gestione (solo admin)
router.put('/:id/transfer', 
    authMiddleware.protect, 
    authMiddleware.authorize('admin'), 
    locationController.transferLocation
);

module.exports = router;