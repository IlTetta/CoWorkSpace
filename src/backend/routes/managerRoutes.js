// src/backend/routes/managerRoutes.js
/**
 * Routes Manager - Implementa ROLE_REDESIGN.md
 * Responsabile operativo di una o più sedi con controllo completo
 */

const express = require('express');
const managerController = require('../controllers/managerController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware: tutte le route richiedono autenticazione
router.use(authMiddleware.protect);

// ============================================================================
// GESTIONE LOCATION - CRUD completo per le location gestite dal manager
// ============================================================================

/**
 * @swagger
 * /api/manager/locations:
 *   get:
 *     summary: Ottieni tutte le location gestite dal manager
 *     tags: [Manager]
 *   post:
 *     summary: Crea nuova location
 *     tags: [Manager]
 */
router.route('/locations')
  .get(managerController.getMyLocations)
  .post(managerController.createLocation);

/**
 * @swagger
 * /api/manager/locations/{locationId}:
 *   put:
 *     summary: Aggiorna location gestita
 *     tags: [Manager]
 *   delete:
 *     summary: Elimina location (solo admin)
 *     tags: [Manager]
 */
router.route('/locations/:locationId')
  .put(managerController.updateLocation)
  .delete(managerController.deleteLocation);

/**
 * @swagger
 * /api/manager/dashboard:
 *   get:
 *     summary: Dashboard operativa completa del manager
 *     description: Restituisce statistiche complete delle location gestite, prenotazioni degli utenti, pagamenti e performance
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard con statistiche complete delle location gestite
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         manager:
 *                           type: object
 *                           properties:
 *                             user_id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: 'Mario'
 *                             surname:
 *                               type: string
 *                               example: 'Rossi'
 *                             email:
 *                               type: string
 *                               format: email
 *                               example: 'mario.manager@email.com'
 *                             role:
 *                               type: string
 *                               example: 'manager'
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                         locations:
 *                           type: array
 *                           description: Location gestite dal manager
 *                           items:
 *                             type: object
 *                             properties:
 *                               location_id:
 *                                 type: integer
 *                                 example: 1
 *                               location_name:
 *                                 type: string
 *                                 example: 'CoWork Milano Centro'
 *                               address:
 *                                 type: string
 *                                 example: 'Via Duomo 123'
 *                               city:
 *                                 type: string
 *                                 example: 'Milano'
 *                               total_spaces:
 *                                 type: integer
 *                                 example: 15
 *                               active_bookings:
 *                                 type: integer
 *                                 example: 5
 *                               unique_customers:
 *                                 type: integer
 *                                 example: 25
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             total_bookings:
 *                               type: integer
 *                               example: 150
 *                             completed_bookings:
 *                               type: integer
 *                               example: 120
 *                             confirmed_bookings:
 *                               type: integer
 *                               example: 25
 *                             cancelled_bookings:
 *                               type: integer
 *                               example: 5
 *                             pending_bookings:
 *                               type: integer
 *                               example: 0
 *                             total_revenue:
 *                               type: number
 *                               format: decimal
 *                               example: 15750.00
 *                             total_days_booked:
 *                               type: number
 *                               format: decimal
 *                               example: 350.0
 *                             unique_customers:
 *                               type: integer
 *                               example: 85
 *                             spaces_used:
 *                               type: integer
 *                               example: 12
 *                             locations_managed:
 *                               type: integer
 *                               example: 2
 *                         bookings:
 *                           type: object
 *                           properties:
 *                             all:
 *                               type: array
 *                               description: Tutte le prenotazioni con dati clienti
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   booking_id:
 *                                     type: integer
 *                                   booking_date:
 *                                     type: string
 *                                     format: date
 *                                   start_time:
 *                                     type: string
 *                                     format: time
 *                                   end_time:
 *                                     type: string
 *                                     format: date
 *                                   total_days:
 *                                     type: number
 *                                     format: decimal
 *                                   total_price:
 *                                     type: number
 *                                     format: decimal
 *                                   status:
 *                                     type: string
 *                                     enum: ['confirmed', 'pending', 'cancelled', 'completed']
 *                                   customer_name:
 *                                     type: string
 *                                     example: 'Luca'
 *                                   customer_surname:
 *                                     type: string
 *                                     example: 'Verdi'
 *                                   customer_email:
 *                                     type: string
 *                                     format: email
 *                                     example: 'luca.verdi@email.com'
 *                                   space_name:
 *                                     type: string
 *                                   location_name:
 *                                     type: string
 *                                   payment_status:
 *                                     type: string
 *                                     enum: ['completed', 'failed', 'refunded']
 *                                   payment_method:
 *                                     type: string
 *                                     enum: ['credit_card', 'paypal', 'bank_transfer', 'cash']
 *                             upcoming:
 *                               type: array
 *                               description: Prossime prenotazioni (confermate e pending)
 *                             recent:
 *                               type: array
 *                               description: Ultime 10 prenotazioni
 *                             total:
 *                               type: integer
 *                         customers:
 *                           type: object
 *                           properties:
 *                             top:
 *                               type: array
 *                               description: Top 5 clienti per numero di prenotazioni
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   user_id:
 *                                     type: integer
 *                                   name:
 *                                     type: string
 *                                   surname:
 *                                     type: string
 *                                   email:
 *                                     type: string
 *                                     format: email
 *                                   total_bookings:
 *                                     type: integer
 *                                   total_spent:
 *                                     type: number
 *                                     format: decimal
 *                                   last_booking_date:
 *                                     type: string
 *                                     format: date-time
 *                             total_unique:
 *                               type: integer
 *                         performance:
 *                           type: object
 *                           properties:
 *                             by_location:
 *                               type: array
 *                               description: Performance per singola location
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   location_id:
 *                                     type: integer
 *                                   location_name:
 *                                     type: string
 *                                   city:
 *                                     type: string
 *                                   total_bookings:
 *                                     type: integer
 *                                   revenue:
 *                                     type: number
 *                                     format: decimal
 *                                   unique_customers:
 *                                     type: integer
 *                                   avg_booking_hours:
 *                                     type: number
 *                                     format: decimal
 *                             payment_methods:
 *                               type: array
 *                               description: Statistiche metodi di pagamento
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   payment_method:
 *                                     type: string
 *                                     enum: ['credit_card', 'paypal', 'bank_transfer', 'cash']
 *                                   payment_count:
 *                                     type: integer
 *                                   total_amount:
 *                                     type: number
 *                                     format: decimal
 *                                   completed_count:
 *                                     type: integer
 *                                   failed_count:
 *                                     type: integer
 *                                   refunded_count:
 *                                     type: integer
 *       401:
 *         description: Non autorizzato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accesso negato (solo manager)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', managerController.getDashboard);

// ============================================================================
// GESTIONE SPAZI - CRUD completo
// ============================================================================

/**
 * @swagger
 * /api/manager/spaces:
 *   get:
 *     summary: Ottieni tutti gli spazi delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Crea nuovo spazio
 *     tags: [Manager]
 */
router.route('/spaces')
  .get(managerController.getMySpaces)
  .post(managerController.createSpace);

/**
 * @swagger
 * /api/manager/spaces/{spaceId}:
 *   put:
 *     summary: Aggiorna spazio
 *     tags: [Manager]
 *   delete:
 *     summary: Elimina spazio
 *     tags: [Manager]
 */
router.route('/spaces/:spaceId')
  .put(managerController.updateSpace)
  .delete(managerController.deleteSpace);

// ============================================================================
// GESTIONE ORARI E DISPONIBILITÀ
// ============================================================================

/**
 * @swagger
 * /api/manager/spaces/{spaceId}/availability:
 *   post:
 *     summary: Imposta disponibilità spazio per data specifica
 *     tags: [Manager]
 */
router.post('/spaces/:spaceId/availability', managerController.updateSpaceAvailability);

/**
 * @swagger
 * /api/manager/spaces/{spaceId}/hours:
 *   put:
 *     summary: Imposta orari di apertura e giorni disponibili
 *     tags: [Manager]
 */
router.put('/spaces/:spaceId/hours', managerController.setSpaceHours);

// ============================================================================
// GESTIONE PRENOTAZIONI - TUTTE le prenotazioni delle proprie sedi
// ============================================================================

/**
 * @swagger
 * /api/manager/bookings:
 *   get:
 *     summary: Tutte le prenotazioni delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Crea prenotazione per cliente (assistenza)
 *     tags: [Manager]
 */
router.route('/bookings')
  .get(managerController.getAllMyBookings)
  .post(managerController.createBookingForClient);

/**
 * @swagger
 * /api/manager/bookings/{bookingId}:
 *   put:
 *     summary: Modifica prenotazione (per assistenza clienti)
 *     tags: [Manager]
 */
router.put('/bookings/:bookingId', managerController.updateBooking);

// ============================================================================
// GESTIONE PAGAMENTI - TUTTI i pagamenti delle proprie sedi
// ============================================================================

/**
 * @swagger
 * /api/manager/payments:
 *   get:
 *     summary: Tutti i pagamenti delle location gestite
 *     tags: [Manager]
 *   post:
 *     summary: Processa pagamento per cliente (contanti, ecc)
 *     tags: [Manager]
 */
router.route('/payments')
  .get(managerController.getAllMyPayments)
  .post(managerController.processClientPayment);

/**
 * @swagger
 * /api/manager/payments/{paymentId}:
 *   put:
 *     summary: Aggiorna stato pagamento
 *     tags: [Manager]
 */
router.put('/payments/:paymentId', managerController.updatePayment);

module.exports = router;
