const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotte pubbliche per utenti
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Rotte protette (manager e/o admin)
router.post('/', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), locationController.createLocation);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), locationController.updateLocation);
// Solo admin può eliminare una location?
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), locationController.deleteLocation);

module.exports = router;