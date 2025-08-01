const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware.protect, authMiddleware.authorize('user', 'manager', 'admin'), bookingController.createBooking);

router.get('/', authMiddleware.protect, bookingController.getAllBookings); // Utente vede le sue, manager e admin vedono tutte
router.get('/:id', authMiddleware.protect, bookingController.getBookingById);

router.put('/:id/status', authMiddleware.protect, authMiddleware.authorize('manager', 'admin'), bookingController.updateBookingStatus);

router.delete('/:id', authMiddleware.protect, bookingController.deleteBooking); // Autorizzazione nel controller

module.exports = router;