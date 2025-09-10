const BookingService = require('../../../src/backend/services/BookingService');
const Booking = require('../../../src/backend/models/Booking');
const Space = require('../../../src/backend/models/Space');
const Location = require('../../../src/backend/models/Location');
const AppError = require('../../../src/backend/utils/AppError');

// Mock dei modelli
jest.mock('../../../src/backend/models/Booking');
jest.mock('../../../src/backend/models/Space');
jest.mock('../../../src/backend/models/Location');

describe('BookingService', () => {
    let adminUser;
    let managerUser;
    let regularUser;
    let mockSpace;
    let mockBooking;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup degli utenti di test
        adminUser = { user_id: 1, role: 'admin' };
        managerUser = { user_id: 2, role: 'manager' };
        regularUser = { user_id: 3, role: 'user' };

        // Setup mock space
        mockSpace = {
            space_id: 1,
            location_id: 1,
            name: 'Test Space',
            price_per_hour: 20,
            price_per_day: 150,
            status: 'active'
        };

        // Setup mock booking
        mockBooking = {
            booking_id: 1,
            user_id: regularUser.user_id,
            space_id: mockSpace.space_id,
            booking_date: '2025-10-01',
            start_time: '10:00:00',
            end_time: '12:00:00',
            status: 'pending',
            total_hours: 2,
            total_price: 40
        };
    });

    describe('createBooking', () => {
        const bookingData = {
            user_id: 3,
            space_id: 1,
            booking_date: '2025-10-01',
            start_time: '10:00:00',
            end_time: '12:00:00'
        };

        it('should allow users to create bookings for themselves', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Booking.create.mockResolvedValue(mockBooking);

            const result = await BookingService.createBooking(regularUser, {
                ...bookingData,
                user_id: regularUser.user_id
            });

            expect(Booking.create).toHaveBeenCalled();
            expect(result).toEqual(mockBooking);
        });

        it('should not allow users to create bookings for others', async () => {
            await expect(
                BookingService.createBooking(regularUser, {
                    ...bookingData,
                    user_id: 999
                })
            ).rejects.toThrow('Puoi creare prenotazioni solo per te stesso');
        });

        it('should calculate total_hours and total_price automatically', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Booking.create.mockResolvedValue(mockBooking);

            const result = await BookingService.createBooking(regularUser, bookingData);

            expect(result.total_hours).toBe(2);
            expect(result.total_price).toBeDefined();
        });

        it('should not allow bookings for past dates', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            await expect(
                BookingService.createBooking(regularUser, {
                    ...bookingData,
                    booking_date: pastDate.toISOString().split('T')[0]
                })
            ).rejects.toThrow('Non puoi prenotare per date passate');
        });
    });

    describe('updateBooking', () => {
        const updateData = {
            start_time: '11:00:00',
            end_time: '13:00:00'
        };

        it('should allow users to update their own pending bookings', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Space.findById.mockResolvedValue(mockSpace);
            Booking.update.mockResolvedValue({ ...mockBooking, ...updateData });

            const result = await BookingService.updateBooking(regularUser, 1, updateData);

            expect(Booking.update).toHaveBeenCalled();
            expect(result).toHaveProperty('start_time', '11:00:00');
        });

        it('should not allow users to update confirmed bookings except for cancellation', async () => {
            Booking.findById.mockResolvedValue({ ...mockBooking, status: 'confirmed' });

            await expect(
                BookingService.updateBooking(regularUser, 1, updateData)
            ).rejects.toThrow('Non puoi modificare una prenotazione confermata');
        });

        it('should allow admin to update any booking', async () => {
            Booking.findById.mockResolvedValue({ ...mockBooking, status: 'confirmed' });
            Space.findById.mockResolvedValue(mockSpace);
            Booking.update.mockResolvedValue({ ...mockBooking, ...updateData });

            const result = await BookingService.updateBooking(adminUser, 1, updateData);

            expect(Booking.update).toHaveBeenCalled();
            expect(result).toHaveProperty('start_time', '11:00:00');
        });
    });

    describe('deleteBooking', () => {
        it('should allow users to delete their own pending bookings', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Booking.delete.mockResolvedValue(true);

            const result = await BookingService.deleteBooking(regularUser, 1);

            expect(Booking.delete).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should not allow users to delete confirmed bookings', async () => {
            Booking.findById.mockResolvedValue({ ...mockBooking, status: 'confirmed' });

            await expect(
                BookingService.deleteBooking(regularUser, 1)
            ).rejects.toThrow('Solo gli amministratori possono eliminare prenotazioni confermate');
        });

        it('should allow admin to delete any booking', async () => {
            Booking.findById.mockResolvedValue({ ...mockBooking, status: 'confirmed' });
            Booking.delete.mockResolvedValue(true);

            const result = await BookingService.deleteBooking(adminUser, 1);

            expect(Booking.delete).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('getBookings', () => {
        const bookings = [
            mockBooking,
            { ...mockBooking, booking_id: 2, user_id: 4 }
        ];

        it('should return only user\'s bookings for regular users', async () => {
            Booking.findAll.mockResolvedValue([bookings[0]]);

            const result = await BookingService.getBookings(regularUser);

            expect(Booking.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: regularUser.user_id })
            );
            expect(result).toHaveLength(1);
        });

        it('should return all bookings for admin', async () => {
            Booking.findAll.mockResolvedValue(bookings);

            const result = await BookingService.getBookings(adminUser);

            expect(Booking.findAll).toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });

        it('should return location bookings for manager', async () => {
            const managedLocations = [1];
            Location.findAll.mockResolvedValue([{ location_id: 1 }]);
            Booking.findAll.mockResolvedValue([bookings[0]]);

            const result = await BookingService.getBookings(managerUser);

            expect(result).toHaveLength(1);
        });
    });

    describe('calculateBookingPrice', () => {
        it('should calculate hourly price when cheaper', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await BookingService.calculateBookingPrice(
                1,
                '2025-10-01',
                '10:00:00',
                '12:00:00'
            );

            expect(result.finalPrice).toBe(40); // 2 ore * 20€
            expect(result.selectedPricing).toBe('hourly');
        });

        it('should calculate daily price when cheaper', async () => {
            Space.findById.mockResolvedValue(mockSpace);

            const result = await BookingService.calculateBookingPrice(
                1,
                '2025-10-01',
                '10:00:00',
                '22:00:00'
            );

            expect(result.finalPrice).toBe(150); // prezzo giornaliero
            expect(result.selectedPricing).toBe('daily');
        });
    });

    describe('checkAvailability', () => {
        it('should return availability and pricing when space is available', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Booking.checkSpaceAvailability.mockResolvedValue(true);

            const result = await BookingService.checkAvailability(
                1,
                '2025-10-01',
                '10:00:00',
                '12:00:00'
            );

            expect(result.available).toBe(true);
            expect(result.pricing).toBeDefined();
            expect(result.space).toBeDefined();
        });

        it('should return unavailable without pricing when space is not available', async () => {
            Space.findById.mockResolvedValue(mockSpace);
            Booking.checkSpaceAvailability.mockResolvedValue(false);

            const result = await BookingService.checkAvailability(
                1,
                '2025-10-01',
                '10:00:00',
                '12:00:00'
            );

            expect(result.available).toBe(false);
            expect(result.pricing).toBeNull();
        });
    });

    describe('calculateHours', () => {
        it('should calculate hours correctly', () => {
            const result = BookingService.calculateHours('10:00:00', '12:00:00');
            expect(result).toBe(2);
        });

        it('should handle minutes correctly', () => {
            const result = BookingService.calculateHours('10:30:00', '12:00:00');
            expect(result).toBe(1.5);
        });
    });

    describe('getBookingsDashboard', () => {
        it('should return dashboard data for manager', async () => {
            Location.findAll.mockResolvedValue([{ location_id: 1 }]);
            Booking.getStats.mockResolvedValue({ 
                totalBookings: 10, 
                totalRevenue: 1000 
            });
            Booking.findAll.mockResolvedValue([mockBooking]);

            const result = await BookingService.getBookingsDashboard(managerUser);

            expect(result).toHaveProperty('stats');
            expect(result).toHaveProperty('recentBookings');
        });

        it('should not allow regular users to access dashboard', async () => {
            await expect(
                BookingService.getBookingsDashboard(regularUser)
            ).rejects.toThrow('Solo manager e admin possono accedere alla dashboard');
        });
    });
});
