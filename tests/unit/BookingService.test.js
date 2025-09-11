const BookingService = require('../../src/backend/services/BookingService');
const Booking = require('../../src/backend/models/Booking');
const Space = require('../../src/backend/models/Space');
const User = require('../../src/backend/models/User');
const Location = require('../../src/backend/models/Location');
const AppError = require('../../src/backend/utils/AppError');

// Mock dei modelli
jest.mock('../../src/backend/models/Booking');
jest.mock('../../src/backend/models/Space');
jest.mock('../../src/backend/models/User');
jest.mock('../../src/backend/models/Location');

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canManageBooking', () => {
    it('dovrebbe restituire true per admin', async () => {
      // Arrange
      const booking = { user_id: 1, space_id: 1 };
      const adminUser = { user_id: 2, role: 'admin' };

      // Act
      const result = await BookingService.canManageBooking(booking, adminUser);

      // Assert
      expect(result).toBe(true);
    });

    it('dovrebbe restituire true per il proprietario della prenotazione', async () => {
      // Arrange
      const booking = { user_id: 1, space_id: 1 };
      const ownerUser = { user_id: 1, role: 'user' };

      // Act
      const result = await BookingService.canManageBooking(booking, ownerUser);

      // Assert
      expect(result).toBe(true);
    });

    it('dovrebbe restituire true per manager che gestisce la location', async () => {
      // Arrange
      const booking = { user_id: 1, space_id: 1 };
      const managerUser = { user_id: 2, role: 'manager' };

      // Mock del metodo canManageBookingLocation
      jest.spyOn(BookingService, 'canManageBookingLocation')
        .mockResolvedValue(true);

      // Act
      const result = await BookingService.canManageBooking(booking, managerUser);

      // Assert
      expect(result).toBe(true);
      expect(BookingService.canManageBookingLocation)
        .toHaveBeenCalledWith(booking, managerUser);
    });

    it('dovrebbe restituire false per manager che non gestisce la location', async () => {
      // Arrange
      const booking = { user_id: 1, space_id: 1 };
      const managerUser = { user_id: 2, role: 'manager' };

      // Mock del metodo canManageBookingLocation
      jest.spyOn(BookingService, 'canManageBookingLocation')
        .mockResolvedValue(false);

      // Act
      const result = await BookingService.canManageBooking(booking, managerUser);

      // Assert
      expect(result).toBe(false);
    });

    it('dovrebbe restituire false per utente normale che non è il proprietario', async () => {
      // Arrange
      const booking = { user_id: 1, space_id: 1 };
      const otherUser = { user_id: 3, role: 'user' };

      // Act
      const result = await BookingService.canManageBooking(booking, otherUser);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canViewBooking', () => {
    it('dovrebbe restituire true per admin', async () => {
      // Arrange
      const booking = { user_id: 1 };
      const adminUser = { user_id: 2, role: 'admin' };

      // Act
      const result = await BookingService.canViewBooking(booking, adminUser);

      // Assert
      expect(result).toBe(true);
    });

    it('dovrebbe restituire true per il proprietario della prenotazione', async () => {
      // Arrange
      const booking = { user_id: 1 };
      const ownerUser = { user_id: 1, role: 'user' };

      // Act
      const result = await BookingService.canViewBooking(booking, ownerUser);

      // Assert
      expect(result).toBe(true);
    });

    it('dovrebbe restituire true per manager che gestisce la location', async () => {
      // Arrange
      const booking = { user_id: 1 };
      const managerUser = { user_id: 2, role: 'manager' };

      // Mock del metodo canManageBookingLocation
      jest.spyOn(BookingService, 'canManageBookingLocation')
        .mockResolvedValue(true);

      // Act
      const result = await BookingService.canViewBooking(booking, managerUser);

      // Assert
      expect(result).toBe(true);
    });

    it('dovrebbe restituire false per utente senza permessi', async () => {
      // Arrange
      const booking = { user_id: 1 };
      const otherUser = { user_id: 3, role: 'user' };

      // Mock del metodo canManageBookingLocation
      jest.spyOn(BookingService, 'canManageBookingLocation')
        .mockResolvedValue(false);

      // Act
      const result = await BookingService.canViewBooking(booking, otherUser);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('calculateBookingPrice', () => {
    it('dovrebbe calcolare il prezzo per una prenotazione oraria', async () => {
      // Arrange
      const spaceId = 1;
      const date = '2025-09-15';
      const startTime = '09:00:00';
      const endTime = '12:00:00';

      const mockSpace = {
        space_id: 1,
        name: 'Sala Riunioni A',
        price_per_hour: 10.00,
        price_per_day: 50.00
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await BookingService.calculateBookingPrice(spaceId, date, startTime, endTime);

      // Assert
      expect(result).toEqual({
        spaceId: 1,
        date: '2025-09-15',
        startTime: '09:00:00',
        endTime: '12:00:00',
        totalHours: 3,
        totalDays: 1,
        hourlyPrice: 30.00, // 3 ore * 10€/ora
        dailyPrice: 50.00,   // 1 giorno * 50€/giorno
        finalPrice: 30.00,   // Il minore tra i due
        selectedPricing: 'hourly',
        space: {
          id: 1,
          name: 'Sala Riunioni A',
          price_per_hour: 10.00,
          price_per_day: 50.00
        }
      });

      expect(Space.findById).toHaveBeenCalledWith(spaceId);
    });

    it('dovrebbe preferire il prezzo giornaliero per prenotazioni lunghe', async () => {
      // Arrange
      const spaceId = 1;
      const date = '2025-09-15';
      const startTime = '08:00:00';
      const endTime = '20:00:00'; // 12 ore

      const mockSpace = {
        space_id: 1,
        name: 'Sala Riunioni A',
        price_per_hour: 10.00,
        price_per_day: 80.00
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await BookingService.calculateBookingPrice(spaceId, date, startTime, endTime);

      // Assert
      expect(result.finalPrice).toBe(80.00); // Prezzo giornaliero è conveniente
      expect(result.selectedPricing).toBe('daily');
      expect(result.hourlyPrice).toBe(120.00); // 12 ore * 10€
      expect(result.dailyPrice).toBe(80.00);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const date = '2025-09-15';
      const startTime = '09:00:00';
      const endTime = '12:00:00';

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        BookingService.calculateBookingPrice(spaceId, date, startTime, endTime)
      ).rejects.toThrow(AppError);

      expect(Space.findById).toHaveBeenCalledWith(spaceId);
    });

    it('dovrebbe gestire orari con minuti e secondi', async () => {
      // Arrange
      const spaceId = 1;
      const date = '2025-09-15';
      const startTime = '09:30:00';
      const endTime = '11:15:30';

      const mockSpace = {
        space_id: 1,
        name: 'Sala Riunioni A',
        price_per_hour: 20.00,
        price_per_day: 100.00
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await BookingService.calculateBookingPrice(spaceId, date, startTime, endTime);

      // Assert
      expect(result.totalHours).toBe(1.76); // 1 ora e 45.5 minuti
      expect(result.hourlyPrice).toBe(35.2); // 1.76 ore * 20€/ora
      expect(result.finalPrice).toBe(35.2);
    });
  });

  describe('checkAvailability', () => {
    it('dovrebbe restituire true se lo spazio è disponibile', async () => {
      // Arrange
      const spaceId = 1;
      const startDate = '2025-09-15';
      const endDate = '2025-09-17';

      Space.checkDailyAvailability.mockResolvedValue(true);

      // Act
      const result = await BookingService.checkAvailability(spaceId, startDate, endDate);

      // Assert
      expect(result).toBe(true);
      expect(Space.checkDailyAvailability).toHaveBeenCalledWith(spaceId, startDate, endDate);
    });

    it('dovrebbe restituire false se lo spazio non è disponibile', async () => {
      // Arrange
      const spaceId = 1;
      const startDate = '2025-09-15';
      const endDate = '2025-09-17';

      Space.checkDailyAvailability.mockResolvedValue(false);

      // Act
      const result = await BookingService.checkAvailability(spaceId, startDate, endDate);

      // Assert
      expect(result).toBe(false);
    });

    it('dovrebbe usare startDate come endDate se endDate non è fornito', async () => {
      // Arrange
      const spaceId = 1;
      const startDate = '2025-09-15';

      Space.checkDailyAvailability.mockResolvedValue(true);

      // Act
      const result = await BookingService.checkAvailability(spaceId, startDate);

      // Assert
      expect(result).toBe(true);
      expect(Space.checkDailyAvailability).toHaveBeenCalledWith(spaceId, startDate, startDate);
    });
  });

  describe('getManagedLocationIds', () => {
    it('dovrebbe restituire gli ID delle location gestite da un manager', async () => {
      // Arrange
      const managerId = 1;
      const mockLocations = [
        { location_id: 1, name: 'Sede Milano' },
        { location_id: 2, name: 'Sede Roma' },
        { location_id: 3, name: 'Sede Napoli' }
      ];

      Location.findAll.mockResolvedValue(mockLocations);

      // Act
      const result = await BookingService.getManagedLocationIds(managerId);

      // Assert
      expect(result).toEqual([1, 2, 3]);
      expect(Location.findAll).toHaveBeenCalledWith({ manager_id: managerId });
    });

    it('dovrebbe restituire array vuoto se il manager non gestisce location', async () => {
      // Arrange
      const managerId = 999;

      Location.findAll.mockResolvedValue([]);

      // Act
      const result = await BookingService.getManagedLocationIds(managerId);

      // Assert
      expect(result).toEqual([]);
    });

    it('dovrebbe gestire location senza location_id', async () => {
      // Arrange
      const managerId = 1;
      const mockLocations = [
        { location_id: 1, name: 'Sede Milano' },
        { location_id: null, name: 'Sede in costruzione' }, // location_id null
        { location_id: 2, name: 'Sede Roma' }
      ];

      Location.findAll.mockResolvedValue(mockLocations);

      // Act
      const result = await BookingService.getManagedLocationIds(managerId);

      // Assert
      expect(result).toEqual([1, null, 2]); // Include anche null se presente
    });
  });
});
