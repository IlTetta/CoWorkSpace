// src/backend/routes/adminRoutes.js
/**
 * Routes Admin complete - ROLE_REDESIGN.md compliant
 * Controllo completo sistema: utenti, location, override manager
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware per tutte le route admin: richiede autenticazione e ruolo admin
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize('admin'));

// ========================================
// PROFILO ADMIN
// ========================================

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Profilo admin - Informazioni di base dell'admin corrente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', adminController.getAdminProfile);

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
 *     summary: Recupera tutti gli utenti del sistema con filtri avanzati
 *     tags: [Admin - Users]
 *     parameters:
 *       - name: role
 *         in: query
 *         description: Filtra per ruolo specifico (user, manager, admin)
 *         schema:
 *           type: string
 *           enum: [user, manager, admin]
 *       - name: name
 *         in: query
 *         description: Ricerca parziale per nome o cognome
 *         schema:
 *           type: string
 *       - name: email
 *         in: query
 *         description: Ricerca parziale per email
 *         schema:
 *           type: string
 *       - name: sort_by
 *         in: query
 *         description: Ordinamento (name_asc, name_desc, email_asc, email_desc, role_asc, role_desc, created_asc, created_desc)
 *         schema:
 *           type: string
 *           enum: [name_asc, name_desc, email_asc, email_desc, role_asc, role_desc, created_asc, created_desc]
 *       - name: limit
 *         in: query
 *         description: Limite numero risultati
 *         schema:
 *           type: integer
 *   post:
 *     summary: Crea nuovo utente
 *     tags: [Admin - Users]
 */
router.route('/users')
    .get(adminController.getAllUsers)
    .post(adminController.createUser);

/**
 * @swagger
 * /api/admin/managers:
 *   get:
 *     summary: Recupera tutti i manager del sistema
 *     tags: [Admin - Users]
 *     parameters:
 *       - name: name
 *         in: query
 *         description: Ricerca parziale per nome o cognome
 *         schema:
 *           type: string
 *       - name: sort_by
 *         in: query
 *         description: Ordinamento (default name_asc)
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Limite numero risultati
 *         schema:
 *           type: integer
 */
router.get('/managers', adminController.getAllManagers);

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
 *     summary: Recupera tutte le location del sistema con filtri avanzati
 *     tags: [Admin - Locations]
 *     parameters:
 *       - name: name
 *         in: query
 *         description: Ricerca parziale per nome location
 *         schema:
 *           type: string
 *       - name: city
 *         in: query
 *         description: Filtro per città specifica
 *         schema:
 *           type: string
 *       - name: manager_id
 *         in: query
 *         description: Filtro per manager specifico
 *         schema:
 *           type: integer
 *       - name: sort_by
 *         in: query
 *         description: Campo di ordinamento
 *         schema:
 *           type: string
 *           enum: [name, city, date, manager]
 *       - name: sort_order
 *         in: query
 *         description: Ordine di ordinamento
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *   post:
 *     summary: Crea nuova location
 *     tags: [Admin - Locations]
 */
router.route('/locations')
    .get(adminController.getAllLocations)
    .post(adminController.createLocation);

/**
 * @swagger
 * /api/admin/locations/without-manager:
 *   get:
 *     summary: Recupera location senza manager assegnato
 *     tags: [Admin - Locations]
 *     parameters:
 *       - name: name
 *         in: query
 *         description: Ricerca parziale per nome location
 *         schema:
 *           type: string
 *       - name: city
 *         in: query
 *         description: Filtro per città specifica
 *         schema:
 *           type: string
 *       - name: sort_by
 *         in: query
 *         description: Campo di ordinamento
 *         schema:
 *           type: string
 *           enum: [name, city, date]
 *       - name: sort_order
 *         in: query
 *         description: Ordine di ordinamento
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 */
router.get('/locations/without-manager', adminController.getLocationsWithoutManager);

/**
 * @swagger
 * /api/admin/locations/{locationId}:
 *   get:
 *     summary: Recupera singola location
 *     tags: [Admin - Locations]
 *   put:
 *     summary: Aggiorna location
 *     tags: [Admin - Locations]
 *   delete:
 *     summary: Elimina location
 *     tags: [Admin - Locations]
 */
router.route('/locations/:locationId')
    .get(adminController.getLocationById)
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
 * /api/admin/spaces/{spaceId}:
 *   get:
 *     summary: Recupera singolo spazio (override manager)
 *     tags: [Admin - Override]
 *   put:
 *     summary: Aggiorna spazio (override manager)
 *     tags: [Admin - Override]
 *   delete:
 *     summary: Elimina spazio (override manager)
 *     tags: [Admin - Override]
 */
router.route('/spaces/:spaceId')
    .get(adminController.getSpaceById)
    .put(adminController.updateSpace)
    .delete(adminController.deleteSpace);

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

// ========================================
// GESTIONE UTENTI - FUNZIONI SPECIFICHE ADMIN
// ========================================

/**
 * @swagger
 * /api/admin/users/{user_id}/email:
 *   get:
 *     summary: Ottieni email di un utente specifico
 *     tags: [Admin - Users]
 */
router.get('/users/:user_id/email', adminController.getUserEmail);

/**
 * @swagger
 * /api/admin/users/search/email:
 *   get:
 *     summary: Cerca utenti per email
 *     tags: [Admin - Users]
 */
router.get('/users/search/email', adminController.searchUsersByEmail);

/**
 * @swagger
 * /api/admin/users/manager-requests/pending:
 *   get:
 *     summary: Ottieni tutte le richieste manager pending
 *     tags: [Admin - Users]
 */
router.get('/users/manager-requests/pending', adminController.getPendingManagerRequests);

/**
 * @swagger
 * /api/admin/users/{user_id}/approve-manager:
 *   patch:
 *     summary: Approva richiesta manager
 *     tags: [Admin - Users]
 */
router.patch('/users/:user_id/approve-manager', adminController.approveManagerRequest);

/**
 * @swagger
 * /api/admin/users/{user_id}/reject-manager:
 *   patch:
 *     summary: Rifiuta richiesta manager
 *     tags: [Admin - Users]
 */
router.patch('/users/:user_id/reject-manager', adminController.rejectManagerRequest);

module.exports = router;
