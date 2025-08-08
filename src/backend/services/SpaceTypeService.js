const SpaceType = require('../models/SpaceType');
const AppError = require('../utils/AppError');

class SpaceTypeService {
    /**
     * Recupera tutti i tipi di spazio
     * @param {Object} filters - Filtri opzionali
     * @returns {Promise<Array>} Array dei tipi di spazio
     */
    static async getAllSpaceTypes(filters = {}) {
        try {
            return await SpaceType.findAll(filters);
        } catch (error) {
            throw new AppError('Errore nel recupero dei tipi di spazio', 500);
        }
    }

    /**
     * Recupera un tipo di spazio per ID
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @returns {Promise<Object>} Tipo di spazio
     */
    static async getSpaceTypeById(spaceTypeId) {
        try {
            const spaceType = await SpaceType.findById(spaceTypeId);
            if (!spaceType) {
                throw new AppError('Tipo di spazio non trovato', 404);
            }
            return spaceType;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero del tipo di spazio', 500);
        }
    }

    /**
     * Crea un nuovo tipo di spazio
     * @param {Object} spaceTypeData - Dati del tipo di spazio
     * @returns {Promise<Object>} Tipo di spazio creato
     */
    static async createSpaceType(spaceTypeData) {
        try {
            // Validazione dati
            this.validateSpaceTypeData(spaceTypeData);

            // Verifica unicità nome
            const existingSpaceType = await SpaceType.findByName(spaceTypeData.type_name);
            if (existingSpaceType) {
                throw new AppError('Un tipo di spazio con questo nome esiste già', 409);
            }

            return await SpaceType.create(spaceTypeData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella creazione del tipo di spazio', 500);
        }
    }

    /**
     * Aggiorna un tipo di spazio esistente
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Tipo di spazio aggiornato
     */
    static async updateSpaceType(spaceTypeId, updateData) {
        try {
            // Verifica esistenza tipo di spazio
            await this.getSpaceTypeById(spaceTypeId);

            // Validazione dati aggiornamento
            if (Object.keys(updateData).length === 0) {
                throw new AppError('Nessun campo valido fornito per l\'aggiornamento', 400);
            }

            // Verifica unicità nome se viene aggiornato
            if (updateData.type_name) {
                const existingSpaceType = await SpaceType.findByName(updateData.type_name);
                if (existingSpaceType && existingSpaceType.space_type_id !== spaceTypeId) {
                    throw new AppError('Un tipo di spazio con questo nome esiste già', 409);
                }
            }

            return await SpaceType.update(spaceTypeId, updateData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'aggiornamento del tipo di spazio', 500);
        }
    }

    /**
     * Elimina un tipo di spazio
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async deleteSpaceType(spaceTypeId) {
        try {
            // Verifica esistenza tipo di spazio
            await this.getSpaceTypeById(spaceTypeId);

            // Verifica se ci sono spazi che utilizzano questo tipo
            const spacesUsingType = await SpaceType.getSpacesUsingType(spaceTypeId);
            if (spacesUsingType.length > 0) {
                throw new AppError(
                    `Impossibile eliminare il tipo di spazio: è utilizzato da ${spacesUsingType.length} spazi`, 
                    400
                );
            }

            return await SpaceType.delete(spaceTypeId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'eliminazione del tipo di spazio', 500);
        }
    }

    /**
     * Recupera tutti gli spazi che utilizzano un tipo specifico
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @returns {Promise<Array>} Array degli spazi
     */
    static async getSpacesByType(spaceTypeId) {
        try {
            // Verifica esistenza tipo di spazio
            await this.getSpaceTypeById(spaceTypeId);
            
            return await SpaceType.getSpacesUsingType(spaceTypeId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nel recupero degli spazi per tipo', 500);
        }
    }

    /**
     * Cerca tipi di spazio per nome
     * @param {string} searchTerm - Termine di ricerca
     * @returns {Promise<Array>} Array dei tipi di spazio trovati
     */
    static async searchSpaceTypes(searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim().length === 0) {
                throw new AppError('Termine di ricerca obbligatorio', 400);
            }

            return await SpaceType.search(searchTerm.trim());
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella ricerca dei tipi di spazio', 500);
        }
    }

