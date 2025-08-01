import { describe, it, expect } from 'vitest';
import { calculateBookingPrice } from '../backend/utils/bookingCalculator'; // adatta il path se necessario

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

});
