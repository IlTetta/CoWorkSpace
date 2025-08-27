const { body, param, query } = require('express-validator');

/**
 * Validazione per creazione prenotazione
 */
exports.createBookingValidation = [
    body('space_id')
        .isInt({ min: 1 })
        .withMessage('Space ID deve essere un numero intero positivo'),
    
    body('booking_date')
        .isDate()
        .withMessage('Data prenotazione deve essere valida')
        .custom((value) => {
            const bookingDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (bookingDate < today) {
                throw new Error('Data prenotazione deve essere futura');
            }
            return true;
        }),
    
    body('start_time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
        .withMessage('Ora inizio deve essere nel formato HH:MM o HH:MM:SS'),
    
    body('end_time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
        .withMessage('Ora fine deve essere nel formato HH:MM o HH:MM:SS')
        .custom((value, { req }) => {
            if (value <= req.body.start_time) {
                throw new Error('Ora fine deve essere successiva all\'ora inizio');
            }
            return true;
        })
];

/**
 * Validazione per aggiornamento stato prenotazione
 */
exports.updateBookingStatusValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID prenotazione deve essere un numero intero positivo'),
    
    body('status')
        .isIn(['confirmed', 'pending', 'cancelled', 'completed'])
        .withMessage('Stato deve essere: confirmed, pending, cancelled o completed')
];

/**
 * Validazione per parametro ID
 */
exports.bookingIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID prenotazione deve essere un numero intero positivo')
];

/**
 * Validazione per filtri query
 */
exports.bookingFiltersValidation = [
    query('status')
        .optional()
        .isIn(['confirmed', 'pending', 'cancelled', 'completed'])
        .withMessage('Status deve essere: confirmed, pending, cancelled o completed'),
    
    query('location_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Location ID deve essere un numero intero positivo'),
    
    query('from_date')
        .optional()
        .isDate()
        .withMessage('Data inizio deve essere valida'),
    
    query('to_date')
        .optional()
        .isDate()
        .withMessage('Data fine deve essere valida')
        .custom((value, { req }) => {
            if (req.query.from_date && value < req.query.from_date) {
                throw new Error('Data fine deve essere successiva alla data inizio');
            }
            return true;
        })
];
