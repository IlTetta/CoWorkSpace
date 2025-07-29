const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

// Routg for user registration
router.post('/register', userController.register);
// Route for user login
router.post('/login', userController.login);
// Route to get user profile, protected by auth middleware
router.get('/profile', authMiddleware.protect, userController.getProfile);

module.exports = router;