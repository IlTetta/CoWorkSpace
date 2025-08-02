// test/unit/bookinCalculator.test.js
import { describe, expect, it } from 'vitest';
import { calculateBookingPrice } from '../../src/backend/utils/bookingCalculator';

describe('calculateBookingPrice', () => {
    // Test per il calcolo orario base
  it('should calculate hourly rate correctly', () => {
    expect(calculateBookingPrice(3, 10, 50)).toBe(30);
    expect(calculateBookingPrice(5, 15, 80)).toBe(75);
  })

  // Test per il calcolo giornaliero
  it('should use daily rate when exceeding 8 hours', () => {
    // Caso esatto 8 ore
    expect(calculateBookingPrice(8, 10, 50)).toBe(50);

    // Caso con giorni interi + ore residue
    expect(calculateBookingPrice(10, 10, 50)).toBe(70); 
    expect(calculateBookingPrice(25, 15, 100)).toBe(315);
  })

  // Test per arrotondamento a 2 decimali
  it('should return result with 2 decimal places', () => {
    expect(calculateBookingPrice(3, 10.5, 52.3)).toBe(31.50);
    expect(calculateBookingPrice(9, 12.333, 49.999)).toBe(62.33);
  })

  // Test per input non validi
  describe('invalid validation', () => {
    it('should return 0 for negative numbers', () => {
      expect(calculateBookingPrice(-1, 10, 50)).toBe(0);
      expect(calculateBookingPrice(5, -10, 50)).toBe(0);
      expect(calculateBookingPrice(5, 10, -50)).toBe(0);
    })

    it('should return 0 for non-numeric inputs', () => {
      expect(calculateBookingPrice('invalid', 10, 50)).toBe(0);
      expect(calculateBookingPrice(5, null, 50)).toBe(0);
      expect(calculateBookingPrice(5, 10, undefined)).toBe(0);
    })

    it('should return 0 for NaN inputs', () => {
      expect(calculateBookingPrice(NaN, 10, 50)).toBe(0);
      expect(calculateBookingPrice(5, NaN, 50)).toBe(0);
      expect(calculateBookingPrice(5, 10, NaN)).toBe(0);
    })

    // Test per casi limite
    describe('edge cases', () => {
      it('should handle zero hours', () => {
        expect(calculateBookingPrice(0, 10, 50)).toBe(0);
      })

      it('should handle zero rates', () => {
        expect(calculateBookingPrice(5, 0, 0)).toBe(0);
        expect(calculateBookingPrice(10, 0, 50)).toBe(50);
      })

      it('should handle very large numbers', () => {
        const largeNum = Number.MAX_SAFE_INTEGER;
        const expected = Math.floor(largeNum / 8) * 1 + (largeNum % 8) * 1;
        expect(calculateBookingPrice(largeNum, 1, 1)).toBe(expected);
      })
    })
  })
})
