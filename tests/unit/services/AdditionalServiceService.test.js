const AdditionalServiceService = require('../../../src/backend/services/AdditionalServiceService');
const AdditionalService = require('../../../src/backend/models/AdditionalService');
const AppError = require('../../../src/backend/utils/AppError');

// Mock del modello
jest.mock('../../../src/backend/models/AdditionalService');

describe('AdditionalServiceService', () => {
    let mockService;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock service
        mockService = {
            service_id: 1,
            service_name: 'Test Service',
            price: 10.00,
            description: 'Test Description',
            is_active: true
        };
    });

    describe('getAllActiveServices', () => {
        it('should return all active services', async () => {
            const services = [mockService];
            AdditionalService.findAll.mockResolvedValue(services);

            const result = await AdditionalServiceService.getAllActiveServices();

            expect(AdditionalService.findAll).toHaveBeenCalledWith({ is_active: true });
            expect(result).toEqual(services);
        });

        it('should handle errors', async () => {
            AdditionalService.findAll.mockRejectedValue(new Error('DB Error'));

            await expect(
                AdditionalServiceService.getAllActiveServices()
            ).rejects.toThrow('Errore nel recupero dei servizi aggiuntivi');
        });
    });

    describe('getServiceById', () => {
        it('should return service by id', async () => {
            AdditionalService.findById.mockResolvedValue(mockService);

            const result = await AdditionalServiceService.getServiceById(1);

            expect(result).toEqual(mockService);
        });

        it('should throw error for non-existent service', async () => {
            AdditionalService.findById.mockResolvedValue(null);

            await expect(
                AdditionalServiceService.getServiceById(999)
            ).rejects.toThrow('Servizio aggiuntivo non trovato');
        });
    });

    describe('createService', () => {
        const serviceData = {
            service_name: 'New Service',
            price: 15.00,
            description: 'New Description'
        };

        it('should create new service', async () => {
            AdditionalService.findByName.mockResolvedValue(null);
            AdditionalService.create.mockResolvedValue({ ...serviceData, service_id: 2 });

            const result = await AdditionalServiceService.createService(serviceData);

            expect(AdditionalService.create).toHaveBeenCalledWith(serviceData);
            expect(result).toHaveProperty('service_id', 2);
        });

        it('should validate service data', async () => {
            await expect(
                AdditionalServiceService.createService({ ...serviceData, price: -10 })
            ).rejects.toThrow('Prezzo del servizio deve essere un numero positivo');
        });

        it('should prevent duplicate service names', async () => {
            AdditionalService.findByName.mockResolvedValue(mockService);

            await expect(
                AdditionalServiceService.createService(serviceData)
            ).rejects.toThrow('Un servizio con questo nome esiste già');
        });
    });

    describe('updateService', () => {
        const updateData = {
            service_name: 'Updated Service',
            price: 20.00
        };

        it('should update existing service', async () => {
            AdditionalService.findById.mockResolvedValue(mockService);
            AdditionalService.findByName.mockResolvedValue(null);
            AdditionalService.update.mockResolvedValue({ ...mockService, ...updateData });

            const result = await AdditionalServiceService.updateService(1, updateData);

            expect(AdditionalService.update).toHaveBeenCalledWith(1, updateData);
            expect(result.service_name).toBe('Updated Service');
        });

        it('should prevent duplicate names on update', async () => {
            AdditionalService.findById.mockResolvedValue(mockService);
            AdditionalService.findByName.mockResolvedValue({ ...mockService, service_id: 2 });

            await expect(
                AdditionalServiceService.updateService(1, updateData)
            ).rejects.toThrow('Un servizio con questo nome esiste già');
        });
    });

    describe('deleteService', () => {
        it('should delete service if not associated with spaces', async () => {
            AdditionalService.findById.mockResolvedValue(mockService);
            AdditionalService.getServiceSpaceAssociations.mockResolvedValue([]);
            AdditionalService.delete.mockResolvedValue(true);

            const result = await AdditionalServiceService.deleteService(1);

            expect(result).toBe(true);
        });

        it('should prevent deletion of service associated with spaces', async () => {
            AdditionalService.findById.mockResolvedValue(mockService);
            AdditionalService.getServiceSpaceAssociations.mockResolvedValue([{ space_id: 1 }]);

            await expect(
                AdditionalServiceService.deleteService(1)
            ).rejects.toThrow('Impossibile eliminare il servizio: è associato a uno o più spazi');
        });
    });

    describe('space associations', () => {
        describe('addServiceToSpace', () => {
            it('should add service to space', async () => {
                AdditionalService.findById.mockResolvedValue(mockService);
                AdditionalService.checkSpaceServiceAssociation.mockResolvedValue(false);
                AdditionalService.addToSpace.mockResolvedValue(true);

                const result = await AdditionalServiceService.addServiceToSpace(1, 1);

                expect(result).toBe(true);
            });

            it('should prevent duplicate associations', async () => {
                AdditionalService.findById.mockResolvedValue(mockService);
                AdditionalService.checkSpaceServiceAssociation.mockResolvedValue(true);

                await expect(
                    AdditionalServiceService.addServiceToSpace(1, 1)
                ).rejects.toThrow('Questo servizio è già associato a questo spazio');
            });
        });

        describe('removeServiceFromSpace', () => {
            it('should remove service from space', async () => {
                AdditionalService.checkSpaceServiceAssociation.mockResolvedValue(true);
                AdditionalService.removeFromSpace.mockResolvedValue(true);

                const result = await AdditionalServiceService.removeServiceFromSpace(1, 1);

                expect(result).toBe(true);
            });

            it('should throw error if association does not exist', async () => {
                AdditionalService.checkSpaceServiceAssociation.mockResolvedValue(false);

                await expect(
                    AdditionalServiceService.removeServiceFromSpace(1, 1)
                ).rejects.toThrow('Associazione servizio-spazio non trovata');
            });
        });

        describe('getServicesBySpace', () => {
            it('should return services for a space', async () => {
                const spaceServices = [mockService];
                AdditionalService.findBySpace.mockResolvedValue(spaceServices);

                const result = await AdditionalServiceService.getServicesBySpace(1);

                expect(result).toEqual(spaceServices);
            });
        });
    });

    describe('validateServiceData', () => {
        it('should validate valid service data', () => {
            const validData = {
                service_name: 'Valid Service',
                price: 10.00
            };

            expect(() => 
                AdditionalServiceService.validateServiceData(validData)
            ).not.toThrow();
        });

        it('should throw error for missing name', () => {
            const invalidData = {
                price: 10.00
            };

            expect(() => 
                AdditionalServiceService.validateServiceData(invalidData)
            ).toThrow('Nome del servizio è obbligatorio');
        });

        it('should throw error for invalid price', () => {
            const invalidData = {
                service_name: 'Test Service',
                price: -10
            };

            expect(() => 
                AdditionalServiceService.validateServiceData(invalidData)
            ).toThrow('Prezzo del servizio deve essere un numero positivo');
        });

        it('should throw error for too long name', () => {
            const invalidData = {
                service_name: 'a'.repeat(101),
                price: 10.00
            };

            expect(() => 
                AdditionalServiceService.validateServiceData(invalidData)
            ).toThrow('Nome del servizio non può superare 100 caratteri');
        });
    });
});
