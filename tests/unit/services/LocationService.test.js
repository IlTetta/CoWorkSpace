const LocationService = require('../../../src/backend/services/LocationService');
const Location = require('../../../src/backend/models/Location');
const User = require('../../../src/backend/models/User');
const AppError = require('../../../src/backend/utils/AppError');

// Mock dei modelli
jest.mock('../../../src/backend/models/Location');
jest.mock('../../../src/backend/models/User');

describe('LocationService', () => {
    let adminUser;
    let managerUser;
    let regularUser;
    
    beforeEach(() => {
        // Reset dei mock
        jest.clearAllMocks();
        
        // Setup degli utenti di test
        adminUser = { user_id: 1, role: 'admin' };
        managerUser = { user_id: 2, role: 'manager' };
        regularUser = { user_id: 3, role: 'user' };
    });

    describe('createLocation', () => {
        const locationData = {
            location_name: 'Test Location',
            address: 'Test Address',
            city: 'Test City',
            manager_id: 2
        };

        it('should allow admin to create location', async () => {
            User.findById.mockResolvedValue({ ...managerUser });
            Location.create.mockResolvedValue({ ...locationData, location_id: 1 });

            const result = await LocationService.createLocation(locationData, adminUser);

            expect(Location.create).toHaveBeenCalledWith(locationData);
            expect(result).toHaveProperty('location_id', 1);
        });

        it('should allow manager to create location for themselves', async () => {
            const managerLocationData = { ...locationData, manager_id: managerUser.user_id };
            User.findById.mockResolvedValue({ ...managerUser });
            Location.create.mockResolvedValue({ ...managerLocationData, location_id: 1 });

            const result = await LocationService.createLocation(managerLocationData, managerUser);

            expect(Location.create).toHaveBeenCalledWith(managerLocationData);
            expect(result).toHaveProperty('location_id', 1);
        });

        it('should not allow manager to create location for other managers', async () => {
            const otherManagerLocationData = { ...locationData, manager_id: 999 };

            await expect(
                LocationService.createLocation(otherManagerLocationData, managerUser)
            ).rejects.toThrow('Puoi creare location solo per te stesso');
        });

        it('should not allow regular users to create locations', async () => {
            await expect(
                LocationService.createLocation(locationData, regularUser)
            ).rejects.toThrow('Non hai i permessi per creare una location');
        });

        it('should validate manager exists', async () => {
            User.findById.mockResolvedValue(null);

            await expect(
                LocationService.createLocation(locationData, adminUser)
            ).rejects.toThrow('Manager non trovato');
        });
    });

    describe('updateLocation', () => {
        const location = {
            location_id: 1,
            location_name: 'Test Location',
            manager_id: 2
        };

        const updateData = {
            location_name: 'Updated Location'
        };

        it('should allow admin to update any location', async () => {
            Location.findById.mockResolvedValue(location);
            Location.update.mockResolvedValue({ ...location, ...updateData });

            const result = await LocationService.updateLocation(1, updateData, adminUser);

            expect(Location.update).toHaveBeenCalledWith(1, updateData);
            expect(result.location_name).toBe('Updated Location');
        });

        it('should allow manager to update their own location', async () => {
            Location.findById.mockResolvedValue({ ...location, manager_id: managerUser.user_id });
            Location.update.mockResolvedValue({ ...location, ...updateData, manager_id: managerUser.user_id });

            const result = await LocationService.updateLocation(1, updateData, managerUser);

            expect(Location.update).toHaveBeenCalledWith(1, updateData);
            expect(result.location_name).toBe('Updated Location');
        });

        it('should not allow manager to update other locations', async () => {
            Location.findById.mockResolvedValue({ ...location, manager_id: 999 });

            await expect(
                LocationService.updateLocation(1, updateData, managerUser)
            ).rejects.toThrow('Non hai i permessi per modificare questa location');
        });

        it('should validate location exists', async () => {
            Location.findById.mockResolvedValue(null);

            await expect(
                LocationService.updateLocation(1, updateData, adminUser)
            ).rejects.toThrow('Location non trovata');
        });
    });

    describe('getLocations', () => {
        const locations = [
            { location_id: 1, manager_id: 2, location_name: 'Location 1' },
            { location_id: 2, manager_id: 3, location_name: 'Location 2' }
        ];

        it('should return all locations for admin', async () => {
            Location.findAll.mockResolvedValue(locations);

            const result = await LocationService.getLocations({}, adminUser);

            expect(Location.findAll).toHaveBeenCalledWith({});
            expect(result).toHaveLength(2);
        });

        it('should filter locations for manager', async () => {
            Location.findAll.mockResolvedValue([locations[0]]);

            const result = await LocationService.getLocations({}, managerUser);

            expect(Location.findAll).toHaveBeenCalledWith({ manager_id: managerUser.user_id });
            expect(result).toHaveLength(1);
        });

        it('should apply additional filters', async () => {
            const filters = { city: 'Test City' };
            Location.findAll.mockResolvedValue([locations[0]]);

            await LocationService.getLocations(filters, adminUser);

            expect(Location.findAll).toHaveBeenCalledWith(filters);
        });
    });

    describe('deleteLocation', () => {
        const location = {
            location_id: 1,
            location_name: 'Test Location'
        };

        it('should allow admin to delete location', async () => {
            Location.findById.mockResolvedValue(location);
            Location.delete.mockResolvedValue(true);

            const result = await LocationService.deleteLocation(1, adminUser);

            expect(Location.delete).toHaveBeenCalledWith(1);
            expect(result).toBe(true);
        });

        it('should not allow manager to delete location', async () => {
            Location.findById.mockResolvedValue(location);

            await expect(
                LocationService.deleteLocation(1, managerUser)
            ).rejects.toThrow('Solo gli amministratori possono eliminare locations');
        });

        it('should validate location exists', async () => {
            Location.findById.mockResolvedValue(null);

            await expect(
                LocationService.deleteLocation(1, adminUser)
            ).rejects.toThrow('Location non trovata');
        });
    });

    describe('getLocationDetails', () => {
        const location = {
            location_id: 1,
            manager_id: 2,
            location_name: 'Test Location',
            toJSON: () => ({
                location_id: 1,
                manager_id: 2,
                location_name: 'Test Location'
            })
        };

        const stats = {
            totalSpaces: 5,
            totalBookings: 10
        };

        it('should return location details with stats for admin', async () => {
            Location.findById.mockResolvedValue(location);
            Location.getStats.mockResolvedValue(stats);

            const result = await LocationService.getLocationDetails(1, adminUser);

            expect(result).toEqual({
                location: location.toJSON(),
                statistics: stats
            });
        });

        it('should return location details for manager of the location', async () => {
            Location.findById.mockResolvedValue({ ...location, manager_id: managerUser.user_id });
            Location.getStats.mockResolvedValue(stats);

            const result = await LocationService.getLocationDetails(1, managerUser);

            expect(result).toEqual({
                location: { ...location.toJSON(), manager_id: managerUser.user_id },
                statistics: stats
            });
        });

        it('should not allow manager to view other locations details', async () => {
            Location.findById.mockResolvedValue({ ...location, manager_id: 999 });

            await expect(
                LocationService.getLocationDetails(1, managerUser)
            ).rejects.toThrow('Non hai accesso a questa location');
        });
    });
});
