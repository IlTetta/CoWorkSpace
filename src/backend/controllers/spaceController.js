const SpaceService = require('../services/SpaceService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Controller per la gestione degli spazi
 * Segue il pattern Model-Service-Controller con logica centralizzata nel SpaceService
 */

// ============================================================================
// PUBLIC ENDPOINTS - Accessibili senza autenticazione
// ============================================================================

/**
 * GET /api/spaces - Lista di tutti gli spazi (pubblico)
 */
const getSpaces = catchAsync(async (req, res) => {
  const spaces = await SpaceService.getSpaces(req.query, null);
  
  res.status(200).json({
    success: true,
    message: 'Spazi recuperati con successo',
    data: { spaces }
  });
});

/**
 * GET /api/spaces/:id - Dettagli di uno spazio specifico (pubblico)
 */
const getSpaceById = catchAsync(async (req, res) => {
  const { space_id } = req.params;
  const space = await SpaceService.getSpaceDetails(space_id, null);
  
  res.status(200).json({
    success: true,
    message: 'Spazio recuperato con successo',
    data: { space }
  });
});

/**
 * GET /api/spaces/search/available - Ricerca spazi disponibili (pubblico)
 */
const searchAvailableSpaces = catchAsync(async (req, res) => {
  const spaces = await SpaceService.searchAvailableSpaces(req.query);
  
  res.status(200).json({
    success: true,
    message: 'Spazi disponibili recuperati con successo',
    data: { spaces }
  });
});

/**
 * POST /api/spaces/availability/check - Verifica disponibilità di uno spazio (pubblico)
 */
const checkSpaceAvailability = catchAsync(async (req, res) => {
  const { space_id, startDateTime, endDateTime } = req.body;
  
  if (!space_id || !startDateTime || !endDateTime) {
    throw AppError.badRequest('ID spazio, data/ora di inizio e fine sono obbligatori');
  }
  
  const availability = await SpaceService.checkSpaceAvailability(space_id, startDateTime, endDateTime);
  
  res.status(200).json({
    success: true,
    message: 'Disponibilità verificata con successo',
    data: { availability }
  });
});

/**
 * POST /api/spaces/pricing/calculate - Calcola il prezzo per una prenotazione (pubblico)
 */
const calculateBookingPrice = catchAsync(async (req, res) => {
  const { space_id, startDateTime, endDateTime, additionalServices = [] } = req.body;
  
  if (!space_id || !startDateTime || !endDateTime) {
    throw AppError.badRequest('ID spazio, data/ora di inizio e fine sono obbligatori');
  }
  
  const pricing = await SpaceService.calculateBookingPrice(space_id, startDateTime, endDateTime);
  
  res.status(200).json({
    success: true,
    message: 'Prezzo calcolato con successo',
    data: { pricing }
  });
});

// ============================================================================
// PROTECTED ENDPOINTS - Richiedono autenticazione
// ============================================================================

/**
 * POST /api/spaces - Crea un nuovo spazio (autenticato)
 */
const createSpace = catchAsync(async (req, res) => {
  const user = req.user;
  const spaceData = req.body;
  
  const space = await SpaceService.createSpace(spaceData, user);
  
  res.status(201).json({
    success: true,
    message: 'Spazio creato con successo',
    data: { space }
  });
});

/**
 * PUT /api/spaces/:id - Aggiorna uno spazio esistente (autenticato)
 */
const updateSpace = catchAsync(async (req, res) => {
  const user = req.user;
  const { space_id } = req.params;
  const updateData = req.body;
  
  const space = await SpaceService.updateSpace(space_id, updateData, user);
  
  res.status(200).json({
    success: true,
    message: 'Spazio aggiornato con successo',
    data: { space }
  });
});

/**
 * DELETE /api/spaces/:id - Elimina uno spazio (autenticato)
 */
const deleteSpace = catchAsync(async (req, res) => {
  const user = req.user;
  const { space_id } = req.params;
  
  await SpaceService.deleteSpace(space_id, user);
  
  res.status(200).json({
    success: true,
    message: 'Spazio eliminato con successo'
  });
});

/**
 * GET /api/spaces/user/owned - Lista degli spazi posseduti dall'utente (autenticato)
 */
const getUserOwnedSpaces = catchAsync(async (req, res) => {
  const user = req.user;
  const spaces = await SpaceService.getSpacesByLocation(req.query.location_id, user);
  
  res.status(200).json({
    success: true,
    message: 'Spazi posseduti recuperati con successo',
    data: { spaces }
  });
});

// ============================================================================
// MANAGER ENDPOINTS - Richiedono ruolo manager/admin
// ============================================================================

/**
 * GET /api/spaces/dashboard/manager - Dashboard per manager (manager/admin)
 */
const getManagerDashboard = catchAsync(async (req, res) => {
  const user = req.user;
  const dashboard = await SpaceService.getSpacesDashboard(user);
  
  res.status(200).json({
    success: true,
    message: 'Dashboard recuperata con successo',
    data: { dashboard }
  });
});

// Per le funzioni non ancora implementate nel service, creo placeholder
const getManagerStatistics = catchAsync(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Funzionalità non ancora implementata'
  });
});

const bulkUpdateSpaceStatus = catchAsync(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Funzionalità non ancora implementata'
  });
});

const getAdminSpacesList = catchAsync(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Funzionalità non ancora implementata'
  });
});

const getAdminDashboard = catchAsync(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Funzionalità non ancora implementata'
  });
});

const bulkAssignSpacesToLocation = catchAsync(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Funzionalità non ancora implementata'
  });
});

module.exports = {
  // Public endpoints
  getSpaces,
  getSpaceById,
  searchAvailableSpaces,
  checkSpaceAvailability,
  calculateBookingPrice,
  
  // Protected endpoints
  createSpace,
  updateSpace,
  deleteSpace,
  getUserOwnedSpaces,
  
  // Manager endpoints
  getManagerDashboard,
  getManagerStatistics,
  bulkUpdateSpaceStatus,
  
  // Admin endpoints
  getAdminSpacesList,
  getAdminDashboard,
  bulkAssignSpacesToLocation
};
