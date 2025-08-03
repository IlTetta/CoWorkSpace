const { calculateBookingPrice } = require('../../src/backend/utils/bookingCalculator');

describe('calculateBookingPrice', () => {
  describe('Calcolo prezzo per ore', () => {
    test('dovrebbe calcolare correttamente il prezzo per poche ore (meno di 8)', () => {
      const result = calculateBookingPrice(4, 10, 60);
      expect(result).toBe(40);
    });

    test('dovrebbe calcolare correttamente il prezzo per 1 ora', () => {
      const result = calculateBookingPrice(1, 15, 100);
      expect(result).toBe(15);
    });

    test('dovrebbe calcolare correttamente il prezzo per 7.5 ore', () => {
      const result = calculateBookingPrice(7.5, 12, 80);
      expect(result).toBe(90);
    });
  });

  describe('Calcolo prezzo per giorni', () => {
    test('dovrebbe usare il prezzo giornaliero per esattamente 8 ore', () => {
      const result = calculateBookingPrice(8, 10, 60);
      expect(result).toBe(60);
    });

    test('dovrebbe calcolare correttamente per 1 giorno + ore extra', () => {
      const result = calculateBookingPrice(10, 10, 60);
      expect(result).toBe(80); // 1 giorno (60) + 2 ore (20)
    });

    test('dovrebbe calcolare correttamente per 2 giorni esatti', () => {
      const result = calculateBookingPrice(16, 10, 60);
      expect(result).toBe(120); // 2 giorni completi
    });

    test('dovrebbe calcolare correttamente per 2 giorni + ore extra', () => {
      const result = calculateBookingPrice(19, 8, 50);
      expect(result).toBe(124); // 2 giorni (100) + 3 ore (24)
    });

    test('dovrebbe gestire correttamente giorni parziali con decimali', () => {
      const result = calculateBookingPrice(12.5, 10, 70);
      expect(result).toBe(115); // 1 giorno (70) + 4.5 ore (45)
    });
  });

  describe('Validazione input', () => {
    test('dovrebbe restituire 0 per totalHours non numerico', () => {
      expect(calculateBookingPrice('abc', 10, 60)).toBe(0);
      expect(calculateBookingPrice(null, 10, 60)).toBe(0);
      expect(calculateBookingPrice(undefined, 10, 60)).toBe(0);
    });

    test('dovrebbe restituire 0 per pricePerHour non numerico', () => {
      expect(calculateBookingPrice(5, 'abc', 60)).toBe(0);
      expect(calculateBookingPrice(5, null, 60)).toBe(0);
      expect(calculateBookingPrice(5, undefined, 60)).toBe(0);
    });

    test('dovrebbe restituire 0 per pricePerDay non numerico', () => {
      expect(calculateBookingPrice(5, 10, 'abc')).toBe(0);
      expect(calculateBookingPrice(5, 10, null)).toBe(0);
      expect(calculateBookingPrice(5, 10, undefined)).toBe(0);
    });

    test('dovrebbe restituire 0 per valori NaN', () => {
      expect(calculateBookingPrice(NaN, 10, 60)).toBe(0);
      expect(calculateBookingPrice(5, NaN, 60)).toBe(0);
      expect(calculateBookingPrice(5, 10, NaN)).toBe(0);
    });

    test('dovrebbe restituire 0 per valori negativi', () => {
      expect(calculateBookingPrice(-1, 10, 60)).toBe(0);
      expect(calculateBookingPrice(5, -10, 60)).toBe(0);
      expect(calculateBookingPrice(5, 10, -60)).toBe(0);
    });

    test('dovrebbe gestire correttamente lo zero come valore valido', () => {
      expect(calculateBookingPrice(0, 10, 60)).toBe(0);
      expect(calculateBookingPrice(5, 0, 60)).toBe(0);
      expect(calculateBookingPrice(8, 10, 0)).toBe(0);
    });
  });

  describe('Casi limite', () => {
    test('dovrebbe gestire numeri decimali molto piccoli', () => {
      const result = calculateBookingPrice(0.1, 100, 500);
      expect(result).toBe(10);
    });

    test('dovrebbe gestire numeri molto grandi', () => {
      const result = calculateBookingPrice(100, 10, 50);
      expect(result).toBe(640); // 12 giorni (600) + 4 ore (40)
    });

    test('dovrebbe arrotondare correttamente i risultati con molti decimali', () => {
      const result = calculateBookingPrice(3, 10.333, 80);
      expect(result).toBe(31); // Arrotondato da 30.999
    });

    test('dovrebbe gestire il caso in cui il prezzo orario è più conveniente del giornaliero', () => {
      // Caso in cui 8 ore costano meno del prezzo giornaliero
      const result = calculateBookingPrice(8, 5, 100);
      expect(result).toBe(100); // Usa comunque il prezzo giornaliero (logica della funzione)
    });
  });

  describe('Scenari realistici', () => {
    test('scenario ufficio mezza giornata', () => {
      const result = calculateBookingPrice(4, 25, 150);
      expect(result).toBe(100);
    });

    test('scenario ufficio giornata intera', () => {
      const result = calculateBookingPrice(8, 25, 150);
      expect(result).toBe(150);
    });

    test('scenario evento weekend lungo', () => {
      const result = calculateBookingPrice(20, 30, 200);
      expect(result).toBe(520); // 2 giorni (400) + 4 ore (120)
    });

    test('scenario meeting breve', () => {
      const result = calculateBookingPrice(2.5, 40, 250);
      expect(result).toBe(100);
    });
  });

  describe('Verifica arrotondamento', () => {
    test('dovrebbe arrotondare a 2 decimali', () => {
      // Forzare una situazione che genera molti decimali
      const result = calculateBookingPrice(3.333, 10.666, 80);
      // 3.333 * 10.666 = 35.553778
      expect(result).toBe(35.55);
    });

    test('dovrebbe gestire risultati che non necessitano arrotondamento', () => {
      const result = calculateBookingPrice(5, 10, 80);
      expect(result).toBe(50);
    });
  });
});