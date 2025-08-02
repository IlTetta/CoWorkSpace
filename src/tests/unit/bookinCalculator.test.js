import { describe, it, expect } from 'vitest';
import { calculateBookingPrice } from '../../backend/utils/bookingCalculator'; // adatta il path se necessario

describe('calculateBookingPrice', () => {
  
  it('calcola il prezzo correttamente per meno di 8 ore (solo pricePerHour)', () => {
    const result = calculateBookingPrice(5, 10, 70); // 5 * 10 = 50
    expect(result).toBe(50.00);
  });

  it('usa il prezzo giornaliero per 8 ore esatte', () => {
    const result = calculateBookingPrice(8, 10, 70); // 1 giorno = 70
    expect(result).toBe(70.00);
  });

  it('calcola correttamente per più di 8 ore con resto', () => {
    const result = calculateBookingPrice(10, 10, 70); // 1 giorno (70) + 2 ore (2*10) = 90
    expect(result).toBe(90.00);
  });

  it('calcola correttamente per esattamente 16 ore (2 giorni)', () => {
    const result = calculateBookingPrice(16, 10, 70); // 2 giorni = 140
    expect(result).toBe(140.00);
  });

  it('ritorna 0 per 0 ore prenotate', () => {
    const result = calculateBookingPrice(0, 10, 70);
    expect(result).toBe(0.00);
  });

  it('gestisce correttamente valori con virgole decimali', () => {
    const result = calculateBookingPrice(7.5, 10.25, 70.99);
    // 7.5 * 10.25 = 76.875 → 76.88
    expect(result).toBe(76.88);
  });

  it('mantiene due cifre decimali nel risultato', () => {
    const result = calculateBookingPrice(1, 10.666, 100);
    expect(result).toBe(10.67); // arrotondato
  });
  it('ritorna 0 se totalHours è negativo', () => {
  const result = calculateBookingPrice(-5, 10, 70);
  expect(result).toBe(0.00); // o lancia un errore, a seconda di come vuoi gestirlo
});

it('ritorna 0 se pricePerHour è negativo', () => {
  const result = calculateBookingPrice(5, -10, 70);
  expect(result).toBe(0.00);
});

it('ritorna 0 se pricePerDay è negativo', () => {
  const result = calculateBookingPrice(10, 10, -70);
  expect(result).toBe(0.00); // 2 ore extra * 10 = 20 → se ignora pricePerDay
});

it('gestisce totalHours con virgola > 8 (e calcola correttamente il resto)', () => {
  const result = calculateBookingPrice(9.5, 10, 80);
  // 1 giorno = 80, 1.5h extra = 15 → totale = 95
  expect(result).toBe(95.00);
});

it('ritorna NaN se totalHours è NaN', () => {
  const result = calculateBookingPrice(NaN, 10, 70);
  expect(result).toBe(0.00);
});

it('ritorna NaN se pricePerHour è undefined', () => {
  const result = calculateBookingPrice(5, undefined, 70);
  expect(result).toBe(0.00);
});

it('ritorna NaN se pricePerDay è null', () => {
  const result = calculateBookingPrice(10, 10, null);
  expect(result).toBe(0.00);
});

it('gestisce numeri molto grandi', () => {
  const result = calculateBookingPrice(8000, 1000, 8000); // 1000 giorni pieni
  expect(result).toBe(8000000.00);
});

it('mantiene precisione con numeri decimali lunghi', () => {
  const result = calculateBookingPrice(7.777, 10.123456, 70.987654);
  const expected = parseFloat((7.777 * 10.123456).toFixed(2));
  expect(result).toBe(expected);
});


});
