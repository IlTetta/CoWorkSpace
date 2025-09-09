const { calculateBookingPrice } = require('../../../src/backend/utils/bookingCalculator');

describe('bookingCalculator', () => {
    describe('calculateBookingPrice', () => {
        // Test per prenotazioni inferiori a 8 ore
        it('should calculate correct price for bookings less than 8 hours', () => {
            expect(calculateBookingPrice(4, 10, 70)).toBe(40); // 4 ore * 10€/ora
            expect(calculateBookingPrice(7, 10, 70)).toBe(70); // 7 ore * 10€/ora
        });

        // Test per prenotazioni di 8 ore o più
        it('should use daily rate for bookings of 8 hours or more', () => {
            expect(calculateBookingPrice(8, 10, 70)).toBe(70);  // 1 giorno
            expect(calculateBookingPrice(10, 10, 70)).toBe(90); // 1 giorno (70€) + 2 ore (20€)
        });

        // Test per input invalidi
        it('should return 0 for invalid inputs', () => {
            expect(calculateBookingPrice(-1, 10, 70)).toBe(0);
            expect(calculateBookingPrice('4', 10, 70)).toBe(0);
            expect(calculateBookingPrice(4, -10, 70)).toBe(0);
            expect(calculateBookingPrice(4, 'invalid', 70)).toBe(0);
            expect(calculateBookingPrice(4, 10, NaN)).toBe(0);
        });

        // Test per arrotondamento a 2 decimali
        it('should round prices to 2 decimal places', () => {
            expect(calculateBookingPrice(2.5, 10.333, 70)).toBe(25.83);
        });
    });
});
