/**
 * Index file per esportare tutti i modelli
 * Centralizza l'accesso ai modelli per il resto dell'applicazione
 */

const User = require('./User');
const Booking = require('./Booking');
const SpaceType = require('./SpaceType');
const Space = require('./Space');
const Location = require('./Location');
const Availability = require('./Availability');
const Payment = require('./Payment');
const Notification = require('./Notification');

module.exports = {
    User,
    Booking,
    SpaceType,
    Space,
    Location,
    Availability,
    Payment,
    Notification
};
