const LocationService = require('../../src/backend/services/LocationService');
const Location = require('../../src/backend/models/Location');
const User = require('../../src/backend/models/User');
const AppError = require('../../src/backend/utils/AppError');
const db = require('../../src/backend/config/db');

// Mock delle dipendenze
jest.mock('../../src/backend/models/Location');
jest.mock('../../src/backend/models/User');
jest.mock('../../src/backend/config/db');

describe('LocationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock per db.query
        db.query = jest.fn();
    });

    describe('createLocation', () => {
        const mockLocationData = {
            location_name: 'Test Location',
            address: '123 Test St',
            city: 'Test City',
            manager_id: 2
        };

        it('dovrebbe creare location con successo se admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const mockManager = { user_id: 2, role: 'manager' };
            const mockLocation = { location_id: 1, ...mockLocationData };

            User.findById.mockResolvedValue(mockManager);
            Location.create.mockResolvedValue(mockLocation);

            // Act
            const result = await LocationService.createLocation(mockLocationData, adminUser);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(2);
            expect(Location.create).toHaveBeenCalledWith(mockLocationData);
            expect(result).toEqual(mockLocation);
        });

        it('dovrebbe creare location con successo se manager per se stesso', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const locationForSelf = { ...mockLocationData, manager_id: 2 };
            const mockLocation = { location_id: 1, ...locationForSelf };

            User.findById.mockResolvedValue(managerUser);
            Location.create.mockResolvedValue(mockLocation);

            // Act
            const result = await LocationService.createLocation(locationForSelf, managerUser);

            // Assert
            expect(result).toEqual(mockLocation);
        });

        it('dovrebbe lanciare errore se utente normale tenta di creare location', async () => {
            // Arrange
            const normalUser = { user_id: 3, role: 'user' };

            // Act & Assert
            await expect(LocationService.createLocation(mockLocationData, normalUser))
                .rejects.toThrow('Non hai i permessi per creare una location');
        });

        it('dovrebbe lanciare errore se manager tenta di creare location per altro', async () => {
            // Arrange
            const managerUser = { user_id: 3, role: 'manager' };
            const locationForOther = { ...mockLocationData, manager_id: 2 };

            // Act & Assert
            await expect(LocationService.createLocation(locationForOther, managerUser))
                .rejects.toThrow('Puoi creare location solo per te stesso');
        });

        it('dovrebbe lanciare errore se manager specificato non esiste', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.createLocation(mockLocationData, adminUser))
                .rejects.toThrow('Manager non trovato');
        });

        it('dovrebbe lanciare errore se utente specificato non ha ruolo manager', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const normalUser = { user_id: 2, role: 'user' };
            User.findById.mockResolvedValue(normalUser);

            // Act & Assert
            await expect(LocationService.createLocation(mockLocationData, adminUser))
                .rejects.toThrow('L\'utente specificato non ha il ruolo di manager');
        });

        it('dovrebbe permettere creazione senza manager_id', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const locationWithoutManager = { ...mockLocationData };
            delete locationWithoutManager.manager_id;
            const mockLocation = { location_id: 1, ...locationWithoutManager };

            Location.create.mockResolvedValue(mockLocation);

            // Act
            const result = await LocationService.createLocation(locationWithoutManager, adminUser);

            // Assert
            expect(User.findById).not.toHaveBeenCalled();
            expect(result).toEqual(mockLocation);
        });
    });

    describe('updateLocation', () => {
        const mockLocation = {
            location_id: 1,
            location_name: 'Test Location',
            manager_id: 2
        };

        const updateData = {
            location_name: 'Updated Location'
        };

        it('dovrebbe aggiornare location se admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const updatedLocation = { ...mockLocation, ...updateData };

            Location.findById.mockResolvedValue(mockLocation);
            Location.update.mockResolvedValue(updatedLocation);

            // Act
            const result = await LocationService.updateLocation(1, updateData, adminUser);

            // Assert
            expect(Location.findById).toHaveBeenCalledWith(1);
            expect(Location.update).toHaveBeenCalledWith(1, updateData);
            expect(result).toEqual(updatedLocation);
        });

        it('dovrebbe aggiornare location se manager proprietario', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const updatedLocation = { ...mockLocation, ...updateData };

            Location.findById.mockResolvedValue(mockLocation);
            Location.update.mockResolvedValue(updatedLocation);

            // Act
            const result = await LocationService.updateLocation(1, updateData, managerUser);

            // Assert
            expect(result).toEqual(updatedLocation);
        });

        it('dovrebbe lanciare errore se location non trovata', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.updateLocation(999, updateData, adminUser))
                .rejects.toThrow('Location non trovata');
        });

        it('dovrebbe lanciare errore se manager non proprietario', async () => {
            // Arrange
            const otherManagerUser = { user_id: 3, role: 'manager' };
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(LocationService.updateLocation(1, updateData, otherManagerUser))
                .rejects.toThrow('Non hai i permessi per modificare questa location');
        });

        it('dovrebbe lanciare errore se utente normale', async () => {
            // Arrange
            const normalUser = { user_id: 3, role: 'user' };
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(LocationService.updateLocation(1, updateData, normalUser))
                .rejects.toThrow('Non hai i permessi per modificare questa location');
        });

        it('dovrebbe validare nuovo manager quando si cambia manager_id', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const updateWithNewManager = { manager_id: 3 };
            const newManager = { user_id: 3, role: 'manager' };

            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(newManager);
            Location.update.mockResolvedValue({ ...mockLocation, manager_id: 3 });

            // Act
            const result = await LocationService.updateLocation(1, updateWithNewManager, adminUser);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(3);
            expect(result.manager_id).toBe(3);
        });

        it('dovrebbe lanciare errore se nuovo manager non esiste', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const updateWithNewManager = { manager_id: 999 };

            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.updateLocation(1, updateWithNewManager, adminUser))
                .rejects.toThrow('Nuovo manager non trovato');
        });

        it('dovrebbe lanciare errore se nuovo manager non ha ruolo corretto', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const updateWithNewManager = { manager_id: 3 };
            const normalUser = { user_id: 3, role: 'user' };

            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(normalUser);

            // Act & Assert
            await expect(LocationService.updateLocation(1, updateWithNewManager, adminUser))
                .rejects.toThrow('L\'utente specificato non ha il ruolo di manager');
        });
    });

    describe('deleteLocation', () => {
        const mockLocation = {
            location_id: 1,
            location_name: 'Test Location',
            manager_id: 2
        };

        it('dovrebbe eliminare location se admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(mockLocation);
            Location.delete.mockResolvedValue(true);

            // Act
            const result = await LocationService.deleteLocation(1, adminUser);

            // Assert
            expect(Location.findById).toHaveBeenCalledWith(1);
            expect(Location.delete).toHaveBeenCalledWith(1);
            expect(result).toBe(true);
        });

        it('dovrebbe lanciare errore se location non trovata', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.deleteLocation(999, adminUser))
                .rejects.toThrow('Location non trovata');
        });

        it('dovrebbe lanciare errore se non admin', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(LocationService.deleteLocation(1, managerUser))
                .rejects.toThrow('Solo gli amministratori possono eliminare locations');
        });
    });

    describe('getLocations', () => {
        const mockLocations = [
            { location_id: 1, location_name: 'Location 1', manager_id: 2 },
            { location_id: 2, location_name: 'Location 2', manager_id: 2 }
        ];

        it('dovrebbe restituire tutte le locations per admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const filters = { city: 'Test City' };
            Location.findAll.mockResolvedValue(mockLocations);

            // Act
            const result = await LocationService.getLocations(filters, adminUser);

            // Assert
            expect(Location.findAll).toHaveBeenCalledWith(filters);
            expect(result).toEqual(mockLocations);
        });

        it('dovrebbe filtrare per manager_id se utente è manager', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const filters = { city: 'Test City' };
            const expectedFilters = { city: 'Test City', manager_id: 2 };
            Location.findAll.mockResolvedValue(mockLocations);

            // Act
            const result = await LocationService.getLocations(filters, managerUser);

            // Assert
            expect(Location.findAll).toHaveBeenCalledWith(expectedFilters);
            expect(result).toEqual(mockLocations);
        });

        it('dovrebbe restituire locations senza filtri per richieste pubbliche', async () => {
            // Arrange
            const filters = { city: 'Test City' };
            Location.findAll.mockResolvedValue(mockLocations);

            // Act
            const result = await LocationService.getLocations(filters, null);

            // Assert
            expect(Location.findAll).toHaveBeenCalledWith(filters);
            expect(result).toEqual(mockLocations);
        });
    });

    describe('getLocationsWithSpaceTypes', () => {
        const mockLocations = [
            { location_id: 1, location_name: 'Location 1' }
        ];

        it('dovrebbe restituire locations con tipi spazio', async () => {
            // Arrange
            const filters = {};
            const sorting = { sortBy: 'name', sortOrder: 'asc' };
            Location.findAllWithSpaceTypes.mockResolvedValue(mockLocations);

            // Act
            const result = await LocationService.getLocationsWithSpaceTypes(filters, sorting);

            // Assert
            expect(Location.findAllWithSpaceTypes).toHaveBeenCalledWith(filters, 'name', 'asc');
            expect(result).toEqual(mockLocations);
        });

        it('dovrebbe utilizzare valori di default per sorting', async () => {
            // Arrange
            const filters = {};
            Location.findAllWithSpaceTypes.mockResolvedValue(mockLocations);

            // Act
            await LocationService.getLocationsWithSpaceTypes(filters);

            // Assert
            expect(Location.findAllWithSpaceTypes).toHaveBeenCalledWith(filters, 'name', 'asc');
        });

        it('dovrebbe lanciare errore per campo ordinamento non valido', async () => {
            // Arrange
            const filters = {};
            const sorting = { sortBy: 'invalid', sortOrder: 'asc' };

            // Act & Assert
            await expect(LocationService.getLocationsWithSpaceTypes(filters, sorting))
                .rejects.toThrow('Campo di ordinamento non valido');
        });

        it('dovrebbe lanciare errore per ordine non valido', async () => {
            // Arrange
            const filters = {};
            const sorting = { sortBy: 'name', sortOrder: 'invalid' };

            // Act & Assert
            await expect(LocationService.getLocationsWithSpaceTypes(filters, sorting))
                .rejects.toThrow('Ordine non valido');
        });

        it('dovrebbe filtrare per manager se utente è manager', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const filters = {};
            const expectedFilters = { manager_id: 2 };
            Location.findAllWithSpaceTypes.mockResolvedValue(mockLocations);

            // Act
            await LocationService.getLocationsWithSpaceTypes(filters, {}, managerUser);

            // Assert
            expect(Location.findAllWithSpaceTypes).toHaveBeenCalledWith(expectedFilters, 'name', 'asc');
        });
    });

    describe('getLocationDetails', () => {
        const mockLocation = {
            location_id: 1,
            location_name: 'Test Location',
            manager_id: 2,
            toJSON: jest.fn().mockReturnValue({
                location_id: 1,
                location_name: 'Test Location',
                manager_id: 2
            })
        };

        const mockStats = {
            totalSpaces: 5,
            totalBookings: 10,
            revenue: 1000
        };

        it('dovrebbe restituire dettagli location per admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(mockLocation);
            Location.getStats.mockResolvedValue(mockStats);

            // Act
            const result = await LocationService.getLocationDetails(1, adminUser);

            // Assert
            expect(Location.findById).toHaveBeenCalledWith(1);
            expect(Location.getStats).toHaveBeenCalledWith(1);
            expect(result).toEqual({
                location: mockLocation.toJSON(),
                statistics: mockStats
            });
        });

        it('dovrebbe restituire dettagli per manager proprietario', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            Location.findById.mockResolvedValue(mockLocation);
            Location.getStats.mockResolvedValue(mockStats);

            // Act
            const result = await LocationService.getLocationDetails(1, managerUser);

            // Assert
            expect(result).toEqual({
                location: mockLocation.toJSON(),
                statistics: mockStats
            });
        });

        it('dovrebbe lanciare errore se location non trovata', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.getLocationDetails(999, adminUser))
                .rejects.toThrow('Location non trovata');
        });

        it('dovrebbe lanciare errore se manager non proprietario', async () => {
            // Arrange
            const otherManagerUser = { user_id: 3, role: 'manager' };
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(LocationService.getLocationDetails(1, otherManagerUser))
                .rejects.toThrow('Non hai accesso a questa location');
        });

        it('dovrebbe permettere accesso per richieste pubbliche', async () => {
            // Arrange
            Location.findById.mockResolvedValue(mockLocation);
            Location.getStats.mockResolvedValue(mockStats);

            // Act
            const result = await LocationService.getLocationDetails(1, null);

            // Assert
            expect(result).toEqual({
                location: mockLocation.toJSON(),
                statistics: mockStats
            });
        });
    });

    describe('canManageLocation', () => {
        const mockLocation = {
            location_id: 1,
            manager_id: 2
        };

        it('dovrebbe permettere gestione per admin', () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };

            // Act
            const result = LocationService.canManageLocation(mockLocation, adminUser);

            // Assert
            expect(result).toBe(true);
        });

        it('dovrebbe permettere gestione per manager proprietario', () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };

            // Act
            const result = LocationService.canManageLocation(mockLocation, managerUser);

            // Assert
            expect(result).toBe(true);
        });

        it('dovrebbe negare gestione per manager non proprietario', () => {
            // Arrange
            const otherManagerUser = { user_id: 3, role: 'manager' };

            // Act
            const result = LocationService.canManageLocation(mockLocation, otherManagerUser);

            // Assert
            expect(result).toBe(false);
        });

        it('dovrebbe negare gestione per utente normale', () => {
            // Arrange
            const normalUser = { user_id: 3, role: 'user' };

            // Act
            const result = LocationService.canManageLocation(mockLocation, normalUser);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('searchAvailableLocations', () => {
        const mockSearchParams = {
            city: 'Test City',
            spaceType: 'desk',
            startDate: '2024-12-21',
            endDate: '2024-12-21',
            capacity: 2
        };

        const mockDbRows = [
            {
                location_id: 1,
                location_name: 'Location 1',
                city: 'Test City',
                available_spaces: 5,
                min_price: 10.50
            }
        ];

        const mockLocationInstance = {
            toJSON: jest.fn().mockReturnValue({
                location_id: 1,
                location_name: 'Location 1',
                city: 'Test City'
            })
        };

        beforeEach(() => {
            // Mock del costruttore Location
            Location.mockImplementation(() => mockLocationInstance);
        });

        it('dovrebbe cercare location disponibili con parametri completi', async () => {
            // Arrange
            db.query.mockResolvedValue({ rows: mockDbRows });

            // Act
            const result = await LocationService.searchAvailableLocations(mockSearchParams);

            // Assert
            expect(db.query).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                location_id: 1,
                location_name: 'Location 1',
                city: 'Test City',
                availableSpaces: 5,
                minPrice: 10.50
            });
        });

        it('dovrebbe gestire ricerca con parametri parziali', async () => {
            // Arrange
            const partialParams = { city: 'Test City' };
            db.query.mockResolvedValue({ rows: mockDbRows });

            // Act
            const result = await LocationService.searchAvailableLocations(partialParams);

            // Assert
            expect(db.query).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('dovrebbe restituire array vuoto se nessuna location disponibile', async () => {
            // Arrange
            db.query.mockResolvedValue({ rows: [] });

            // Act
            const result = await LocationService.searchAvailableLocations(mockSearchParams);

            // Assert
            expect(result).toEqual([]);
        });

        it('dovrebbe gestire errori nella ricerca', async () => {
            // Arrange
            db.query.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(LocationService.searchAvailableLocations(mockSearchParams))
                .rejects.toThrow('Database error');
        });
    });

    describe('transferLocation', () => {
        const mockLocation = {
            location_id: 1,
            location_name: 'Test Location',
            manager_id: 2
        };

        it('dovrebbe trasferire location se admin', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const newManagerId = 3;
            const newManager = { user_id: 3, role: 'manager' };
            const updatedLocation = { ...mockLocation, manager_id: 3 };

            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(newManager);
            Location.update.mockResolvedValue(updatedLocation);

            // Act
            const result = await LocationService.transferLocation(1, newManagerId, adminUser);

            // Assert
            expect(Location.findById).toHaveBeenCalledWith(1);
            expect(User.findById).toHaveBeenCalledWith(3);
            expect(Location.update).toHaveBeenCalledWith(1, { manager_id: 3 });
            expect(result).toEqual(updatedLocation);
        });

        it('dovrebbe lanciare errore se location non trovata', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.transferLocation(999, 3, adminUser))
                .rejects.toThrow('Location non trovata');
        });

        it('dovrebbe lanciare errore se non admin', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(LocationService.transferLocation(1, 3, managerUser))
                .rejects.toThrow('Solo gli amministratori possono trasferire locations');
        });

        it('dovrebbe lanciare errore se nuovo manager non esiste', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(LocationService.transferLocation(1, 999, adminUser))
                .rejects.toThrow('Nuovo manager non trovato');
        });

        it('dovrebbe lanciare errore se nuovo utente non è manager', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const normalUser = { user_id: 3, role: 'user' };
            
            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(normalUser);

            // Act & Assert
            await expect(LocationService.transferLocation(1, 3, adminUser))
                .rejects.toThrow('L\'utente deve avere il ruolo di manager o admin');
        });

        it('dovrebbe non lanciare errore se stesso manager (non implementato nel codice)', async () => {
            // Arrange
            const adminUser = { user_id: 1, role: 'admin' };
            const currentManager = { user_id: 2, role: 'manager' };
            const updatedLocation = { ...mockLocation, manager_id: 2 };

            Location.findById.mockResolvedValue(mockLocation);
            User.findById.mockResolvedValue(currentManager);
            Location.update.mockResolvedValue(updatedLocation);

            // Act
            const result = await LocationService.transferLocation(1, 2, adminUser);

            // Assert
            expect(result).toEqual(updatedLocation);
        });
    });
});
