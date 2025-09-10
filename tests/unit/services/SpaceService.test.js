const SpaceService = require('../../../src/backend/services/SpaceService');
const Space = require('../../../src/backend/models/Space');
const Location = require('../../../src/backend/models/Location');
const AppError = require('../../../src/backend/utils/AppError');

// Mock dei modelli
jest.mock('../../../src/backend/models/Space');
jest.mock('../../../src/backend/models/Location');

describe('SpaceService', () => {
    let adminUser;
    let managerUser;
    let regularUser;
    let mockLocation;
    let mockSpace;
    
    beforeEach(() => {
        // Reset dei mock
        jest.clearAllMocks();
        
        // Setup degli utenti di test
        adminUser = { user_id: 1, role: 'admin' };
        managerUser = { user_id: 2, role: 'manager' };
        regularUser = { user_id: 3, role: 'user' };

        // Setup mock location
        mockLocation = {
            location_id: 1,
            manager_id: managerUser.user_id,
            location_name: 'Test Location',
            toJSON: () => ({
                location_id: 1,
                manager_id: managerUser.user_id,
                location_name: 'Test Location'
            })
        };

        // Setup mock space
        mockSpace = {
            space_id: 1,
            location_id: 1,
            name: 'Test Space',
            capacity: 10,
            price_per_hour: 20,
            price_per_day: 150,
            toJSON: () => ({
                space_id: 1,
                location_id: 1,
                name: 'Test Space',
                capacity: 10,
                price_per_hour: 20,
                price_per_day: 150
            })
        };
    });

    describe('createSpace', () => {
        const spaceData = {
            location_id: 1,
            name: 'New Space',
            capacity: 10,
            price_per_hour: 20,
            price_per_day: 150
        };

        it('should allow admin to create space', async () => {
            Location.findById.mockResolvedValue(mockLocation);
            Space.create.mockResolvedValue({ ...spaceData, space_id: 1 });

            const result = await SpaceService.createSpace(spaceData, adminUser);

            expect(Space.create).toHaveBeenCalledWith(spaceData);
            expect(result).toHaveProperty('space_id', 1);
        });

        it('should allow manager to create space in their location', async () => {
            Location.findById.mockResolvedValue(mockLocation);
            Space.create.mockResolvedValue({ ...spaceData, space_id: 1 });

            const result = await SpaceService.createSpace(spaceData, managerUser);

            expect(Space.create).toHaveBeenCalledWith(spaceData);
            expect(result).toHaveProperty('space_id', 1);
        });

        it('should not allow manager to create space in other locations', async () => {
            Location.findById.mockResolvedValue({ ...mockLocation, manager_id: 999 });

            await expect(
                SpaceService.createSpace(spaceData, managerUser)
            ).rejects.toThrow('Puoi creare spazi solo nelle tue location');
        });

        it('should not allow regular users to create spaces', async () => {
            await expect(
                SpaceService.createSpace(spaceData, regularUser)
            ).rejects.toThrow('Non hai i permessi per creare uno spazio');
        });
    });

    describe('updateSpace', () => {
        const updateData = {
            name: 'Updated Space',
            capacity: 15
        };

        it('should allow admin to update any space', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Location.findById.mockResolvedValue(mockLocation);
            Space.update.mockResolvedValue({ ...mockSpace, ...updateData });

            const result = await SpaceService.updateSpace(1, updateData, adminUser);

            expect(Space.update).toHaveBeenCalledWith(1, updateData);
            expect(result.name).toBe('Updated Space');
        });

        it('should allow manager to update space in their location', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Location.findById.mockResolvedValue(mockLocation);
            Space.update.mockResolvedValue({ ...mockSpace, ...updateData });

            const result = await SpaceService.updateSpace(1, updateData, managerUser);

            expect(Space.update).toHaveBeenCalledWith(1, updateData);
            expect(result.name).toBe('Updated Space');
        });

        it('should not allow manager to update space in other locations', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Location.findById.mockResolvedValue({ ...mockLocation, manager_id: 999 });

            await expect(
                SpaceService.updateSpace(1, updateData, managerUser)
            ).rejects.toThrow('Non hai i permessi per modificare questo spazio');
        });
    });

    describe('getSpaces', () => {
        const spaces = [
            { ...mockSpace },
            { ...mockSpace, space_id: 2, name: 'Test Space 2' }
        ];

        it('should return all spaces for admin', async () => {
            Space.findAll.mockResolvedValue(spaces);

            const result = await SpaceService.getSpaces({}, adminUser);

            expect(Space.findAll).toHaveBeenCalledWith({});
            expect(result).toHaveLength(2);
        });

        it('should filter spaces by location for manager', async () => {
            Location.findByManager.mockResolvedValue([mockLocation]);
            Space.findByLocation.mockResolvedValue([spaces[0]]);

            const result = await SpaceService.getSpaces({}, managerUser);

            expect(result).toHaveLength(1);
        });
    });

    describe('checkSpaceAvailability', () => {
        const startTime = new Date('2025-10-01T10:00:00Z');
        const endTime = new Date('2025-10-01T12:00:00Z');

        it('should check space availability correctly', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Space.checkAvailability.mockResolvedValue(true);

            const result = await SpaceService.checkSpaceAvailability(1, startTime, endTime);

            expect(result).toEqual({
                spaceId: 1,
                available: true,
                period: {
                    start: startTime,
                    end: endTime
                },
                space: mockSpace.toJSON()
            });
        });

        it('should throw error for non-existent space', async () => {
            Space.findById.mockResolvedValue(null);

            await expect(
                SpaceService.checkSpaceAvailability(1, startTime, endTime)
            ).rejects.toThrow('Spazio non trovato');
        });
    });

    describe('calculateBookingPrice', () => {
        const startTime = new Date('2025-10-01T10:00:00Z');
        const endTime = new Date('2025-10-01T14:00:00Z'); // 4 hours

        it('should calculate hourly price correctly', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await SpaceService.calculateBookingPrice(1, startTime, endTime);

            expect(result.pricing.finalPrice).toBe(80); // 4 hours * 20€
            expect(result.pricing.pricingType).toBe('hourly');
        });

        it('should use daily rate when more convenient', async () => {
            const longEndTime = new Date('2025-10-01T22:00:00Z'); // 12 hours
            Space.findById.mockResolvedValue(mockSpace);

            const result = await SpaceService.calculateBookingPrice(1, startTime, longEndTime);

            expect(result.pricing.finalPrice).toBe(150); // daily rate
            expect(result.pricing.pricingType).toBe('daily');
        });

        it('should throw error for invalid dates', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            await expect(
                SpaceService.calculateBookingPrice(1, 'invalid', endTime)
            ).rejects.toThrow('Date non valide');
        });
    });

    describe('searchAvailableSpaces', () => {
        const searchCriteria = {
            startDate: '2025-10-01T10:00:00Z',
            endDate: '2025-10-01T14:00:00Z',
            city: 'Test City',
            capacity: 5
        };

        it('should return available spaces matching criteria', async () => {
            Space.findAvailable.mockResolvedValue([mockSpace]);

            const result = await SpaceService.searchAvailableSpaces(searchCriteria);

            expect(Space.findAvailable).toHaveBeenCalledWith(expect.objectContaining({
                startDate: expect.any(Date),
                endDate: expect.any(Date),
                city: 'Test City',
                capacity: 5
            }));
            expect(result).toHaveLength(1);
        });
    });

    describe('getSpaceDetails', () => {
        it('should return complete space details for admin', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Space.getStats.mockResolvedValue({ totalBookings: 10, revenue: 1000 });

            const result = await SpaceService.getSpaceDetails(1, adminUser);

            expect(result).toEqual({
                space: mockSpace.toJSON(),
                statistics: expect.any(Object)
            });
        });

        it('should return limited details for regular users', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await SpaceService.getSpaceDetails(1, regularUser);

            expect(result.space).toBeDefined();
            expect(result.statistics).toBeNull();
        });
    });

    describe('getSpacesDashboard', () => {
        const mockStats = {
            totalSpaces: 2,
            totalLocations: 1,
            totalCapacity: 20,
            averagePricePerHour: 20
        };

        it('should return dashboard data for manager', async () => {
            Location.findByManager.mockResolvedValue([mockLocation]);
            Space.findByLocation.mockResolvedValue([{
                ...mockSpace,
                location_id: mockLocation.location_id,
                pricePerHour: mockSpace.price_per_hour
            }]);

            const result = await SpaceService.getSpacesDashboard(managerUser);

            expect(result).toHaveProperty('totalStats');
            expect(result.totalStats).toEqual(expect.objectContaining({
                totalSpaces: expect.any(Number),
                totalLocations: expect.any(Number),
                totalCapacity: expect.any(Number),
                averagePricePerHour: expect.any(Number)
            }));
            expect(result).toHaveProperty('locationBreakdown');
            expect(result.locationBreakdown).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    location: expect.any(Object),
                    spaces: expect.any(Array),
                    stats: expect.objectContaining({
                        count: expect.any(Number),
                        totalCapacity: expect.any(Number)
                    })
                })
            ]));
        });

        it('should not allow regular users to access dashboard', async () => {
            await expect(
                SpaceService.getSpacesDashboard(regularUser)
            ).rejects.toThrow('Accesso riservato ai manager');
        });
    });
});
