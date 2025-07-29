const express = require('express');
const router = express.Router();
const spaceTypeController = require('../controllers/spaceTypeController');
const authMiddleware = require('../middleware/auth');

router.get('/', spaceTypeController.getAllSpaceTypes);
router.get('/:id', spaceTypeController.getSpaceTypeById);

router.post('/', authMiddleware.protect, spaceTypeController.authorize('manager', 'admin'), spaceTypeController.createSpaceType);
router.put('/:id', authMiddleware.protect, spaceTypeController.authorize('manager', 'admin'), spaceTypeController.updateSpaceType);
router.delete('/:id', authMiddleware.protect, spaceTypeController.authorize('manager', 'admin'), spaceTypeController.deleteSpaceType);

module.exports = router;