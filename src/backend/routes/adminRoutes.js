// src/backend/routes/adminRoutes.js
/**
 * Routes Admin complete - ROLE_REDESIGN.md compliant
 * Controllo completo sistema: utenti, location, override manager
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const AuthService = require('../services/AuthService');

const router = express.Router();

// Middleware per tutte le route admin: richiede autenticazione e ruolo admin
router.use(AuthService.protect);
router.use(AuthService.authorize('admin'));

// ========================================
// DASHBOARD SISTEMA
// ========================================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Dashboard sistema completa per admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard', adminController.getSystemDashboard);

// ========================================
// GESTIONE UTENTI (CRUD completo)
// ========================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Recupera tutti gli utenti del sistema
 *     tags: [Admin - Users]
 *   post:
 *     summary: Crea nuovo utente
 *     tags: [Admin - Users]
 */
router.route('/users')
    .get(adminController.getAllUsers)
    .post(adminController.createUser);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Recupera singolo utente
 *     tags: [Admin - Users]
 *   put:
 *     summary: Aggiorna utente
 *     tags: [Admin - Users]
 */
router.route('/users/:userId')
    .get(adminController.getUserById)
    .put(adminController.updateUser);

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Cambia ruolo utente
 *     tags: [Admin - Users]
 */
router.put('/users/:userId/role', adminController.updateUserRole);

// ========================================
// GESTIONE LOCATION (CRUD completo)
// ========================================

/**
 * @swagger
 * /api/admin/locations:
 *   get:
 *     summary: Recupera tutte le location del sistema
 *     tags: [Admin - Locations]
 *   post:
 *     summary: Crea nuova location
 *     tags: [Admin - Locations]
 */
router.route('/locations')
    .get(adminController.getAllLocations)
    .post(adminController.createLocation);

/**
 * @swagger
 * /api/admin/locations/{locationId}:
 *   put:
 *     summary: Aggiorna location
 *     tags: [Admin - Locations]
 *   delete:
 *     summary: Elimina location
 *     tags: [Admin - Locations]
 */
router.route('/locations/:locationId')
    .put(adminController.updateLocation)
    .delete(adminController.deleteLocation);

/**
 * @swagger
 * /api/admin/locations/{locationId}/assign-manager:
 *   post:
 *     summary: Assegna manager a location
 *     tags: [Admin - Locations]
 */
router.post('/locations/:locationId/assign-manager', adminController.assignManagerToLocation);

// ========================================
// OVERRIDE MANAGER - Admin può gestire tutto il sistema
// ========================================

/**
 * @swagger
 * /api/admin/spaces:
 *   get:
 *     summary: Recupera tutti gli spazi del sistema (override manager)
 *     tags: [Admin - Override]
 *   post:
 *     summary: Crea spazio in qualsiasi location (override manager)
 *     tags: [Admin - Override]
 */
router.route('/spaces')
    .get(adminController.getAllSpaces)
    .post(adminController.createSpace);

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: Recupera tutte le prenotazioni del sistema (override manager)
 *     tags: [Admin - Override]
 */
router.get('/bookings', adminController.getAllBookings);

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Recupera tutti i pagamenti del sistema (override manager)
 *     tags: [Admin - Override]
 */
router.get('/payments', adminController.getAllPayments);

module.exports = router;
