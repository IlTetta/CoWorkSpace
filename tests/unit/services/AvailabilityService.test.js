const AvailabilityService = require('../../../src/backend/services/AvailabilityService');
const Availability = require('../../../src/backend/models/Availability');
const Space = require('../../../src/backend/models/Space');
const AppError = require('../../../src/backend/utils/AppError');
const db = require('../../../src/backend/config/db');

// Mocks
jest.mock('../../../src/backend/models/Availability');
jest.mock('../../../src/backend/models/Space');
jest.mock('../../../src/backend/config/db', () => ({
    connect: jest.fn()
}));

describe('AvailabilityService', () => {
    let mockSpace;
    let mockAvailability;
    let mockDbClient;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock dello spazio
        mockSpace = {
            space_id: 1,
            space_name: 'Test Space',
            price_per_hour: 10.00,
            price_per_day: 80.00,
            capacity: 10,
            opening_time: '09:00',
            closing_time: '18:00',
            available_days: [1, 2, 3, 4, 5] // Lun-Ven
        };

        // Mock della disponibilità
        mockAvailability = {
            availability_id: 1,
            space_id: 1,
            availability_date: '2025-09-10',
            start_time: '10:00',
            end_time: '12:00',
            is_available: true
        };

        // Mock del client DB
        mockDbClient = {
            query: jest.fn(),
            release: jest.fn()
        };

        db.connect.mockResolvedValue(mockDbClient);
    });

    describe('getSpaceAvailability', () => {
        it('should return space availability with details', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findBySpaceAndDateRange.mockResolvedValue([mockAvailability]);

            const result = await AvailabilityService.getSpaceAvailability(
                1, '2025-09-10', '2025-09-11'
            );

            expect(result).toHaveProperty('spaceDetails');
            expect(result).toHaveProperty('availabilityBlocks');
            expect(result.spaceDetails.id).toBe(mockSpace.space_id);
            expect(result.availabilityBlocks).toEqual([mockAvailability]);
        });

        it('should throw error for non-existent space', async () => {
            Space.findById.mockResolvedValue(null);

            await expect(
                AvailabilityService.getSpaceAvailability(999, '2025-09-10', '2025-09-11')
            ).rejects.toThrow('Spazio non trovato');
        });

        it('should validate date range', async () => {
            await expect(
                AvailabilityService.getSpaceAvailability(1, '2025-09-11', '2025-09-10')
            ).rejects.toThrow('La data di inizio deve essere precedente alla data di fine');
        });
    });

    describe('createAvailability', () => {
        const validData = {
            space_id: 1,
            availability_date: '2025-09-10',
            start_time: '10:00',
            end_time: '12:00'
        };

        it('should create new availability block', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findOverlappingBlocks.mockResolvedValue([]);
            Availability.create.mockResolvedValue(mockAvailability);

            const result = await AvailabilityService.createAvailability(validData);

            expect(result).toEqual(mockAvailability);
            expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should validate time within opening hours', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            await expect(
                AvailabilityService.createAvailability({
                    ...validData,
                    start_time: '08:00', // Prima dell'apertura
                    end_time: '10:00'
                })
            ).rejects.toThrow('Orario fuori dall\'orario di apertura dello spazio');
        });

        it('should validate available days', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            await expect(
                AvailabilityService.createAvailability({
                    ...validData,
                    availability_date: '2025-09-14' // Domenica
                })
            ).rejects.toThrow('Il giorno selezionato non è tra i giorni disponibili dello spazio');
        });

        it('should check for overlaps', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findOverlappingBlocks.mockResolvedValue([mockAvailability]);

            await expect(
                AvailabilityService.createAvailability(validData)
            ).rejects.toThrow('Blocco di disponibilità già esistente');
        });
    });

    describe('updateAvailability', () => {
        const updateData = {
            start_time: '11:00',
            end_time: '13:00'
        };

        it('should update availability block', async () => {
            Availability.findById.mockResolvedValue(mockAvailability);
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findOverlappingBlocks.mockResolvedValue([]);
            Availability.update.mockResolvedValue({ ...mockAvailability, ...updateData });

            const result = await AvailabilityService.updateAvailability(1, updateData);

            expect(result).toEqual({ ...mockAvailability, ...updateData });
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should validate updated time within opening hours', async () => {
            Availability.findById.mockResolvedValue(mockAvailability);
            Space.findById.mockResolvedValue(mockSpace);

            await expect(
                AvailabilityService.updateAvailability(1, {
                    start_time: '19:00', // Dopo la chiusura
                    end_time: '20:00'
                })
            ).rejects.toThrow('Orario fuori dall\'orario di apertura dello spazio');
        });

        it('should check for overlaps after update', async () => {
            Availability.findById.mockResolvedValue(mockAvailability);
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findOverlappingBlocks.mockResolvedValue([{ ...mockAvailability, availability_id: 2 }]);

            await expect(
                AvailabilityService.updateAvailability(1, updateData)
            ).rejects.toThrow('Blocco di disponibilità già esistente');
        });
    });

    describe('deleteAvailability', () => {
        it('should delete availability block', async () => {
            Availability.findById.mockResolvedValue(mockAvailability);
            Availability.hasAssociatedBookings.mockResolvedValue(false);
            Availability.delete.mockResolvedValue(true);

            const result = await AvailabilityService.deleteAvailability(1);

            expect(result).toBe(true);
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should prevent deletion with associated bookings', async () => {
            Availability.findById.mockResolvedValue(mockAvailability);
            Availability.hasAssociatedBookings.mockResolvedValue(true);

            await expect(
                AvailabilityService.deleteAvailability(1)
            ).rejects.toThrow('Impossibile eliminare il blocco: esistono prenotazioni associate');
        });
    });

    describe('generateAvailabilitySchedule', () => {
        it('should generate availability blocks for date range', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findBySpaceDateTime.mockResolvedValue(null);
            Availability.create.mockResolvedValue(mockAvailability);

            const result = await AvailabilityService.generateAvailabilitySchedule(
                1,
                '2025-09-10',
                '2025-09-12',
                '10:00',
                '12:00'
            );

            expect(result.length).toBeGreaterThan(0);
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should skip weekend days', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findBySpaceDateTime.mockResolvedValue(null);
            Availability.create.mockResolvedValue(mockAvailability);

            const result = await AvailabilityService.generateAvailabilitySchedule(
                1,
                '2025-09-13', // Sabato
                '2025-09-14', // Domenica
                '10:00',
                '12:00'
            );

            expect(result.length).toBe(0);
        });

        it('should skip existing blocks', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findBySpaceDateTime.mockResolvedValue(mockAvailability);

            const result = await AvailabilityService.generateAvailabilitySchedule(
                1,
                '2025-09-10',
                '2025-09-10',
                '10:00',
                '12:00'
            );

            expect(result.length).toBe(0);
            expect(Availability.create).not.toHaveBeenCalled();
        });
    });

    describe('checkBookingAvailability', () => {
        it('should return available when space is free', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findAvailableBlocks.mockResolvedValue([mockAvailability]);
            Availability.findConflictingBookings.mockResolvedValue([]);

            const result = await AvailabilityService.checkBookingAvailability(
                1,
                '2025-09-10',
                '10:00',
                '12:00'
            );

            expect(result.isAvailable).toBe(true);
            expect(result.conflicts).toHaveLength(0);
        });

        it('should return not available for unavailable day', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await AvailabilityService.checkBookingAvailability(
                1,
                '2025-09-14', // Domenica
                '10:00',
                '12:00'
            );

            expect(result.isAvailable).toBe(false);
            expect(result.message).toContain('non è disponibile in questo giorno');
        });

        it('should return not available for time outside opening hours', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await AvailabilityService.checkBookingAvailability(
                1,
                '2025-09-10',
                '19:00',
                '20:00'
            );

            expect(result.isAvailable).toBe(false);
            expect(result.message).toContain('fuori dall\'orario di apertura');
        });
    });

    describe('getAvailabilityStatistics', () => {
        const mockStats = {
            totalBlocks: 10,
            availableBlocks: 8,
            bookedBlocks: 2,
            utilizationRate: 0.2
        };

        it('should return availability statistics', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.getStatistics.mockResolvedValue(mockStats);

            const result = await AvailabilityService.getAvailabilityStatistics(
                1,
                '2025-09-10',
                '2025-09-11'
            );

            expect(result).toHaveProperty('spaceInfo');
            expect(result).toHaveProperty('periodInfo');
            expect(result).toHaveProperty('totalBlocks', mockStats.totalBlocks);
        });

        it('should throw error for non-existent space', async () => {
            Space.findById.mockResolvedValue(null);

            await expect(
                AvailabilityService.getAvailabilityStatistics(999, '2025-09-10', '2025-09-11')
            ).rejects.toThrow('Spazio non trovato');
        });
    });

    describe('disableAvailabilityPeriod', () => {
        it('should disable availability for period', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.hasBookingsInPeriod.mockResolvedValue(false);
            Availability.disablePeriod.mockResolvedValue([mockAvailability]);

            const result = await AvailabilityService.disableAvailabilityPeriod(
                1,
                '2025-09-10',
                '2025-09-11',
                'Manutenzione'
            );

            expect(result).toEqual([mockAvailability]);
            expect(Availability.hasBookingsInPeriod).toHaveBeenCalledWith(1, '2025-09-10', '2025-09-11');
            expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should prevent disabling period with bookings', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Availability.hasBookingsInPeriod.mockResolvedValue(true);

            await expect(
                AvailabilityService.disableAvailabilityPeriod(1, '2025-09-10', '2025-09-11')
            ).rejects.toThrow('Esistono prenotazioni nel periodo selezionato');

            expect(Availability.hasBookingsInPeriod).toHaveBeenCalledWith(1, '2025-09-10', '2025-09-11');
            expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    describe('validation methods', () => {
        describe('validateAvailabilityQuery', () => {
            it('should validate correct query parameters', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityQuery(1, '2025-09-10', '2025-09-11');
                }).not.toThrow();
            });

            it('should throw error for missing parameters', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityQuery(null, '2025-09-10', '2025-09-11');
                }).toThrow('Space ID, data di inizio e data di fine sono obbligatori');
            });

            it('should throw error for invalid dates', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityQuery(1, 'invalid-date', '2025-09-11');
                }).toThrow('Formato data non valido');
            });
        });

        describe('validateAvailabilityData', () => {
            it('should validate correct availability data', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityData({
                        space_id: 1,
                        availability_date: '2025-09-10',
                        start_time: '10:00',
                        end_time: '12:00'
                    });
                }).not.toThrow();
            });

            it('should throw error for invalid time format', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityData({
                        space_id: 1,
                        availability_date: '2025-09-10',
                        start_time: 'invalid-time',
                        end_time: '12:00'
                    });
                }).toThrow('Formato ora non valido');
            });

            it('should throw error for end time before start time', () => {
                expect(() => {
                    AvailabilityService.validateAvailabilityData({
                        space_id: 1,
                        availability_date: '2025-09-10',
                        start_time: '12:00',
                        end_time: '10:00'
                    });
                }).toThrow('L\'ora di inizio deve essere precedente all\'ora di fine');
            });
        });

        describe('isWithinOpeningHours', () => {
            it('should return true for time within opening hours', () => {
                const result = AvailabilityService.isWithinOpeningHours(
                    '10:00',
                    '12:00',
                    mockSpace
                );
                expect(result).toBe(true);
            });

            it('should return false for time outside opening hours', () => {
                const result = AvailabilityService.isWithinOpeningHours(
                    '08:00',
                    '19:00',
                    mockSpace
                );
                expect(result).toBe(false);
            });
        });
    });
});
