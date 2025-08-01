const exrpess = require('express');
const router = exrpess.Router();
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/auth');

// Rotta pubblica: ottenere la disponibilità di uno spazio per data
router.get('/', availabilityController.getSpaceAvailability);

// Rotta protetta: per aggiungere/modificare/eliminare blocchi di disponibilità
router.post('/', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.createAvailability);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.updateAvailability);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), availabilityController.deleteAvailability);

module.exports = router;