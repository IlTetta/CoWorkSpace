const AdditionalService = require('../models/AdditionalService');
const AppError = require('../utils/AppError');

class AdditionalServiceService {
    /**
     * Recupera tutti i servizi aggiuntivi attivi
     * @returns {Promise<Array>} Array dei servizi aggiuntivi
     */
    static async getAllActiveServices() {
        try {
            return await AdditionalService.findAll({ is_active: true });
        } catch (error) {
            throw new AppError('Errore nel recupero dei servizi aggiuntivi', 500);
        }
    }

    /**
     * Recupera un servizio aggiuntivo per ID
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Object>} Servizio aggiuntivo
     */
    static async getServiceById(serviceId) {
        try {
            const service = await AdditionalService.findById(serviceId);
            if (!service) {
                throw new AppError('Servizio aggiuntivo non trovato', 404);
            }
            return service;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero del servizio aggiuntivo', 500);
        }
    }

    /**
     * Crea un nuovo servizio aggiuntivo
     * @param {Object} serviceData - Dati del servizio
     * @returns {Promise<Object>} Servizio creato
     */
    static async createService(serviceData) {
        try {
            // Validazione dati
            this.validateServiceData(serviceData);

            // Verifica unicità nome servizio
            const existingService = await AdditionalService.findByName(serviceData.service_name);
            if (existingService) {
                throw new AppError('Un servizio con questo nome esiste già', 409);
            }

            return await AdditionalService.create(serviceData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella creazione del servizio aggiuntivo', 500);
        }
    }

    /**
     * Aggiorna un servizio aggiuntivo esistente
     * @param {number} serviceId - ID del servizio
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Servizio aggiornato
     */
    static async updateService(serviceId, updateData) {
        try {
            // Verifica esistenza servizio
            await this.getServiceById(serviceId);

            // Validazione dati aggiornamento
            if (Object.keys(updateData).length === 0) {
                throw new AppError('Nessun campo valido fornito per l\'aggiornamento', 400);
            }

            // Verifica unicità nome se viene aggiornato
            if (updateData.service_name) {
                const existingService = await AdditionalService.findByName(updateData.service_name);
                if (existingService && existingService.service_id !== serviceId) {
                    throw new AppError('Un servizio con questo nome esiste già', 409);
                }
            }

            return await AdditionalService.update(serviceId, updateData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'aggiornamento del servizio aggiuntivo', 500);
        }
    }

    /**
     * Elimina un servizio aggiuntivo
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async deleteService(serviceId) {
        try {
            // Verifica esistenza servizio
            await this.getServiceById(serviceId);

            // Verifica se il servizio è associato a spazi
            const associations = await AdditionalService.getServiceSpaceAssociations(serviceId);
            if (associations.length > 0) {
                throw new AppError('Impossibile eliminare il servizio: è associato a uno o più spazi', 400);
            }

            return await AdditionalService.delete(serviceId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'eliminazione del servizio aggiuntivo', 500);
        }
    }

    /**
     * Associa un servizio a uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se associazione creata
     */
    static async addServiceToSpace(spaceId, serviceId) {
        try {
            // Verifica esistenza servizio
            await this.getServiceById(serviceId);

            // Verifica se l'associazione esiste già
            const existingAssociation = await AdditionalService.checkSpaceServiceAssociation(spaceId, serviceId);
            if (existingAssociation) {
                throw new AppError('Questo servizio è già associato a questo spazio', 409);
            }

            return await AdditionalService.addToSpace(spaceId, serviceId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'associazione del servizio allo spazio', 500);
        }
    }

    /**
     * Rimuove un servizio da uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se associazione rimossa
     */
    static async removeServiceFromSpace(spaceId, serviceId) {
        try {
            // Verifica esistenza associazione
            const existingAssociation = await AdditionalService.checkSpaceServiceAssociation(spaceId, serviceId);
            if (!existingAssociation) {
                throw new AppError('Associazione servizio-spazio non trovata', 404);
            }

            return await AdditionalService.removeFromSpace(spaceId, serviceId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella rimozione del servizio dallo spazio', 500);
        }
    }

    /**
     * Recupera tutti i servizi associati a uno spazio
     * @param {number} spaceId - ID dello spazio
     * @returns {Promise<Array>} Array dei servizi associati
     */
    static async getServicesBySpace(spaceId) {
        try {
            return await AdditionalService.findBySpace(spaceId);
        } catch (error) {
            throw new AppError('Errore nel recupero dei servizi dello spazio', 500);
        }
    }

    /**
     * Recupera tutti gli spazi che utilizzano un servizio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Array>} Array degli spazi che utilizzano il servizio
     */
    async getSpacesByService(serviceId) {
        try {
            // Verifica esistenza servizio
            await this.getServiceById(serviceId);
            
            return await AdditionalService.findSpacesByService(serviceId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero degli spazi per il servizio', 500);
        }
    }

    /**
     * Calcola il costo totale dei servizi aggiuntivi per uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {Array} selectedServiceIds - Array degli ID dei servizi selezionati
     * @returns {Promise<Object>} Dettagli costo servizi
     */
    async calculateAdditionalServicesCost(spaceId, selectedServiceIds = []) {
        try {
            if (!selectedServiceIds || selectedServiceIds.length === 0) {
                return { services: [], totalCost: 0 };
            }

            const spaceServices = await this.getServicesBySpace(spaceId);
            const availableServiceIds = spaceServices.map(s => s.service_id);

            // Verifica che tutti i servizi selezionati siano disponibili per lo spazio
            const invalidServices = selectedServiceIds.filter(id => !availableServiceIds.includes(id));
            if (invalidServices.length > 0) {
                throw new AppError(`Servizi non disponibili per questo spazio: ${invalidServices.join(', ')}`, 400);
            }

            // Calcola costo servizi selezionati
            const selectedServices = spaceServices.filter(s => selectedServiceIds.includes(s.service_id));
            const totalCost = selectedServices.reduce((sum, service) => sum + parseFloat(service.price), 0);

            return {
                services: selectedServices,
                totalCost: parseFloat(totalCost.toFixed(2))
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel calcolo del costo dei servizi aggiuntivi', 500);
        }
    }

    /**
     * Disattiva un servizio (soft delete)
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Object>} Servizio disattivato
     */
    async deactivateService(serviceId) {
        try {
            return await this.updateService(serviceId, { is_active: false });
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella disattivazione del servizio', 500);
        }
    }

    /**
     * Riattiva un servizio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Object>} Servizio riattivato
     */
    async activateService(serviceId) {
        try {
            return await this.updateService(serviceId, { is_active: true });
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella riattivazione del servizio', 500);
        }
    }

    /**
     * Validazione dati servizio
     * @param {Object} serviceData - Dati da validare
     * @private
     */
    static validateServiceData(serviceData) {
        const { service_name, price } = serviceData;

        if (!service_name || typeof service_name !== 'string' || service_name.trim().length === 0) {
            throw new AppError('Nome del servizio è obbligatorio', 400);
        }

        if (price === undefined || price === null || isNaN(price) || parseFloat(price) < 0) {
            throw new AppError('Prezzo del servizio deve essere un numero positivo', 400);
        }

        if (service_name.length > 100) {
            throw new AppError('Nome del servizio non può superare 100 caratteri', 400);
        }
    }
}

module.exports = AdditionalServiceService;
