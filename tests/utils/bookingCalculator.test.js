// tests/utils/bookingCalculator.test.js
const { calculateBookingPrice } = require('../../src/backend/utils/bookingCalculator');

describe('BookingCalculator', () => {
    describe('calculateBookingPrice', () => {
        
        describe('Calcoli con tariffazione oraria (< 8 ore)', () => {
            test('dovrebbe calcolare correttamente per 1 ora', () => {
                const result = calculateBookingPrice(1, 10, 60);
                expect(result).toBe(10);
            });

            test('dovrebbe calcolare correttamente per 3.5 ore', () => {
                const result = calculateBookingPrice(3.5, 15, 100);
                expect(result).toBe(52.5);
            });

            test('dovrebbe calcolare correttamente per 7 ore', () => {
                const result = calculateBookingPrice(7, 12, 80);
                expect(result).toBe(84);
            });

            test('dovrebbe calcolare correttamente per 7.75 ore', () => {
                const result = calculateBookingPrice(7.75, 20, 120);
                expect(result).toBe(155);
            });

            test('dovrebbe arrotondare correttamente a 2 decimali', () => {
                const result = calculateBookingPrice(2.333, 10.99, 80);
                expect(result).toBe(25.64);
            });
        });

        describe('Calcoli con tariffazione giornaliera (>= 8 ore)', () => {
            test('dovrebbe calcolare correttamente per esattamente 8 ore', () => {
                const result = calculateBookingPrice(8, 15, 100);
                expect(result).toBe(100);
            });

            test('dovrebbe calcolare correttamente per 9 ore (1 giorno + 1 ora)', () => {
                const result = calculateBookingPrice(9, 15, 100);
                expect(result).toBe(115);
            });

            test('dovrebbe calcolare correttamente per 12 ore (1 giorno + 4 ore)', () => {
                const result = calculateBookingPrice(12, 20, 120);
                expect(result).toBe(200);
            });

            test('dovrebbe calcolare correttamente per esattamente 16 ore (2 giorni)', () => {
                const result = calculateBookingPrice(16, 25, 150);
                expect(result).toBe(300);
            });

            test('dovrebbe calcolare correttamente per 18.5 ore (2 giorni + 2.5 ore)', () => {
                const result = calculateBookingPrice(18.5, 30, 200);
                expect(result).toBe(475);
            });

            test('dovrebbe calcolare correttamente per 24 ore (3 giorni)', () => {
                const result = calculateBookingPrice(24, 20, 120);
                expect(result).toBe(360);
            });

            test('dovrebbe calcolare correttamente per 25.25 ore (3 giorni + 1.25 ore)', () => {
                const result = calculateBookingPrice(25.25, 40, 250);
                expect(result).toBe(800);
            });

            test('dovrebbe preferire tariffazione giornaliera quando conveniente', () => {
                // Caso dove 8 ore orarie costerebbero di più del prezzo giornaliero
                const hourlyTotal = 8 * 25; // 200
                const dailyPrice = 150;
                const result = calculateBookingPrice(8, 25, 150);
                expect(result).toBe(150); // Dovrebbe usare il prezzo giornaliero
            });

            test('dovrebbe gestire giorni multipli con ore decimali', () => {
                const result = calculateBookingPrice(33.75, 18, 120);
                // 4 giorni completi (32 ore) + 1.75 ore
                // 4 * 120 + 1.75 * 18 = 480 + 31.5 = 511.5
                expect(result).toBe(511.5);
            });
        });

        describe('Casi limite e edge cases', () => {
            test('dovrebbe gestire 0 ore', () => {
                const result = calculateBookingPrice(0, 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe gestire prezzi zero', () => {
                const result = calculateBookingPrice(5, 0, 0);
                expect(result).toBe(0);
            });

            test('dovrebbe gestire ore decimali molto piccole', () => {
                const result = calculateBookingPrice(0.1, 100, 500);
                expect(result).toBe(10);
            });

            test('dovrebbe gestire ore decimali prossime a 8', () => {
                const result = calculateBookingPrice(7.99, 20, 150);
                expect(result).toBe(159.8);
            });

            test('dovrebbe gestire ore decimali appena sopra 8', () => {
                const result = calculateBookingPrice(8.01, 20, 150);
                expect(result).toBe(150.2);
            });

            test('dovrebbe arrotondare correttamente con molti decimali', () => {
                const result = calculateBookingPrice(3.123456789, 10.987654321, 80);
                expect(result).toBe(34.32);
            });
        });

        describe('Validazione degli input', () => {
            test('dovrebbe restituire 0 per totalHours non numerico', () => {
                const result = calculateBookingPrice('abc', 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per pricePerHour non numerico', () => {
                const result = calculateBookingPrice(5, 'abc', 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per pricePerDay non numerico', () => {
                const result = calculateBookingPrice(5, 15, 'abc');
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per totalHours negativo', () => {
                const result = calculateBookingPrice(-5, 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per pricePerHour negativo', () => {
                const result = calculateBookingPrice(5, -15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per pricePerDay negativo', () => {
                const result = calculateBookingPrice(5, 15, -100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per NaN come totalHours', () => {
                const result = calculateBookingPrice(NaN, 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per NaN come pricePerHour', () => {
                const result = calculateBookingPrice(5, NaN, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per NaN come pricePerDay', () => {
                const result = calculateBookingPrice(5, 15, NaN);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per undefined', () => {
                const result = calculateBookingPrice(undefined, 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per null', () => {
                const result = calculateBookingPrice(null, 15, 100);
                expect(result).toBe(0);
            });

            test('dovrebbe restituire 0 per tutti i parametri invalidi', () => {
                const result = calculateBookingPrice('abc', 'def', 'ghi');
                expect(result).toBe(0);
            });
        });

        describe('Scenari realistici di business', () => {
            test('dovrebbe calcolare correttamente una prenotazione di mezza giornata', () => {
                // Scenario: spazio da 25€/ora, 180€/giorno, prenotazione di 4 ore
                const result = calculateBookingPrice(4, 25, 180);
                expect(result).toBe(100);
            });

            test('dovrebbe calcolare correttamente una prenotazione di una giornata lavorativa', () => {
                // Scenario: spazio da 30€/ora, 200€/giorno, prenotazione di 8 ore
                const result = calculateBookingPrice(8, 30, 200);
                expect(result).toBe(200); // Conveniente usare tariffa giornaliera
            });

            test('dovrebbe calcolare correttamente una prenotazione di un giorno e mezzo', () => {
                // Scenario: spazio da 20€/ora, 140€/giorno, prenotazione di 12 ore
                const result = calculateBookingPrice(12, 20, 140);
                expect(result).toBe(220); // 1 giorno (140€) + 4 ore (80€)
            });

            test('dovrebbe calcolare correttamente una prenotazione settimanale', () => {
                // Scenario: spazio da 15€/ora, 100€/giorno, prenotazione di 40 ore (5 giorni)
                const result = calculateBookingPrice(40, 15, 100);
                expect(result).toBe(500); // 5 giorni a 100€ ciascuno
            });

            test('dovrebbe gestire tariffe premium per spazi costosi', () => {
                // Scenario: spazio premium da 50€/ora, 350€/giorno, prenotazione di 10 ore
                const result = calculateBookingPrice(10, 50, 350);
                expect(result).toBe(450); // 1 giorno (350€) + 2 ore (100€)
            });

            test('dovrebbe gestire tariffe economiche per spazi condivisi', () => {
                // Scenario: spazio condiviso da 8€/ora, 50€/giorno, prenotazione di 15 ore
                const result = calculateBookingPrice(15, 8, 50);
                expect(result).toBe(106); // 1 giorno (50€) + 7 ore (56€)
            });
        });

        describe('Test di precisione numerica', () => {
            test('dovrebbe mantenere precisione con numeri decimali', () => {
                const result = calculateBookingPrice(2.75, 12.50, 90.25);
                expect(result).toBe(34.38);
            });

            test('dovrebbe gestire correttamente i rounding errors', () => {
                // Test per possibili errori di arrotondamento floating point
                const result = calculateBookingPrice(0.1 + 0.2, 10, 70); // 0.30000000000000004
                expect(result).toBe(3);
            });

            test('dovrebbe arrotondare correttamente numeri con molti decimali', () => {
                const result = calculateBookingPrice(3.999999999, 10.123456789, 75.987654321);
                expect(result).toBe(40.49);
            });
        });
    });
});
