const Availability = require('../models/Availability');
const AppError = require('../utils/AppError');

class AvailabilityService {
    /**
     * Recupera la disponibilità di uno spazio in un intervallo di date
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data di inizio (YYYY-MM-DD)
     * @param {string} endDate - Data di fine (YYYY-MM-DD)
     * @returns {Promise<Array>} Array delle disponibilità
     */
    static async getSpaceAvailability(spaceId, startDate, endDate) {
        try {
            // Validazione input
            this.validateAvailabilityQuery(spaceId, startDate, endDate);

            // Verifica esistenza spazio
            await this.verifySpaceExists(spaceId);

            return await Availability.findBySpaceAndDateRange(spaceId, startDate, endDate);
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
        try {
            // Validazione dati
            this.validateAvailabilityData(availabilityData);

            // Verifica esistenza spazio
            await this.verifySpaceExists(availabilityData.space_id);

            // Verifica sovrapposizioni
            await this.checkForOverlaps(availabilityData);

            return await Availability.create(availabilityData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella creazione del blocco di disponibilità', 500);
        }
    }

    /**
     * Aggiorna un blocco di disponibilità esistente
     * @param {number} availabilityId - ID del blocco di disponibilità
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Blocco di disponibilità aggiornato
     */
    static async updateAvailability(availabilityId, updateData) {
        try {
            // Verifica esistenza blocco
            const existingAvailability = await this.getAvailabilityById(availabilityId);

            // Validazione dati aggiornamento
            if (Object.keys(updateData).length === 0) {
                throw new AppError('Nessun campo valido fornito per l\'aggiornamento', 400);
            }

            // Verifica esistenza spazio se viene aggiornato
            if (updateData.space_id) {
                await this.verifySpaceExists(updateData.space_id);
            }

            // Verifica sovrapposizioni con i nuovi dati
            if (updateData.space_id || updateData.availability_date || 
                updateData.start_time || updateData.end_time) {
                const mergedData = { ...existingAvailability, ...updateData };
                await this.checkForOverlaps(mergedData, availabilityId);
            }

            return await Availability.update(availabilityId, updateData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'aggiornamento del blocco di disponibilità', 500);
        }
    }

    /**
     * Elimina un blocco di disponibilità
     * @param {number} availabilityId - ID del blocco di disponibilità
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async deleteAvailability(availabilityId) {
        try {
            // Verifica esistenza blocco
            await this.getAvailabilityById(availabilityId);

            // Verifica se ci sono prenotazioni associate
            const hasBookings = await Availability.hasAssociatedBookings(availabilityId);
            if (hasBookings) {
                throw new AppError('Impossibile eliminare il blocco: esistono prenotazioni associate', 400);
            }

            return await Availability.delete(availabilityId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'eliminazione del blocco di disponibilità', 500);
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

    /**
     * Disabilita disponibilità per un periodo (manutenzione, etc.)
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {string} reason - Motivo della disabilitazione
     * @returns {Promise<Array>} Blocchi aggiornati
     */
    async disableAvailabilityPeriod(spaceId, startDate, endDate, reason = 'Manutenzione') {
        try {
            await this.verifySpaceExists(spaceId);
            this.validateDateRange(startDate, endDate);

            return await Availability.disablePeriod(spaceId, startDate, endDate, reason);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella disabilitazione del periodo', 500);
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