    /**
     * Ottiene statistiche sui tipi di spazio
     * @returns {Promise<Object>} Statistiche sui tipi di spazio
     */
    static async getSpaceTypeStatistics() {
        try {
            return await SpaceType.getStatistics();
        } catch (error) {
            throw new AppError('Errore nel calcolo delle statistiche dei tipi di spazio', 500);
        }
    }

    /**
     * Recupera i tipi di spazio più popolari
     * @param {number} limit - Numero massimo di risultati
     * @returns {Promise<Array>} Array dei tipi di spazio più utilizzati
     */
    async getMostPopularSpaceTypes(limit = 5) {
        try {
            return await SpaceType.getMostPopular(limit);
        } catch (error) {
            throw new AppError('Errore nel recupero dei tipi di spazio più popolari', 500);
        }
    }

    /**
     * Verifica se un tipo di spazio può essere eliminato
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @returns {Promise<Object>} Risultato della verifica
     */
    static async canDelete(spaceTypeId) {
        try {
            // Verifica esistenza tipo di spazio
            await this.getSpaceTypeById(spaceTypeId);

            const spacesUsingType = await SpaceType.getSpacesUsingType(spaceTypeId);
            const canDelete = spacesUsingType.length === 0;

            return {
                canDelete,
                spacesCount: spacesUsingType.length,
                spaces: spacesUsingType,
                message: canDelete ? 
                    'Il tipo di spazio può essere eliminato' : 
                    `Impossibile eliminare: utilizzato da ${spacesUsingType.length} spazi`
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella verifica di eliminazione', 500);
        }
    }

    /**
     * Duplica un tipo di spazio con un nuovo nome
     * @param {number} spaceTypeId - ID del tipo di spazio da duplicare
     * @param {string} newTypeName - Nuovo nome per il tipo duplicato
     * @returns {Promise<Object>} Nuovo tipo di spazio creato
     */
    async duplicateSpaceType(spaceTypeId, newTypeName) {
        try {
            // Verifica esistenza tipo di spazio originale
            const originalSpaceType = await this.getSpaceTypeById(spaceTypeId);

            // Verifica unicità nuovo nome
            const existingSpaceType = await SpaceType.findByName(newTypeName);
            if (existingSpaceType) {
                throw new AppError('Un tipo di spazio con questo nome esiste già', 409);
            }

            // Crea nuovo tipo con i dati dell'originale
            const newSpaceTypeData = {
                type_name: newTypeName,
                description: originalSpaceType.description ? 
                    `${originalSpaceType.description} (Copia)` : 
                    `Copia di ${originalSpaceType.type_name}`
            };

            return await SpaceType.create(newSpaceTypeData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nella duplicazione del tipo di spazio', 500);
        }
    }

    /**
     * Aggiorna l'ordine di visualizzazione dei tipi di spazio
     * @param {Array} orderedIds - Array degli ID nell'ordine desiderato
     * @returns {Promise<Array>} Array dei tipi aggiornati
     */
    async updateDisplayOrder(orderedIds) {
        try {
            if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
                throw new AppError('Array di ID obbligatorio', 400);
            }

            // Verifica che tutti gli ID esistano
            for (const id of orderedIds) {
                await this.getSpaceTypeById(id);
            }

            return await SpaceType.updateDisplayOrder(orderedIds);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Errore nell\'aggiornamento dell\'ordine di visualizzazione', 500);
        }
    }

    /**
     * Validazione dati tipo di spazio
     * @param {Object} spaceTypeData - Dati da validare
     * @private
     */
    static validateSpaceTypeData(spaceTypeData) {
        const { type_name } = spaceTypeData;

        if (!type_name || typeof type_name !== 'string' || type_name.trim().length === 0) {
            throw new AppError('Nome del tipo di spazio è obbligatorio', 400);
        }

        if (type_name.length > 100) {
            throw new AppError('Nome del tipo di spazio non può superare 100 caratteri', 400);
        }

        // Verifica caratteri speciali
        const validNameRegex = /^[a-zA-Z0-9\s\-_àáâäéèêëíìîïóòôöúùûüñç]+$/i;
        if (!validNameRegex.test(type_name)) {
            throw new AppError('Nome del tipo di spazio contiene caratteri non validi', 400);
        }
    }
}

module.exports = SpaceTypeService;
