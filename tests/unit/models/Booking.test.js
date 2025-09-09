// tests/unit/models/Booking.simple.test.js
const Booking = require('../../../src/backend/models/Booking');

describe('Booking Model - Basic Tests', () => {
    const mockBooking = {
        booking_id: 1,
        user_id: 1,
        space_id: 1,
        start_datetime: '2024-12-15T09:00:00Z',
        end_datetime: '2024-12-15T17:00:00Z',
        total_hours: 8,
        total_price: 80.00,
        status: 'confirmed',
        payment_status: 'paid',
        notes: 'Test booking',
        created_at: '2024-01-10T10:00:00Z'
    };

    describe('constructor', () => {
        it('should create booking instance with correct properties', () => {
            const booking = new Booking(mockBooking);

            expect(booking.booking_id).toBe(mockBooking.booking_id);
            expect(booking.user_id).toBe(mockBooking.user_id);
            expect(booking.space_id).toBe(mockBooking.space_id);
            expect(booking.start_datetime).toBe(mockBooking.start_datetime);
            expect(booking.end_datetime).toBe(mockBooking.end_datetime);
            expect(booking.total_hours).toBe(mockBooking.total_hours);
            expect(booking.total_price).toBe(mockBooking.total_price);
            expect(booking.status).toBe(mockBooking.status);
            expect(booking.payment_status).toBe(mockBooking.payment_status);
            expect(booking.notes).toBe(mockBooking.notes);
            expect(booking.booking_date).toBe('2024-12-15');
            expect(booking.duration_days).toBe(1);
        });

        it('should handle missing optional fields', () => {
            const minimalData = {
                booking_id: 1,
                user_id: 1,
                space_id: 1,
                start_datetime: '2024-12-15T09:00:00Z',
                end_datetime: '2024-12-15T17:00:00Z'
            };

            const booking = new Booking(minimalData);

            expect(booking.status).toBe('pending');
            expect(booking.payment_status).toBe('pending');
            expect(booking.notes).toBeUndefined();
        });

        it('should calculate duration days correctly', () => {
            const multiDayBooking = new Booking({
                ...mockBooking,
                start_datetime: '2024-12-15T09:00:00Z',
                end_datetime: '2024-12-18T17:00:00Z'
            });

            expect(multiDayBooking.duration_days).toBe(4);
        });

        it('should handle duration calculation with no dates', () => {
            const bookingWithoutDates = new Booking({
                booking_id: 1,
                user_id: 1,
                space_id: 1
            });

            expect(bookingWithoutDates.duration_days).toBe(0);
            expect(bookingWithoutDates.booking_date).toBe(null);
        });
    });

    describe('validateBookingData', () => {
        it('should validate correct booking data with future dates', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const startDatetime = futureDate.toISOString();
            
            const endDate = new Date(futureDate);
            endDate.setHours(futureDate.getHours() + 8);
            const endDatetime = endDate.toISOString();

            const validData = {
                user_id: 1,
                space_id: 1,
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                total_hours: 8,
                total_price: 80.00
            };

            expect(() => {
                Booking.validateBookingData(validData);
            }).not.toThrow();
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                user_id: 1,
                // missing space_id
                start_datetime: '2024-12-15T09:00:00Z',
                end_datetime: '2024-12-15T17:00:00Z'
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow();
        });

        it('should throw error for invalid datetime format', () => {
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: 'invalid-date',
                end_datetime: '2024-12-15T17:00:00Z',
                total_hours: 8,
                total_price: 80.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow();
        });

        it('should throw error when end datetime is before start datetime', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: futureDate.toISOString(),
                end_datetime: new Date(futureDate.getTime() - 3600000).toISOString(), // 1 ora prima
                total_hours: 8,
                total_price: 80.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow('La data/ora di inizio deve essere precedente a quella di fine');
        });

        it('should throw error for negative price', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: futureDate.toISOString(),
                end_datetime: new Date(futureDate.getTime() + 3600000).toISOString(),
                total_hours: 8,
                total_price: -10.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow('Il prezzo totale deve essere positivo');
        });

        it('should throw error for past dates', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7);
            
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: pastDate.toISOString(),
                end_datetime: new Date(pastDate.getTime() + 3600000).toISOString(),
                total_hours: 8,
                total_price: 80.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow('Non è possibile creare prenotazioni per date passate');
        });

        it('should throw error for booking too long', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const endDate = new Date(futureDate);
            endDate.setDate(endDate.getDate() + 35); // 35 giorni dopo
            
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: futureDate.toISOString(),
                end_datetime: endDate.toISOString(),
                total_hours: 840,
                total_price: 8400.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow('La durata massima di una prenotazione è di 30 giorni');
        });

        it('should throw error for booking too short', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const endDate = new Date(futureDate);
            endDate.setMinutes(endDate.getMinutes() + 30); // 30 minuti dopo
            
            const invalidData = {
                user_id: 1,
                space_id: 1,
                start_datetime: futureDate.toISOString(),
                end_datetime: endDate.toISOString(),
                total_hours: 0.5,
                total_price: 5.00
            };

            expect(() => {
                Booking.validateBookingData(invalidData);
            }).toThrow('La durata minima di una prenotazione è di 1 ora');
        });
    });

    describe('formatDateTimeForDB', () => {
        it('should format datetime string correctly for database', () => {
            const input = '2024-01-15T09:00:00Z';
            const result = Booking.formatDateTimeForDB(input);

            expect(result).toBe('2024-01-15T09:00:00.000Z');
        });

        it('should handle Date objects', () => {
            const date = new Date('2024-01-15T09:00:00Z');
            const result = Booking.formatDateTimeForDB(date);

            expect(result).toBe('2024-01-15T09:00:00.000Z');
        });

        it('should handle null', () => {
            // Il metodo non gestisce null/undefined, quindi convertirebbe null in una data epoca
            expect(Booking.formatDateTimeForDB(null)).toBe("1970-01-01T00:00:00.000Z");
        });
    });

    describe('calculateDurationDays', () => {
        it('should calculate single day booking', () => {
            const booking = new Booking({
                start_datetime: '2024-12-15T09:00:00Z',
                end_datetime: '2024-12-15T17:00:00Z'
            });
            
            expect(booking.calculateDurationDays()).toBe(1);
        });

        it('should calculate multi-day booking', () => {
            const booking = new Booking({
                start_datetime: '2024-12-15T09:00:00Z',
                end_datetime: '2024-12-18T17:00:00Z'
            });
            
            expect(booking.calculateDurationDays()).toBe(4);
        });

        it('should handle partial days as full days', () => {
            const booking = new Booking({
                start_datetime: '2024-12-15T23:00:00Z',
                end_datetime: '2024-12-16T01:00:00Z'
            });
            
            expect(booking.calculateDurationDays()).toBe(1);
        });

        it('should return 0 for missing dates', () => {
            const booking = new Booking({});
            
            expect(booking.calculateDurationDays()).toBe(0);
        });
    });
});
