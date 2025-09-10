const SpaceTypeService = require('../../../src/backend/services/SpaceTypeService');
const SpaceType = require('../../../src/backend/models/SpaceType');
const AppError = require('../../../src/backend/utils/AppError');

// Mocks
jest.mock('../../../src/backend/models/SpaceType');

describe('SpaceTypeService', () => {
    let mockSpaceType;
    let mockSpaces;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock del tipo di spazio
        mockSpaceType = {
            space_type_id: 1,
            type_name: 'Ufficio Privato',
            description: 'Spazio privato per piccoli team',
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z'
        };

        // Mock degli spazi che utilizzano il tipo
        mockSpaces = [
            {
                space_id: 1,
                space_name: 'Ufficio 1',
                space_type_id: 1
            },
            {
                space_id: 2,
                space_name: 'Ufficio 2',
                space_type_id: 1
            }
        ];
    });

    describe('getAllSpaceTypes', () => {
        it('should return all space types', async () => {
            SpaceType.findAll.mockResolvedValue([mockSpaceType]);

            const result = await SpaceTypeService.getAllSpaceTypes();

            expect(result).toEqual([mockSpaceType]);
            expect(SpaceType.findAll).toHaveBeenCalledWith({});
        });

        it('should return space types with filters', async () => {
            const filters = { active: true };
            SpaceType.findAll.mockResolvedValue([mockSpaceType]);

            const result = await SpaceTypeService.getAllSpaceTypes(filters);

            expect(result).toEqual([mockSpaceType]);
            expect(SpaceType.findAll).toHaveBeenCalledWith(filters);
        });

        it('should handle database errors', async () => {
            SpaceType.findAll.mockRejectedValue(new Error('Database error'));

            await expect(SpaceTypeService.getAllSpaceTypes()).rejects.toThrow(
                'Errore nel recupero dei tipi di spazio'
            );
        });
    });

    describe('getSpaceTypeById', () => {
        it('should return space type by ID', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);

            const result = await SpaceTypeService.getSpaceTypeById(1);

            expect(result).toEqual(mockSpaceType);
            expect(SpaceType.findById).toHaveBeenCalledWith(1);
        });

        it('should throw error for non-existent space type', async () => {
            SpaceType.findById.mockResolvedValue(null);

            await expect(SpaceTypeService.getSpaceTypeById(999)).rejects.toThrow(
                'Tipo di spazio non trovato'
            );
        });

        it('should handle database errors', async () => {
            SpaceType.findById.mockRejectedValue(new Error('Database error'));

            await expect(SpaceTypeService.getSpaceTypeById(1)).rejects.toThrow(
                'Errore nel recupero del tipo di spazio'
            );
        });
    });

    describe('createSpaceType', () => {
        const validSpaceTypeData = {
            type_name: 'Nuovo Tipo',
            description: 'Descrizione del nuovo tipo'
        };

        it('should create new space type successfully', async () => {
            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.create.mockResolvedValue({ ...mockSpaceType, ...validSpaceTypeData });

            const result = await SpaceTypeService.createSpaceType(validSpaceTypeData);

            expect(result).toEqual({ ...mockSpaceType, ...validSpaceTypeData });
            expect(SpaceType.findByName).toHaveBeenCalledWith('Nuovo Tipo');
            expect(SpaceType.create).toHaveBeenCalledWith(validSpaceTypeData);
        });

        it('should throw error for duplicate name', async () => {
            SpaceType.findByName.mockResolvedValue(mockSpaceType);

            await expect(
                SpaceTypeService.createSpaceType(validSpaceTypeData)
            ).rejects.toThrow('Un tipo di spazio con questo nome esiste già');
        });

        it('should validate required fields', async () => {
            await expect(
                SpaceTypeService.createSpaceType({})
            ).rejects.toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('should validate name length', async () => {
            const longName = 'a'.repeat(101);
            
            await expect(
                SpaceTypeService.createSpaceType({ type_name: longName })
            ).rejects.toThrow('Nome del tipo di spazio non può superare 100 caratteri');
        });

        it('should validate name format', async () => {
            await expect(
                SpaceTypeService.createSpaceType({ type_name: 'Invalid@Name!' })
            ).rejects.toThrow('Nome del tipo di spazio contiene caratteri non validi');
        });

        it('should handle database errors', async () => {
            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.create.mockRejectedValue(new Error('Database error'));

            await expect(
                SpaceTypeService.createSpaceType(validSpaceTypeData)
            ).rejects.toThrow('Errore nella creazione del tipo di spazio');
        });
    });

    describe('updateSpaceType', () => {
        const updateData = {
            type_name: 'Nome Aggiornato',
            description: 'Descrizione aggiornata'
        };

        it('should update space type successfully', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.findByName.mockResolvedValue(null);
            SpaceType.update.mockResolvedValue({ ...mockSpaceType, ...updateData });

            const result = await SpaceTypeService.updateSpaceType(1, updateData);

            expect(result).toEqual({ ...mockSpaceType, ...updateData });
            expect(SpaceType.update).toHaveBeenCalledWith(1, updateData);
        });

        it('should throw error for non-existent space type', async () => {
            SpaceType.findById.mockResolvedValue(null);

            await expect(
                SpaceTypeService.updateSpaceType(999, updateData)
            ).rejects.toThrow('Tipo di spazio non trovato');
        });

        it('should throw error for empty update data', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);

            await expect(
                SpaceTypeService.updateSpaceType(1, {})
            ).rejects.toThrow('Nessun campo valido fornito per l\'aggiornamento');
        });

        it('should check name uniqueness when updating name', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.findByName.mockResolvedValue({ ...mockSpaceType, space_type_id: 2 });

            await expect(
                SpaceTypeService.updateSpaceType(1, { type_name: 'Nome Esistente' })
            ).rejects.toThrow('Un tipo di spazio con questo nome esiste già');
        });

        it('should allow same name for same space type', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.findByName.mockResolvedValue(mockSpaceType);
            SpaceType.update.mockResolvedValue(mockSpaceType);

            const result = await SpaceTypeService.updateSpaceType(1, { type_name: 'Ufficio Privato' });

            expect(result).toEqual(mockSpaceType);
        });
    });

    describe('deleteSpaceType', () => {
        it('should delete space type successfully when no spaces use it', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.getSpacesUsingType.mockResolvedValue([]);
            SpaceType.delete.mockResolvedValue(true);

            const result = await SpaceTypeService.deleteSpaceType(1);

            expect(result).toBe(true);
            expect(SpaceType.delete).toHaveBeenCalledWith(1);
        });

        it('should prevent deletion when spaces are using the type', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.getSpacesUsingType.mockResolvedValue(mockSpaces);

            await expect(
                SpaceTypeService.deleteSpaceType(1)
            ).rejects.toThrow('Impossibile eliminare il tipo di spazio: è utilizzato da 2 spazi');
        });

        it('should throw error for non-existent space type', async () => {
            SpaceType.findById.mockResolvedValue(null);

            await expect(
                SpaceTypeService.deleteSpaceType(999)
            ).rejects.toThrow('Tipo di spazio non trovato');
        });
    });

    describe('getSpacesByType', () => {
        it('should return spaces using the type', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.getSpacesUsingType.mockResolvedValue(mockSpaces);

            const result = await SpaceTypeService.getSpacesByType(1);

            expect(result).toEqual(mockSpaces);
            expect(SpaceType.getSpacesUsingType).toHaveBeenCalledWith(1);
        });

        it('should throw error for non-existent space type', async () => {
            SpaceType.findById.mockResolvedValue(null);

            await expect(
                SpaceTypeService.getSpacesByType(999)
            ).rejects.toThrow('Tipo di spazio non trovato');
        });
    });

    describe('searchSpaceTypes', () => {
        it('should search space types by term', async () => {
            SpaceType.search.mockResolvedValue([mockSpaceType]);

            const result = await SpaceTypeService.searchSpaceTypes('Ufficio');

            expect(result).toEqual([mockSpaceType]);
            expect(SpaceType.search).toHaveBeenCalledWith('Ufficio');
        });

        it('should throw error for empty search term', async () => {
            await expect(
                SpaceTypeService.searchSpaceTypes('')
            ).rejects.toThrow('Termine di ricerca obbligatorio');

            await expect(
                SpaceTypeService.searchSpaceTypes('   ')
            ).rejects.toThrow('Termine di ricerca obbligatorio');
        });

        it('should trim search term', async () => {
            SpaceType.search.mockResolvedValue([mockSpaceType]);

            await SpaceTypeService.searchSpaceTypes('  Ufficio  ');

            expect(SpaceType.search).toHaveBeenCalledWith('Ufficio');
        });
    });

    describe('getSpaceTypeStatistics', () => {
        it('should return statistics', async () => {
            const mockStats = {
                totalSpaceTypes: 5,
                totalSpaces: 20,
                averageSpacesPerType: 4
            };

            SpaceType.getStatistics.mockResolvedValue(mockStats);

            const result = await SpaceTypeService.getSpaceTypeStatistics();

            expect(result).toEqual(mockStats);
            expect(SpaceType.getStatistics).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            SpaceType.getStatistics.mockRejectedValue(new Error('Database error'));

            await expect(
                SpaceTypeService.getSpaceTypeStatistics()
            ).rejects.toThrow('Errore nel calcolo delle statistiche dei tipi di spazio');
        });
    });

    describe('canDelete', () => {
        it('should return true when space type can be deleted', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.getSpacesUsingType.mockResolvedValue([]);

            const result = await SpaceTypeService.canDelete(1);

            expect(result).toEqual({
                canDelete: true,
                spacesCount: 0,
                spaces: [],
                message: 'Il tipo di spazio può essere eliminato'
            });
        });

        it('should return false when space type cannot be deleted', async () => {
            SpaceType.findById.mockResolvedValue(mockSpaceType);
            SpaceType.getSpacesUsingType.mockResolvedValue(mockSpaces);

            const result = await SpaceTypeService.canDelete(1);

            expect(result).toEqual({
                canDelete: false,
                spacesCount: 2,
                spaces: mockSpaces,
                message: 'Impossibile eliminare: utilizzato da 2 spazi'
            });
        });
    });

    describe('validateSpaceTypeData', () => {
        it('should validate correct data', () => {
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({
                    type_name: 'Ufficio Privato'
                });
            }).not.toThrow();
        });

        it('should throw error for missing name', () => {
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({});
            }).toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('should throw error for empty name', () => {
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: '' });
            }).toThrow('Nome del tipo di spazio è obbligatorio');

            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: '   ' });
            }).toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('should throw error for non-string name', () => {
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: 123 });
            }).toThrow('Nome del tipo di spazio è obbligatorio');
        });

        it('should throw error for name too long', () => {
            const longName = 'a'.repeat(101);
            expect(() => {
                SpaceTypeService.validateSpaceTypeData({ type_name: longName });
            }).toThrow('Nome del tipo di spazio non può superare 100 caratteri');
        });

        it('should accept valid names with special characters', () => {
            const validNames = [
                'Ufficio Privato',
                'Sala-Riunioni',
                'Area_Relax',
                'Ufficio Moderno',
                'Stanza-Meeting_Grande'
            ];

            validNames.forEach(name => {
                expect(() => {
                    SpaceTypeService.validateSpaceTypeData({ type_name: name });
                }).not.toThrow();
            });
        });

        it('should reject names with invalid characters', () => {
            const invalidNames = [
                'Ufficio@Private',
                'Sala#Riunioni',
                'Area$Relax',
                'Spazio%Café',
                'Ufficio&Meeting',
                'Stanza*Grande',
                'Ufficio 2.0' // Il punto non è consentito
            ];

            invalidNames.forEach(name => {
                expect(() => {
                    SpaceTypeService.validateSpaceTypeData({ type_name: name });
                }).toThrow('Nome del tipo di spazio contiene caratteri non validi');
            });
        });
    });
});
