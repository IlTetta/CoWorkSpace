const express = require('express');
const router = express.Router();
const additionalServiceController = require('../controllers/additionalServiceController');
const authMiddleware = require('../middleware/auth');

// Rotte pubbliche per vedere i servizi disponibili
router.get('/', additionalServiceController.getAllAdditionalServices);
router.get('/:id', additionalServiceController.getAdditionalServiceById);

// Rotte protette per la gestione dei servizi (solo admin)
router.post('/', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.createAdditionalService);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.updateAdditionalService);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), additionalServiceController.deleteAdditionalService);

// Rotte per associare/dissociare servizi a spazi (manager/admin)
router.post('/:serviceId/spaces/:spaceId', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), additionalServiceController.addServiceToSpace);
router.delete('/:serviceId/spaces/:spaceId', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), additionalServiceController.removeServiceFromSpace);

// Rotta per ottenere i servizi associati a uno specifico spazio
router.get('/space/:spaceId', additionalServiceController.getServicesBySpace);


module.exports = router;