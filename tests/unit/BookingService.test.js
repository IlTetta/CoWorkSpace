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

  describe('createBooking', () => {
    it('dovrebbe creare una prenotazione per un utente normale', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingData = {
        user_id: 1,
        space_id: 1,
        start_date: '2025-09-20',
        end_date: '2025-09-22'
      };

      const mockSpace = {
        space_id: 1,
        name: 'Sala Riunioni A',
        price_per_day: 50.00,
        location_id: 1
      };

      const mockCreatedBooking = {
        booking_id: 1,
        ...bookingData,
        total_price: 150.00,
        status: 'pending'
      };

      Space.findById.mockResolvedValue(mockSpace);
      
      // Crea un nuovo spy temporaneo per questo test
      const calculatePriceSpy = jest.spyOn(BookingService, 'calculateDailyBookingPrice')
        .mockResolvedValue({ finalPrice: 150.00 });
      
      Booking.create.mockResolvedValue(mockCreatedBooking);

      // Act
      const result = await BookingService.createBooking(currentUser, bookingData);

      // Assert
      expect(Space.findById).toHaveBeenCalledWith(1);
      expect(calculatePriceSpy).toHaveBeenCalledWith(1, '2025-09-20', '2025-09-22');
      expect(Booking.create).toHaveBeenCalledWith({
        ...bookingData,
        total_price: 150.00
      });
      expect(result).toEqual(mockCreatedBooking);

      // Cleanup
      calculatePriceSpy.mockRestore();
    });

    it('dovrebbe lanciare errore se l\'utente non è autenticato', async () => {
      // Arrange
      const currentUser = null;
      const bookingData = { space_id: 1 };

      // Act & Assert
      await expect(BookingService.createBooking(currentUser, bookingData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se un utente normale tenta di prenotare per altri', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingData = { user_id: 2, space_id: 1 }; // Diverso user_id

      // Act & Assert
      await expect(BookingService.createBooking(currentUser, bookingData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingData = { user_id: 1, space_id: 999 };

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(BookingService.createBooking(currentUser, bookingData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore per date passate', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const bookingData = {
        user_id: 1,
        space_id: 1,
        start_date: yesterday.toISOString().split('T')[0]
      };

      const mockSpace = { space_id: 1, price_per_day: 50.00 };
      Space.findById.mockResolvedValue(mockSpace);

      // Act & Assert
      await expect(BookingService.createBooking(currentUser, bookingData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe permettere ai manager di prenotare per clienti nelle loro location', async () => {
      // Arrange
      const currentUser = { user_id: 2, role: 'manager' };
      const bookingData = {
        user_id: 3, // Cliente diverso
        space_id: 1,
        start_date: '2025-09-20',
        end_date: '2025-09-20'
      };

      const mockSpace = {
        space_id: 1,
        location_id: 1,
        price_per_day: 50.00
      };

      Space.findById.mockResolvedValue(mockSpace);
      
      jest.spyOn(BookingService, 'canManageSpaceLocation')
        .mockResolvedValue(true);
      
      const calculatePriceSpy = jest.spyOn(BookingService, 'calculateDailyBookingPrice')
        .mockResolvedValue({ finalPrice: 50.00 });
      
      const mockCreatedBooking = { booking_id: 1, ...bookingData };
      Booking.create.mockResolvedValue(mockCreatedBooking);

      // Act
      const result = await BookingService.createBooking(currentUser, bookingData);

      // Assert
      expect(BookingService.canManageSpaceLocation)
        .toHaveBeenCalledWith(mockSpace, currentUser);
      expect(result).toEqual(mockCreatedBooking);

      // Cleanup
      calculatePriceSpy.mockRestore();
    });
  });

  describe('updateBooking', () => {
    it('dovrebbe aggiornare una prenotazione con permessi validi', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingId = 1;
      const updateData = { start_date: '2025-09-25' };

      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        space_id: 1,
        status: 'pending',
        start_date: '2025-09-20',
        end_date: '2025-09-22'
      };

      const mockUpdatedBooking = { ...mockBooking, ...updateData };

      Booking.findById.mockResolvedValue(mockBooking);
      jest.spyOn(BookingService, 'canManageBooking').mockResolvedValue(true);
      
      const calculatePriceSpy = jest.spyOn(BookingService, 'calculateDailyBookingPrice')
        .mockResolvedValue({ finalPrice: 125.00 });
      
      Booking.update.mockResolvedValue(mockUpdatedBooking);

      // Act
      const result = await BookingService.updateBooking(currentUser, bookingId, updateData);

      // Assert
      expect(Booking.findById).toHaveBeenCalledWith(bookingId);
      expect(BookingService.canManageBooking).toHaveBeenCalledWith(mockBooking, currentUser);
      expect(Booking.update).toHaveBeenCalledWith(bookingId, {
        ...updateData,
        total_price: 125.00
      });
      expect(result).toEqual(mockUpdatedBooking);

      // Cleanup
      calculatePriceSpy.mockRestore();
    });

    it('dovrebbe lanciare errore se la prenotazione non esiste', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingId = 999;
      const updateData = { start_date: '2025-09-25' };

      Booking.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(BookingService.updateBooking(currentUser, bookingId, updateData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe limitare le modifiche per prenotazioni confermate', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingId = 1;
      const updateData = { start_date: '2025-09-25' }; // Campo non permesso

      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        status: 'confirmed' // Prenotazione confermata
      };

      Booking.findById.mockResolvedValue(mockBooking);
      jest.spyOn(BookingService, 'canManageBooking').mockResolvedValue(true);

      // Act & Assert
      await expect(BookingService.updateBooking(currentUser, bookingId, updateData))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe permettere solo cancellazione per utenti con prenotazioni confermate', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingId = 1;
      const updateData = { status: 'cancelled' };

      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        status: 'confirmed'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      jest.spyOn(BookingService, 'canManageBooking').mockResolvedValue(true);
      Booking.update.mockResolvedValue({ ...mockBooking, status: 'cancelled' });

      // Act
      const result = await BookingService.updateBooking(currentUser, bookingId, updateData);

      // Assert
      expect(Booking.update).toHaveBeenCalledWith(bookingId, updateData);
      expect(result.status).toBe('cancelled');
    });
  });

  describe('deleteBooking', () => {
    it('dovrebbe eliminare una prenotazione con permessi validi', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'admin' };
      const bookingId = 1;

      const mockBooking = {
        booking_id: 1,
        user_id: 2,
        status: 'pending'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      jest.spyOn(BookingService, 'canManageBooking').mockResolvedValue(true);
      Booking.delete.mockResolvedValue(true);

      // Act
      const result = await BookingService.deleteBooking(currentUser, bookingId);

      // Assert
      expect(Booking.findById).toHaveBeenCalledWith(bookingId);
      expect(BookingService.canManageBooking).toHaveBeenCalledWith(mockBooking, currentUser);
      expect(Booking.delete).toHaveBeenCalledWith(bookingId);
      expect(result).toBe(true);
    });

    it('dovrebbe lanciare errore se la prenotazione non esiste', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'admin' };
      const bookingId = 999;

      Booking.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(BookingService.deleteBooking(currentUser, bookingId))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe impedire a non-admin di eliminare prenotazioni confermate', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const bookingId = 1;

      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        status: 'confirmed'
      };

      Booking.findById.mockResolvedValue(mockBooking);
      jest.spyOn(BookingService, 'canManageBooking').mockResolvedValue(true);

      // Act & Assert
      await expect(BookingService.deleteBooking(currentUser, bookingId))
        .rejects.toThrow(AppError);
    });
  });

  describe('calculateDailyBookingPrice', () => {
    beforeEach(() => {
      // Rimuove eventuali spy esistenti su questo metodo
      if (BookingService.calculateDailyBookingPrice.mockRestore) {
        BookingService.calculateDailyBookingPrice.mockRestore();
      }
    });

    it('dovrebbe calcolare il prezzo per prenotazioni multi-giorno', async () => {
      // Arrange
      const spaceId = 1;
      const startDate = '2025-09-20';
      const endDate = '2025-09-22';

      const mockSpace = {
        space_id: 1,
        space_name: 'Sala Conferenze',
        price_per_day: 75.00
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await BookingService.calculateDailyBookingPrice(spaceId, startDate, endDate);

      // Assert
      expect(result).toEqual({
        spaceId: 1,
        startDate: '2025-09-20',
        endDate: '2025-09-22',
        totalDays: 3, // 20, 21, 22
        pricePerDay: 75.00,
        finalPrice: 225.00, // 3 giorni * 75€
        space: {
          id: 1,
          name: 'Sala Conferenze',
          price_per_day: 75.00
        }
      });
    });

    it('dovrebbe calcolare il prezzo per un singolo giorno', async () => {
      // Arrange
      const spaceId = 1;
      const startDate = '2025-09-20';
      const endDate = '2025-09-20';

      const mockSpace = {
        space_id: 1,
        space_name: 'Ufficio Privato',
        price_per_day: 100.00
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await BookingService.calculateDailyBookingPrice(spaceId, startDate, endDate);

      // Assert
      expect(result.totalDays).toBe(1);
      expect(result.finalPrice).toBe(100.00);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const startDate = '2025-09-20';
      const endDate = '2025-09-22';

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(BookingService.calculateDailyBookingPrice(spaceId, startDate, endDate))
        .rejects.toThrow(AppError);
    });
  });

  describe('getBookings', () => {
    it('dovrebbe restituire solo le prenotazioni dell\'utente per ruolo user', async () => {
      // Arrange
      const currentUser = { user_id: 1, role: 'user' };
      const filters = { status: 'confirmed' };

      const mockBookings = [
        { booking_id: 1, user_id: 1, status: 'confirmed' },
        { booking_id: 2, user_id: 1, status: 'confirmed' }
      ];

      Booking.findAll.mockResolvedValue(mockBookings);

      // Act
      const result = await BookingService.getBookings(currentUser, filters);

      // Assert
      expect(Booking.findAll).toHaveBeenCalledWith({
        status: 'confirmed',
        user_id: 1 // Filtrato per l'utente
      });
      expect(result).toEqual(mockBookings);
    });

    it('dovrebbe restituire prenotazioni delle location gestite per manager', async () => {
      // Arrange
      const currentUser = { user_id: 2, role: 'manager' };
      const filters = {};

      const mockBookings = [
        { booking_id: 1, user_id: 3, space_id: 1 },
        { booking_id: 2, user_id: 4, space_id: 2 }
      ];

      jest.spyOn(BookingService, 'getManagedLocationIds')
        .mockResolvedValue([1, 2]);
      Booking.findAll.mockResolvedValue(mockBookings);

      // Act
      const result = await BookingService.getBookings(currentUser, filters);

      // Assert
      expect(BookingService.getManagedLocationIds).toHaveBeenCalledWith(2);
      expect(Booking.findAll).toHaveBeenCalledWith({
        location_id: [1, 2] // Filtrato per le location del manager
      });
      expect(result).toEqual(mockBookings);
    });

    it('dovrebbe restituire solo prenotazioni personali se manager non gestisce location', async () => {
      // Arrange
      const currentUser = { user_id: 2, role: 'manager' };
      const filters = {};

      jest.spyOn(BookingService, 'getManagedLocationIds')
        .mockResolvedValue([]); // Nessuna location gestita
      
      const mockBookings = [{ booking_id: 1, user_id: 2 }];
      Booking.findAll.mockResolvedValue(mockBookings);

      // Act
      const result = await BookingService.getBookings(currentUser, filters);

      // Assert
      expect(Booking.findAll).toHaveBeenCalledWith({
        user_id: 2 // Fallback alle proprie prenotazioni
      });
      expect(result).toEqual(mockBookings);
    });
  });
});
