const Availability = require('../models/Availability');
const Space = require('../models/Space');
const AppError = require('../utils/AppError');
const db = require('../config/db');

class AvailabilityService {
    /**
     * Recupera la disponibilità di uno spazio in un intervallo di date
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data di inizio (YYYY-MM-DD)
     * @param {string} endDate - Data di fine (YYYY-MM-DD)
     * @returns {Promise<Array>} Array delle disponibilità con dettagli spazio
     */
    static async getSpaceAvailability(spaceId, startDate, endDate) {
        try {
            // Validazione input
            this.validateAvailabilityQuery(spaceId, startDate, endDate);

            // Verifica esistenza spazio e recupera dettagli
            const space = await Space.findById(spaceId);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            const availability = await Availability.findBySpaceAndDateRange(spaceId, startDate, endDate);

            // Arricchisci i risultati con informazioni dello spazio
            return {
                spaceDetails: {
                    id: space.space_id,
                    name: space.space_name,
                    pricePerHour: space.price_per_hour,
                    pricePerDay: space.price_per_day,
                    capacity: space.capacity,
                    openingTime: space.opening_time,
                    closingTime: space.closing_time,
                    availableDays: space.available_days
                },
                availabilityBlocks: availability
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero della disponibilità dello spazio', 500);
        }
    }

    /**
     * Crea un nuovo blocco di disponibilità
     * @param {Object} availabilityData - Dati del blocco di disponibilità
     * @returns {Promise<Object>} Blocco di disponibilità creato
     */
    static async createAvailability(availabilityData) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Validazione dati
            this.validateAvailabilityData(availabilityData);

            // Verifica esistenza spazio e recupera configurazione
            const space = await Space.findById(availabilityData.space_id);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            // Verifica che l'orario sia all'interno dell'orario di apertura dello spazio
            if (!this.isWithinOpeningHours(availabilityData.start_time, availabilityData.end_time, space)) {
                throw new AppError('Orario fuori dall\'orario di apertura dello spazio', 400);
            }

            // Verifica che il giorno sia tra i giorni disponibili dello spazio
            const dayOfWeek = new Date(availabilityData.availability_date).getDay();
            if (!space.available_days.includes(dayOfWeek)) {
                throw new AppError('Il giorno selezionato non è tra i giorni disponibili dello spazio', 400);
            }

            // Verifica sovrapposizioni
            await this.checkForOverlaps(availabilityData);

            const newAvailability = await Availability.create(availabilityData);
            await client.query('COMMIT');
            return newAvailability;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella creazione del blocco di disponibilità', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Aggiorna un blocco di disponibilità esistente
     * @param {number} availabilityId - ID del blocco di disponibilità
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Blocco di disponibilità aggiornato
     */
    static async updateAvailability(availabilityId, updateData) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Verifica esistenza blocco
            const existingAvailability = await this.getAvailabilityById(availabilityId);
            const space = await Space.findById(existingAvailability.space_id);

            // Validazione dati aggiornamento
            if (Object.keys(updateData).length === 0) {
                throw new AppError('Nessun campo valido fornito per l\'aggiornamento', 400);
            }

            // Se si sta aggiornando l'orario, verifica che sia nell'orario di apertura
            if (updateData.start_time || updateData.end_time) {
                const startTime = updateData.start_time || existingAvailability.start_time;
                const endTime = updateData.end_time || existingAvailability.end_time;
                
                if (!this.isWithinOpeningHours(startTime, endTime, space)) {
                    throw new AppError('Orario fuori dall\'orario di apertura dello spazio', 400);
                }
            }

            // Verifica sovrapposizioni con i nuovi dati
            const mergedData = { ...existingAvailability, ...updateData };
            await this.checkForOverlaps(mergedData, availabilityId);

            const updatedAvailability = await Availability.update(availabilityId, updateData);
            await client.query('COMMIT');
            return updatedAvailability;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'aggiornamento del blocco di disponibilità', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Elimina un blocco di disponibilità
     * @param {number} availabilityId - ID del blocco di disponibilità
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async deleteAvailability(availabilityId) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Verifica esistenza blocco
            const availability = await this.getAvailabilityById(availabilityId);

            // Verifica se ci sono prenotazioni associate
            const hasBookings = await Availability.hasAssociatedBookings(availabilityId);
            if (hasBookings) {
                throw new AppError('Impossibile eliminare il blocco: esistono prenotazioni associate', 400);
            }

            const result = await Availability.delete(availabilityId);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'eliminazione del blocco di disponibilità', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Recupera un blocco di disponibilità per ID
     * @param {number} availabilityId - ID del blocco
     * @returns {Promise<Object>} Blocco di disponibilità
     */
    static async getAvailabilityById(availabilityId) {
        try {
            const availability = await Availability.findById(availabilityId);
            if (!availability) {
                throw new AppError('Blocco di disponibilità non trovato', 404);
            }
            return availability;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero del blocco di disponibilità', 500);
        }
    }

    /**
     * Genera disponibilità per uno spazio in un intervallo di date
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @param {number[]} excludeDays - Giorni da escludere (0-6)
     * @returns {Promise<Array>} Blocchi di disponibilità generati
     */
    static async generateAvailabilitySchedule(spaceId, startDate, endDate, startTime, endTime, excludeDays = []) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Verifica esistenza spazio e recupera configurazione
            const space = await Space.findById(spaceId);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            // Validazione orari con orari di apertura dello spazio
            if (!this.isWithinOpeningHours(startTime, endTime, space)) {
                throw new AppError('Orario fuori dall\'orario di apertura dello spazio', 400);
            }

            // Merge dei giorni esclusi con i giorni non disponibili dello spazio
            const allExcludedDays = new Set([
                ...excludeDays,
                ...[0, 1, 2, 3, 4, 5, 6].filter(day => !space.available_days.includes(day))
            ]);

            const generatedBlocks = [];
            const currentDate = new Date(startDate);
            const endDateTime = new Date(endDate);

            while (currentDate <= endDateTime) {
                if (!allExcludedDays.has(currentDate.getDay())) {
                    const dateString = currentDate.toISOString().split('T')[0];
                    
                    try {
                        // Verifica eventuali sovrapposizioni prima di creare
                        const existingBlock = await Availability.findBySpaceDateTime(
                            spaceId, dateString, startTime, endTime
                        );

                        if (!existingBlock) {
                            const newBlock = await Availability.create({
                                space_id: spaceId,
                                availability_date: dateString,
                                start_time: startTime,
                                end_time: endTime,
                                is_available: true
                            });
                            generatedBlocks.push(newBlock);
                        }
                    } catch (error) {
                        // Log dell'errore ma continua con le altre date
                        console.error(`Errore per la data ${dateString}:`, error);
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            await client.query('COMMIT');
            return generatedBlocks;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella generazione della disponibilità', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Verifica la disponibilità per una prenotazione
     * @param {number} spaceId - ID dello spazio
     * @param {string} bookingDate - Data prenotazione
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Object>} Risultato della verifica
     */
    static async checkBookingAvailability(spaceId, bookingDate, startTime, endTime) {
        try {
            // Verifica esistenza spazio e recupera configurazione
            const space = await Space.findById(spaceId);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            // Verifica che il giorno sia tra quelli disponibili
            const dayOfWeek = new Date(bookingDate).getDay();
            if (!space.available_days.includes(dayOfWeek)) {
                return {
                    isAvailable: false,
                    message: 'Lo spazio non è disponibile in questo giorno della settimana',
                    conflicts: []
                };
            }

            // Verifica orario di apertura
            if (!this.isWithinOpeningHours(startTime, endTime, space)) {
                return {
                    isAvailable: false,
                    message: 'Orario richiesto fuori dall\'orario di apertura',
                    conflicts: []
                };
            }

            // Verifica blocchi di disponibilità
            const availableBlocks = await Availability.findAvailableBlocks(
                spaceId, bookingDate, startTime, endTime
            );

            // Verifica prenotazioni esistenti
            const conflictingBookings = await Availability.findConflictingBookings(
                spaceId, bookingDate, startTime, endTime
            );

            const isAvailable = availableBlocks.length > 0 && conflictingBookings.length === 0;

            return {
                isAvailable,
                message: isAvailable ? 
                    'Spazio disponibile per la prenotazione' : 
                    'Spazio non disponibile nel periodo richiesto',
                availableBlocks,
                conflicts: conflictingBookings
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella verifica della disponibilità', 500);
        }
    }

    /**
     * Recupera statistiche sulla disponibilità
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<Object>} Statistiche
     */
    static async getAvailabilityStatistics(spaceId, startDate, endDate) {
        try {
            // Verifica esistenza spazio
            const space = await Space.findById(spaceId);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            // Recupera statistiche base
            const stats = await Availability.getStatistics(spaceId, startDate, endDate);

            // Calcola statistiche aggiuntive
            return {
                ...stats,
                spaceInfo: {
                    name: space.space_name,
                    type: space.space_type_id,
                    capacity: space.capacity,
                    pricePerHour: parseFloat(space.price_per_hour)
                },
                periodInfo: {
                    startDate,
                    endDate,
                    totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
                }
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero delle statistiche', 500);
        }
    }

    /**
     * Disabilita la disponibilità per un periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {string} reason - Motivo della disabilitazione
     * @returns {Promise<Array>} Blocchi disabilitati
     */
    static async disableAvailabilityPeriod(spaceId, startDate, endDate, reason = 'Manutenzione') {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Verifica esistenza spazio
            const space = await Space.findById(spaceId);
            if (!space) {
                throw new AppError('Spazio non trovato', 404);
            }

            // Verifica che non ci siano prenotazioni nel periodo
            const hasBookings = await Availability.hasBookingsInPeriod(spaceId, startDate, endDate);
            if (hasBookings) {
                throw new AppError('Esistono prenotazioni nel periodo selezionato', 400);
            }

            // Disabilita i blocchi di disponibilità
            const disabledBlocks = await Availability.disablePeriod(spaceId, startDate, endDate, reason);

            await client.query('COMMIT');
            return disabledBlocks;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella disabilitazione del periodo', 500);
        } finally {
            client.release();
        }
    }

    /**
     * Verifica se un orario è all'interno dell'orario di apertura
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @param {Object} space - Configurazione spazio
     * @returns {boolean} True se l'orario è valido
     * @private
     */
    static isWithinOpeningHours(startTime, endTime, space) {
        const parseTime = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const start = parseTime(startTime);
        const end = parseTime(endTime);
        const opening = parseTime(space.opening_time);
        const closing = parseTime(space.closing_time);

        return start >= opening && end <= closing;
    }

    /**
     * Genera automaticamente disponibilità per uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data di inizio
     * @param {string} endDate - Data di fine
     * @param {string} startTime - Ora di inizio (HH:MM)
     * @param {string} endTime - Ora di fine (HH:MM)
     * @param {Array} excludeDays - Giorni da escludere (0=domenica, 1=lunedì, etc.)
     * @returns {Promise<Array>} Array dei blocchi creati
     */
    async generateAvailabilitySchedule(spaceId, startDate, endDate, startTime, endTime, excludeDays = []) {
        try {
            // Validazione input
            await this.verifySpaceExists(spaceId);
            this.validateDateRange(startDate, endDate);
            this.validateTimeRange(startTime, endTime);

            const createdBlocks = [];
            const currentDate = new Date(startDate);
            const finalDate = new Date(endDate);

            while (currentDate <= finalDate) {
                const dayOfWeek = currentDate.getDay();
                
                if (!excludeDays.includes(dayOfWeek)) {
                    const dateString = currentDate.toISOString().split('T')[0];
                    
                    try {
                        const availabilityData = {
                            space_id: spaceId,
                            availability_date: dateString,
                            start_time: startTime,
                            end_time: endTime,
                            is_available: true
                        };

                        // Verifica se esiste già un blocco per questa data/ora
                        const existingBlock = await Availability.findBySpaceDateTime(
                            spaceId, dateString, startTime, endTime
                        );

                        if (!existingBlock) {
                            const newBlock = await Availability.create(availabilityData);
                            createdBlocks.push(newBlock);
                        }
                    } catch (error) {
                        // Ignora errori di duplicazione e continua
                        console.log(`Blocco già esistente per ${dateString} ${startTime}-${endTime}`);
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return createdBlocks;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella generazione automatica della disponibilità', 500);
        }
    }

    /**
     * Verifica disponibilità per una prenotazione
     * @param {number} spaceId - ID dello spazio
     * @param {string} bookingDate - Data prenotazione
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Object>} Risultato della verifica
     */
    async checkBookingAvailability(spaceId, bookingDate, startTime, endTime) {
        try {
            // Verifica esistenza spazio
            await this.verifySpaceExists(spaceId);

            // Trova blocchi di disponibilità che coprono l'orario richiesto
            const availableBlocks = await Availability.findAvailableBlocks(
                spaceId, bookingDate, startTime, endTime
            );

            // Verifica conflitti con prenotazioni esistenti
            const conflictingBookings = await Availability.findConflictingBookings(
                spaceId, bookingDate, startTime, endTime
            );

            const isAvailable = availableBlocks.length > 0 && conflictingBookings.length === 0;

            return {
                isAvailable,
                availableBlocks,
                conflictingBookings,
                message: isAvailable ? 
                    'Spazio disponibile per l\'orario richiesto' : 
                    'Spazio non disponibile per l\'orario richiesto'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella verifica della disponibilità', 500);
        }
    }

    /**
     * Ottiene statistiche sulla disponibilità di uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio periodo
     * @param {string} endDate - Data fine periodo
     * @returns {Promise<Object>} Statistiche disponibilità
     */
    async getAvailabilityStatistics(spaceId, startDate, endDate) {
        try {
            await this.verifySpaceExists(spaceId);
            this.validateDateRange(startDate, endDate);

            return await Availability.getStatistics(spaceId, startDate, endDate);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel calcolo delle statistiche di disponibilità', 500);
        }
    }



    // Metodi di validazione privati

    /**
     * Valida i dati di una query di disponibilità
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @private
     */
    static validateAvailabilityQuery(spaceId, startDate, endDate) {
        if (!spaceId || !startDate || !endDate) {
            throw new AppError('Space ID, data di inizio e data di fine sono obbligatori', 400);
        }

        if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
            throw new AppError('Formato data non valido. Utilizzare YYYY-MM-DD', 400);
        }

        if (new Date(startDate) > new Date(endDate)) {
            throw new AppError('La data di inizio deve essere precedente alla data di fine', 400);
        }
    }

    /**
     * Valida i dati di un blocco di disponibilità
     * @param {Object} data - Dati da validare
     * @private
     */
    static validateAvailabilityData(data) {
        const { space_id, availability_date, start_time, end_time } = data;

        if (!space_id || !availability_date || !start_time || !end_time) {
            throw new AppError('Space ID, data, ora di inizio e ora di fine sono obbligatori', 400);
        }

        if (!this.isValidDate(availability_date)) {
            throw new AppError('Formato data non valido. Utilizzare YYYY-MM-DD', 400);
        }

        if (!this.isValidTime(start_time) || !this.isValidTime(end_time)) {
            throw new AppError('Formato ora non valido. Utilizzare HH:MM', 400);
        }

        if (start_time >= end_time) {
            throw new AppError('L\'ora di inizio deve essere precedente all\'ora di fine', 400);
        }
    }

    /**
     * Valida un intervallo di date
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @private
     */
    validateDateRange(startDate, endDate) {
        if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
            throw new AppError('Formato data non valido. Utilizzare YYYY-MM-DD', 400);
        }

        if (new Date(startDate) > new Date(endDate)) {
            throw new AppError('La data di inizio deve essere precedente alla data di fine', 400);
        }
    }

    /**
     * Valida un intervallo di ore
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @private
     */
    validateTimeRange(startTime, endTime) {
        if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
            throw new AppError('Formato ora non valido. Utilizzare HH:MM', 400);
        }

        if (startTime >= endTime) {
            throw new AppError('L\'ora di inizio deve essere precedente all\'ora di fine', 400);
        }
    }

    /**
     * Verifica se uno spazio esiste
     * @param {number} spaceId - ID dello spazio
     * @private
     */
    static async verifySpaceExists(spaceId) {
        const spaceExists = await Availability.checkSpaceExists(spaceId);
        if (!spaceExists) {
            throw new AppError('Spazio non trovato', 404);
        }
    }

    /**
     * Verifica sovrapposizioni con blocchi esistenti
     * @param {Object} data - Dati del blocco
     * @param {number} excludeId - ID da escludere dal controllo
     * @private
     */
    static async checkForOverlaps(data, excludeId = null) {
        const { space_id, availability_date, start_time, end_time } = data;
        
        const overlaps = await Availability.findOverlappingBlocks(
            space_id, availability_date, start_time, end_time, excludeId
        );

        if (overlaps.length > 0) {
            throw new AppError('Blocco di disponibilità già esistente per lo spazio e l\'orario specificati', 409);
        }
    }

    /**
     * Verifica se una data è valida
     * @param {string} date - Data da verificare
     * @returns {boolean} True se valida
     * @private
     */
    static isValidDate(date) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(date)) return false;
        
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj.getTime());
    }

    /**
     * Verifica se un orario è valido
     * @param {string} time - Orario da verificare
     * @returns {boolean} True se valido
     * @private
     */
    static isValidTime(time) {
        const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(time);
    }
}

module.exports = AvailabilityService;
