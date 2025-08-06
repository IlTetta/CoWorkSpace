const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

router.get('/', spaceController.getAllSpaces); // Permette di filtrare per location_id, space_type_id 
router.get('/:id', spaceController.getSpaceById);

router.post('/', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), spaceController.createSpace);
router.put('/:id', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), spaceController.updateSpace);
router.delete('/:id', authMiddleware.protect, authMiddleware.authorize('admin'), spaceController.deleteSpace);

router.get('/list', spaceController.getSpacesList); 
router.get('/:id/details', spaceController.getSpaceDetails); 
router.get('/:id/booking', bookingController.getBookingsBySpaceId); 

module.exports = router;