const SpaceTypeService = require('../../src/backend/services/SpaceTypeService');
const SpaceType = require('../../src/backend/models/SpaceType');
const AppError = require('../../src/backend/utils/AppError');

// Mock delle dipendenze
jest.mock('../../src/backend/models/SpaceType');

describe('SpaceTypeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllSpaceTypes', () => {
        it('dovrebbe restituire tutti i tipi di spazio', async () => {
            // Arrange
            const mockSpaceTypes = [
                { space_type_id: 1, type_name: 'Desk', description: 'Scrivania singola' },
                { space_type_id: 2, type_name: 'Meeting Room', description: 'Sala riunioni' }
            ];
            SpaceType.findAll.mockResolvedValue(mockSpaceTypes);

            // Act
            const result = await SpaceTypeService.getAllSpaceTypes();

            // Assert
            expect(SpaceType.findAll).toHaveBeenCalledWith({});
            expect(result).toEqual(mockSpaceTypes);
        });

        it('dovrebbe passare filtri a findAll', async () => {
            // Arrange
            const filters = { active: true };
            const mockSpaceTypes = [];
            SpaceType.findAll.mockResolvedValue(mockSpaceTypes);

            // Act
            await SpaceTypeService.getAllSpaceTypes(filters);

            // Assert
            expect(SpaceType.findAll).toHaveBeenCalledWith(filters);
        });

        it('dovrebbe gestire errori del database', async () => {
            // Arrange
            SpaceType.findAll.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(SpaceTypeService.getAllSpaceTypes())
                .rejects.toThrow('Errore nel recupero dei tipi di spazio');
        });
    });

    describe('getSpaceTypeById', () => {
        it('dovrebbe restituire tipo di spazio per ID valido', async () => {
            // Arrange
            const mockSpaceType = { space_type_id: 1, type_name: 'Desk' };
            SpaceType.findById.mockResolvedValue(mockSpaceType);

            // Act
            const result = await SpaceTypeService.getSpaceTypeById(1);

            // Assert
            expect(SpaceType.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockSpaceType);
        });

        it('dovrebbe lanciare errore se tipo non trovato', async () => {
            // Arrange
            SpaceType.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(SpaceTypeService.getSpaceTypeById(999))
                .rejects.toThrow('Tipo di spazio non trovato');
        });

        it('dovrebbe gestire errori del database', async () => {
            // Arrange
            SpaceType.findById.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(SpaceTypeService.getSpaceTypeById(1))
                .rejects.toThrow('Errore nel recupero del tipo di spazio');
        });
    });

    describe('createSpaceType', () => {
        const validSpaceTypeData = {
            type_name: 'Hot Desk',
            description: 'Postazione flessibile'
        };

        it('dovrebbe creare tipo di spazio con successo', async () => {
            // Arrange
            const createdSpaceType = { space_type_id: 1, ...validSpaceTypeData };
            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.create.mockResolvedValue(createdSpaceType);

            // Act
            const result = await SpaceTypeService.createSpaceType(validSpaceTypeData);

            // Assert
            expect(SpaceType.findByName).toHaveBeenCalledWith('Hot Desk');
            expect(SpaceType.create).toHaveBeenCalledWith(validSpaceTypeData);
            expect(result).toEqual(createdSpaceType);
        });

        it('dovrebbe lanciare errore se nome già esistente', async () => {
            // Arrange
            const existingSpaceType = { space_type_id: 1, type_name: 'Hot Desk' };
            SpaceType.findByName.mockResolvedValue(existingSpaceType);

            // Act & Assert
            await expect(SpaceTypeService.createSpaceType(validSpaceTypeData))
                .rejects.toThrow('Un tipo di spazio con questo nome esiste già');
        });

        it('dovrebbe validare dati richiesti', async () => {
            // Act & Assert
            await expect(SpaceTypeService.createSpaceType({}))
                .rejects.toThrow('Nome del tipo di spazio è obbligatorio');

            await expect(SpaceTypeService.createSpaceType({ type_name: '' }))
                .rejects.toThrow('Nome del tipo di spazio è obbligatorio');

            await expect(SpaceTypeService.createSpaceType({ type_name: '   ' }))
                .rejects.toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('dovrebbe validare lunghezza nome', async () => {
            // Arrange
            const longName = 'a'.repeat(101);

            // Act & Assert
            await expect(SpaceTypeService.createSpaceType({ type_name: longName }))
                .rejects.toThrow('Nome del tipo di spazio non può superare 100 caratteri');
        });

        it('dovrebbe validare caratteri nome', async () => {
            // Act & Assert
            await expect(SpaceTypeService.createSpaceType({ type_name: 'Test@#$%' }))
                .rejects.toThrow('Nome del tipo di spazio contiene caratteri non validi');
        });

        it('dovrebbe accettare caratteri validi inclusi accenti', async () => {
            // Arrange
            const validNames = [
                'Scrivania Condivisa',
                'Ufficio-Privato',
                'Spazio_Relax',
                'Café Area',
                'Área de Reunión'
            ];

            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.create.mockResolvedValue({ space_type_id: 1 });

            // Act & Assert
            for (const name of validNames) {
                await expect(SpaceTypeService.createSpaceType({ type_name: name }))
                    .resolves.not.toThrow();
            }
        });
    });

    describe('updateSpaceType', () => {
        const mockSpaceType = { space_type_id: 1, type_name: 'Desk' };
        const updateData = { type_name: 'Updated Desk' };

        beforeEach(() => {
            SpaceTypeService.getSpaceTypeById = jest.fn().mockResolvedValue(mockSpaceType);
        });

        it('dovrebbe aggiornare tipo di spazio con successo', async () => {
            // Arrange
            const updatedSpaceType = { ...mockSpaceType, ...updateData };
            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.update.mockResolvedValue(updatedSpaceType);

            // Act
            const result = await SpaceTypeService.updateSpaceType(1, updateData);

            // Assert
            expect(SpaceTypeService.getSpaceTypeById).toHaveBeenCalledWith(1);
            expect(SpaceType.findByName).toHaveBeenCalledWith('Updated Desk');
            expect(SpaceType.update).toHaveBeenCalledWith(1, updateData);
            expect(result).toEqual(updatedSpaceType);
        });

        it('dovrebbe lanciare errore se nessun campo fornito', async () => {
            // Act & Assert
            await expect(SpaceTypeService.updateSpaceType(1, {}))
                .rejects.toThrow('Nessun campo valido fornito per l\'aggiornamento');
        });

        it('dovrebbe verificare unicità nome durante aggiornamento', async () => {
            // Arrange
            const existingSpaceType = { space_type_id: 2, type_name: 'Updated Desk' };
            SpaceType.findByName.mockResolvedValue(existingSpaceType);

            // Act & Assert
            await expect(SpaceTypeService.updateSpaceType(1, updateData))
                .rejects.toThrow('Un tipo di spazio con questo nome esiste già');
        });

        it('dovrebbe permettere aggiornamento con stesso nome', async () => {
            // Arrange
            const sameNameUpdate = { description: 'Nuova descrizione' };
            const existingSpaceType = { space_type_id: 1, type_name: 'Desk' };
            SpaceType.findByName.mockResolvedValue(existingSpaceType);
            SpaceType.update.mockResolvedValue({ ...mockSpaceType, ...sameNameUpdate });

            // Act
            const result = await SpaceTypeService.updateSpaceType(1, sameNameUpdate);

            // Assert
            expect(result).toEqual({ ...mockSpaceType, ...sameNameUpdate });
        });
    });

    describe('deleteSpaceType', () => {
        const mockSpaceType = { space_type_id: 1, type_name: 'Desk' };

        beforeEach(() => {
            SpaceTypeService.getSpaceTypeById = jest.fn().mockResolvedValue(mockSpaceType);
        });

        it('dovrebbe eliminare tipo di spazio con successo', async () => {
            // Arrange
            SpaceType.getSpacesUsingType.mockResolvedValue([]);
            SpaceType.delete.mockResolvedValue(true);

            // Act
            const result = await SpaceTypeService.deleteSpaceType(1);

            // Assert
            expect(SpaceTypeService.getSpaceTypeById).toHaveBeenCalledWith(1);
            expect(SpaceType.getSpacesUsingType).toHaveBeenCalledWith(1);
            expect(SpaceType.delete).toHaveBeenCalledWith(1);
            expect(result).toBe(true);
        });

        it('dovrebbe lanciare errore se tipo è utilizzato da spazi', async () => {
            // Arrange
            const spacesUsingType = [
                { space_id: 1, space_name: 'Space 1' },
                { space_id: 2, space_name: 'Space 2' }
            ];
            SpaceType.getSpacesUsingType.mockResolvedValue(spacesUsingType);

            // Act & Assert
            await expect(SpaceTypeService.deleteSpaceType(1))
                .rejects.toThrow('Impossibile eliminare il tipo di spazio: è utilizzato da 2 spazi');
        });
    });

    describe('getSpacesByType', () => {
        const mockSpaceType = { space_type_id: 1, type_name: 'Desk' };

        beforeEach(() => {
            SpaceTypeService.getSpaceTypeById = jest.fn().mockResolvedValue(mockSpaceType);
        });

        it('dovrebbe restituire spazi per tipo', async () => {
            // Arrange
            const mockSpaces = [
                { space_id: 1, space_name: 'Space 1' },
                { space_id: 2, space_name: 'Space 2' }
            ];
            SpaceType.getSpacesUsingType.mockResolvedValue(mockSpaces);

            // Act
            const result = await SpaceTypeService.getSpacesByType(1);

            // Assert
            expect(SpaceTypeService.getSpaceTypeById).toHaveBeenCalledWith(1);
            expect(SpaceType.getSpacesUsingType).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockSpaces);
        });
    });

    describe('searchSpaceTypes', () => {
        it('dovrebbe cercare tipi di spazio per termine', async () => {
            // Arrange
            const mockResults = [
                { space_type_id: 1, type_name: 'Hot Desk' }
            ];
            SpaceType.search.mockResolvedValue(mockResults);

            // Act
            const result = await SpaceTypeService.searchSpaceTypes('desk');

            // Assert
            expect(SpaceType.search).toHaveBeenCalledWith('desk');
            expect(result).toEqual(mockResults);
        });

        it('dovrebbe pulire termine di ricerca', async () => {
            // Arrange
            SpaceType.search.mockResolvedValue([]);

            // Act
            await SpaceTypeService.searchSpaceTypes('  desk  ');

            // Assert
            expect(SpaceType.search).toHaveBeenCalledWith('desk');
        });

        it('dovrebbe lanciare errore per termine vuoto', async () => {
            // Act & Assert
            await expect(SpaceTypeService.searchSpaceTypes(''))
                .rejects.toThrow('Termine di ricerca obbligatorio');

            await expect(SpaceTypeService.searchSpaceTypes('   '))
                .rejects.toThrow('Termine di ricerca obbligatorio');

            await expect(SpaceTypeService.searchSpaceTypes(null))
                .rejects.toThrow('Termine di ricerca obbligatorio');
        });
    });

    describe('getSpaceTypeStatistics', () => {
        it('dovrebbe restituire statistiche tipi di spazio', async () => {
            // Arrange
            const mockStats = {
                totalTypes: 5,
                mostUsedType: 'Desk',
                averageSpacesPerType: 3.2
            };
            SpaceType.getStatistics.mockResolvedValue(mockStats);

            // Act
            const result = await SpaceTypeService.getSpaceTypeStatistics();

            // Assert
            expect(SpaceType.getStatistics).toHaveBeenCalled();
            expect(result).toEqual(mockStats);
        });

        it('dovrebbe gestire errori del database', async () => {
            // Arrange
            SpaceType.getStatistics.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(SpaceTypeService.getSpaceTypeStatistics())
                .rejects.toThrow('Errore nel calcolo delle statistiche dei tipi di spazio');
        });
    });

    describe('canDelete', () => {
        const mockSpaceType = { space_type_id: 1, type_name: 'Desk' };

        beforeEach(() => {
            SpaceTypeService.getSpaceTypeById = jest.fn().mockResolvedValue(mockSpaceType);
        });

        it('dovrebbe restituire true se tipo può essere eliminato', async () => {
            // Arrange
            SpaceType.getSpacesUsingType.mockResolvedValue([]);

            // Act
            const result = await SpaceTypeService.canDelete(1);

            // Assert
            expect(result).toEqual({
                canDelete: true,
                spacesCount: 0,
                spaces: [],
                message: 'Il tipo di spazio può essere eliminato'
            });
        });

        it('dovrebbe restituire false se tipo è utilizzato', async () => {
            // Arrange
            const spacesUsingType = [
                { space_id: 1, space_name: 'Space 1' }
            ];
            SpaceType.getSpacesUsingType.mockResolvedValue(spacesUsingType);

            // Act
            const result = await SpaceTypeService.canDelete(1);

            // Assert
            expect(result).toEqual({
                canDelete: false,
                spacesCount: 1,
                spaces: spacesUsingType,
                message: 'Impossibile eliminare: utilizzato da 1 spazi'
            });
        });
    });

    describe('validateSpaceTypeData', () => {
        it('dovrebbe validare dati corretti', () => {
            // Arrange
            const validData = { type_name: 'Hot Desk' };

            // Act & Assert
            expect(() => {
                SpaceTypeService.validateSpaceTypeData(validData);
            }).not.toThrow();
        });

        it('dovrebbe lanciare errore per nome mancante', () => {
            // Act & Assert
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({});
            }).toThrow('Nome del tipo di spazio è obbligatorio');

            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: null });
            }).toThrow('Nome del tipo di spazio è obbligatorio');

            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: '' });
            }).toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('dovrebbe lanciare errore per nome troppo lungo', () => {
            // Arrange
            const longName = 'a'.repeat(101);

            // Act & Assert
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: longName });
            }).toThrow('Nome del tipo di spazio non può superare 100 caratteri');
        });

        it('dovrebbe lanciare errore per caratteri non validi', () => {
            // Act & Assert
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: 'Test@#$' });
            }).toThrow('Nome del tipo di spazio contiene caratteri non validi');
        });

        it('dovrebbe accettare caratteri validi', () => {
            // Arrange
            const validNames = [
                'Hot Desk',
                'Meeting-Room',
                'Open_Space',
                'Café Area',
                'Área Común'
            ];

            // Act & Assert
            validNames.forEach(name => {
                expect(() => {
                    SpaceTypeService.validateSpaceTypeData({ type_name: name });
                }).not.toThrow();
            });
        });
    });

    describe('Metodi con istanza', () => {
        let service;

        beforeEach(() => {
            service = new SpaceTypeService();
        });

        describe('getMostPopularSpaceTypes', () => {
            it('dovrebbe restituire tipi più popolari con limite default', async () => {
                // Arrange
                const mockPopular = [
                    { space_type_id: 1, type_name: 'Desk', usage_count: 10 }
                ];
                SpaceType.getMostPopular.mockResolvedValue(mockPopular);

                // Act
                const result = await service.getMostPopularSpaceTypes();

                // Assert
                expect(SpaceType.getMostPopular).toHaveBeenCalledWith(5);
                expect(result).toEqual(mockPopular);
            });

            it('dovrebbe accettare limite personalizzato', async () => {
                // Arrange
                SpaceType.getMostPopular.mockResolvedValue([]);

                // Act
                await service.getMostPopularSpaceTypes(10);

                // Assert
                expect(SpaceType.getMostPopular).toHaveBeenCalledWith(10);
            });
        });

        describe('duplicateSpaceType', () => {
            const mockOriginalType = {
                space_type_id: 1,
                type_name: 'Original',
                description: 'Original description'
            };

            beforeEach(() => {
                service.getSpaceTypeById = jest.fn().mockResolvedValue(mockOriginalType);
            });

            it('dovrebbe duplicare tipo di spazio con successo', async () => {
                // Arrange
                const newName = 'Duplicate';
                const expectedNewType = {
                    space_type_id: 2,
                    type_name: newName,
                    description: 'Original description (Copia)'
                };
                
                SpaceType.findByName.mockResolvedValue(null);
                SpaceType.create.mockResolvedValue(expectedNewType);

                // Act
                const result = await service.duplicateSpaceType(1, newName);

                // Assert
                expect(service.getSpaceTypeById).toHaveBeenCalledWith(1);
                expect(SpaceType.findByName).toHaveBeenCalledWith(newName);
                expect(SpaceType.create).toHaveBeenCalledWith({
                    type_name: newName,
                    description: 'Original description (Copia)'
                });
                expect(result).toEqual(expectedNewType);
            });

            it('dovrebbe creare descrizione di default se originale non ha descrizione', async () => {
                // Arrange
                const typeWithoutDescription = { 
                    ...mockOriginalType, 
                    description: null 
                };
                service.getSpaceTypeById.mockResolvedValue(typeWithoutDescription);
                SpaceType.findByName.mockResolvedValue(null);
                SpaceType.create.mockResolvedValue({});

                // Act
                await service.duplicateSpaceType(1, 'Duplicate');

                // Assert
                expect(SpaceType.create).toHaveBeenCalledWith({
                    type_name: 'Duplicate',
                    description: 'Copia di Original'
                });
            });

            it('dovrebbe lanciare errore se nome già esistente', async () => {
                // Arrange
                const existingType = { space_type_id: 2, type_name: 'Duplicate' };
                SpaceType.findByName.mockResolvedValue(existingType);

                // Act & Assert
                await expect(service.duplicateSpaceType(1, 'Duplicate'))
                    .rejects.toThrow('Un tipo di spazio con questo nome esiste già');
            });
        });

        describe('updateDisplayOrder', () => {
            beforeEach(() => {
                service.getSpaceTypeById = jest.fn().mockResolvedValue({ space_type_id: 1 });
            });

            it('dovrebbe aggiornare ordine con successo', async () => {
                // Arrange
                const orderedIds = [3, 1, 2];
                const updatedTypes = [
                    { space_type_id: 3, display_order: 1 },
                    { space_type_id: 1, display_order: 2 },
                    { space_type_id: 2, display_order: 3 }
                ];
                SpaceType.updateDisplayOrder.mockResolvedValue(updatedTypes);

                // Act
                const result = await service.updateDisplayOrder(orderedIds);

                // Assert
                expect(service.getSpaceTypeById).toHaveBeenCalledTimes(3);
                expect(SpaceType.updateDisplayOrder).toHaveBeenCalledWith(orderedIds);
                expect(result).toEqual(updatedTypes);
            });

            it('dovrebbe lanciare errore per array vuoto', async () => {
                // Act & Assert
                await expect(service.updateDisplayOrder([]))
                    .rejects.toThrow('Array di ID obbligatorio');
            });

            it('dovrebbe lanciare errore per parametro non array', async () => {
                // Act & Assert
                await expect(service.updateDisplayOrder('not-array'))
                    .rejects.toThrow('Array di ID obbligatorio');
            });

            it('dovrebbe verificare esistenza di tutti gli ID', async () => {
                // Arrange
                service.getSpaceTypeById
                    .mockResolvedValueOnce({ space_type_id: 1 })
                    .mockRejectedValueOnce(new AppError('Tipo di spazio non trovato', 404));

                // Act & Assert
                await expect(service.updateDisplayOrder([1, 999]))
                    .rejects.toThrow('Tipo di spazio non trovato');
            });
        });
    });
});
