const SpaceService = require('../../src/backend/services/SpaceService');
const Space = require('../../src/backend/models/Space');
const Location = require('../../src/backend/models/Location');
const AppError = require('../../src/backend/utils/AppError');

// Mock dei modelli
jest.mock('../../src/backend/models/Space');
jest.mock('../../src/backend/models/Location');

describe('SpaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSpace', () => {
    it('dovrebbe creare uno spazio quando l\'utente è admin', async () => {
      // Arrange
      const spaceData = {
        name: 'Sala Riunioni A',
        location_id: 1,
        capacity: 10,
        price_per_hour: 25.50,
        price_per_day: 150.00
      };
      
      const adminUser = {
        user_id: 1,
        role: 'admin'
      };

      const mockLocation = {
        location_id: 1,
        name: 'Location Test',
        manager_id: 2
      };

      const mockCreatedSpace = {
        space_id: 1,
        ...spaceData,
        created_at: new Date()
      };

      Location.findById.mockResolvedValue(mockLocation);
      Space.create.mockResolvedValue(mockCreatedSpace);

      // Act
      const result = await SpaceService.createSpace(spaceData, adminUser);

      // Assert
      expect(Location.findById).toHaveBeenCalledWith(spaceData.location_id);
      expect(Space.create).toHaveBeenCalledWith(spaceData);
      expect(result).toEqual(mockCreatedSpace);
    });

    it('dovrebbe creare uno spazio quando il manager gestisce la location', async () => {
      // Arrange
      const spaceData = {
        name: 'Sala Riunioni B',
        location_id: 1,
        capacity: 8,
        price_per_hour: 20.00
      };
      
      const managerUser = {
        user_id: 2,
        role: 'manager'
      };

      const mockLocation = {
        location_id: 1,
        name: 'Location Test',
        manager_id: 2 // Stesso ID del manager
      };

      const mockCreatedSpace = {
        space_id: 2,
        ...spaceData
      };

      Location.findById.mockResolvedValue(mockLocation);
      Space.create.mockResolvedValue(mockCreatedSpace);

      // Act
      const result = await SpaceService.createSpace(spaceData, managerUser);

      // Assert
      expect(Location.findById).toHaveBeenCalledWith(1);
      expect(Space.create).toHaveBeenCalledWith(spaceData);
      expect(result).toEqual(mockCreatedSpace);
    });

    it('dovrebbe lanciare errore se l\'utente non ha permessi', async () => {
      // Arrange
      const spaceData = { location_id: 1 };
      const regularUser = { user_id: 1, role: 'user' };

      // Act & Assert
      await expect(SpaceService.createSpace(spaceData, regularUser))
        .rejects.toThrow(AppError);
      
      expect(Location.findById).not.toHaveBeenCalled();
      expect(Space.create).not.toHaveBeenCalled();
    });

    it('dovrebbe lanciare errore se la location non esiste', async () => {
      // Arrange
      const spaceData = { location_id: 999 };
      const adminUser = { user_id: 1, role: 'admin' };

      Location.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(SpaceService.createSpace(spaceData, adminUser))
        .rejects.toThrow(AppError);
      
      expect(Location.findById).toHaveBeenCalledWith(999);
      expect(Space.create).not.toHaveBeenCalled();
    });

    it('dovrebbe lanciare errore se il manager non gestisce la location', async () => {
      // Arrange
      const spaceData = { location_id: 1 };
      const managerUser = { user_id: 3, role: 'manager' };
      
      const mockLocation = {
        location_id: 1,
        manager_id: 2 // Diverso dall'ID del manager
      };

      Location.findById.mockResolvedValue(mockLocation);

      // Act & Assert
      await expect(SpaceService.createSpace(spaceData, managerUser))
        .rejects.toThrow(AppError);
      
      expect(Space.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSpace', () => {
    it('dovrebbe aggiornare uno spazio quando l\'admin ne ha i permessi', async () => {
      // Arrange
      const spaceId = 1;
      const updateData = { name: 'Nuovo Nome', capacity: 15 };
      const adminUser = { user_id: 1, role: 'admin' };

      const mockSpace = {
        space_id: 1,
        name: 'Vecchio Nome',
        location_id: 1,
        capacity: 10
      };

      const mockUpdatedSpace = {
        ...mockSpace,
        ...updateData
      };

      Space.findById.mockResolvedValue(mockSpace);
      Space.update.mockResolvedValue(mockUpdatedSpace);

      // Act
      const result = await SpaceService.updateSpace(spaceId, updateData, adminUser);

      // Assert
      expect(Space.findById).toHaveBeenCalledWith(spaceId);
      expect(Space.update).toHaveBeenCalledWith(spaceId, updateData);
      expect(result).toEqual(mockUpdatedSpace);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const updateData = { name: 'Nuovo Nome' };
      const adminUser = { user_id: 1, role: 'admin' };

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(SpaceService.updateSpace(spaceId, updateData, adminUser))
        .rejects.toThrow(AppError);
      
      expect(Space.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSpace', () => {
    it('dovrebbe eliminare uno spazio quando l\'admin ne ha i permessi', async () => {
      // Arrange
      const spaceId = 1;
      const adminUser = { user_id: 1, role: 'admin' };

      const mockSpace = {
        space_id: 1,
        name: 'Spazio da eliminare',
        location_id: 1
      };

      Space.findById.mockResolvedValue(mockSpace);
      Space.delete.mockResolvedValue(true);

      // Act
      const result = await SpaceService.deleteSpace(spaceId, adminUser);

      // Assert
      expect(Space.findById).toHaveBeenCalledWith(spaceId);
      expect(Space.delete).toHaveBeenCalledWith(spaceId);
      expect(result).toBe(true);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const adminUser = { user_id: 1, role: 'admin' };

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(SpaceService.deleteSpace(spaceId, adminUser))
        .rejects.toThrow(AppError);
      
      expect(Space.delete).not.toHaveBeenCalled();
    });
  });

  describe('calculateBookingPrice', () => {
    it('dovrebbe calcolare il prezzo orario quando è più conveniente', async () => {
      // Arrange
      const spaceId = 1;
      const startTime = '2025-09-15T09:00:00Z';
      const endTime = '2025-09-15T12:00:00Z'; // 3 ore

      const mockSpace = {
        space_id: 1,
        name: 'Sala Test',
        price_per_hour: 10.00,
        price_per_day: 50.00,
        toJSON: jest.fn().mockReturnValue({
          space_id: 1,
          name: 'Sala Test',
          price_per_hour: 10.00,
          price_per_day: 50.00
        })
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await SpaceService.calculateBookingPrice(spaceId, startTime, endTime);

      // Assert
      expect(Space.findById).toHaveBeenCalledWith(spaceId);
      expect(result).toEqual({
        spaceId: 1,
        space: {
          space_id: 1,
          name: 'Sala Test',
          price_per_hour: 10.00,
          price_per_day: 50.00
        },
        duration: {
          hours: 3,
          days: expect.any(Number)
        },
        pricing: {
          hourlyTotal: 30.00, // 3 ore * 10.00
          dailyTotal: 50.00,  // 1 giorno * 50.00
          finalPrice: 30.00,  // Il più basso
          pricingType: 'hourly',
          savings: 20.00
        }
      });
    });

    it('dovrebbe calcolare il prezzo giornaliero quando è più conveniente', async () => {
      // Arrange
      const spaceId = 1;
      const startTime = '2025-09-15T09:00:00Z';
      const endTime = '2025-09-17T18:00:00Z'; // Circa 57 ore (più di 2 giorni)

      const mockSpace = {
        space_id: 1,
        name: 'Sala Test',
        price_per_hour: 10.00,
        price_per_day: 100.00, // Prezzo più basso per rendere il giornaliero conveniente
        toJSON: jest.fn().mockReturnValue({
          space_id: 1,
          name: 'Sala Test',
          price_per_hour: 10.00,
          price_per_day: 100.00
        })
      };

      Space.findById.mockResolvedValue(mockSpace);

      // Act
      const result = await SpaceService.calculateBookingPrice(spaceId, startTime, endTime);

      // Assert
      expect(result.pricing.pricingType).toBe('daily');
      expect(result.pricing.finalPrice).toBe(300.00); // 3 giorni * 100.00
      expect(result.pricing.dailyTotal).toBeLessThan(result.pricing.hourlyTotal);
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const startTime = '2025-09-15T09:00:00Z';
      const endTime = '2025-09-15T12:00:00Z';

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(SpaceService.calculateBookingPrice(spaceId, startTime, endTime))
        .rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore per date non valide', async () => {
      // Arrange
      const spaceId = 1;
      const startTime = 'data-non-valida';
      const endTime = '2025-09-15T12:00:00Z';

      const mockSpace = { space_id: 1, price_per_hour: 10.00 };
      Space.findById.mockResolvedValue(mockSpace);

      // Act & Assert
      await expect(SpaceService.calculateBookingPrice(spaceId, startTime, endTime))
        .rejects.toThrow(AppError);
    });
  });

  describe('checkSpaceAvailability', () => {
    it('dovrebbe verificare la disponibilità di uno spazio', async () => {
      // Arrange
      const spaceId = 1;
      const startTime = new Date('2025-09-15T09:00:00Z');
      const endTime = new Date('2025-09-15T12:00:00Z');

      const mockSpace = {
        space_id: 1,
        name: 'Sala Test',
        toJSON: jest.fn().mockReturnValue({
          space_id: 1,
          name: 'Sala Test'
        })
      };

      Space.findById.mockResolvedValue(mockSpace);
      Space.checkAvailability.mockResolvedValue(true);

      // Act
      const result = await SpaceService.checkSpaceAvailability(spaceId, startTime, endTime);

      // Assert
      expect(Space.findById).toHaveBeenCalledWith(spaceId);
      expect(Space.checkAvailability).toHaveBeenCalledWith(spaceId, startTime, endTime);
      expect(result).toEqual({
        spaceId: 1,
        available: true,
        period: {
          start: startTime,
          end: endTime
        },
        space: {
          space_id: 1,
          name: 'Sala Test'
        }
      });
    });

    it('dovrebbe lanciare errore se lo spazio non esiste', async () => {
      // Arrange
      const spaceId = 999;
      const startTime = new Date();
      const endTime = new Date();

      Space.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(SpaceService.checkSpaceAvailability(spaceId, startTime, endTime))
        .rejects.toThrow(AppError);
      
      expect(Space.checkAvailability).not.toHaveBeenCalled();
    });
  });

  describe('searchAvailableSpaces', () => {
    it('dovrebbe cercare spazi disponibili con criteri', async () => {
      // Arrange
      const searchCriteria = {
        startDate: '2025-09-15T09:00:00Z',
        endDate: '2025-09-15T12:00:00Z',
        city: 'Milano',
        capacity: '10',
        max_price_hour: '25.50'
      };

      const mockSpaces = [
        { space_id: 1, name: 'Sala A', capacity: 10 },
        { space_id: 2, name: 'Sala B', capacity: 12 }
      ];

      Space.findAvailable.mockResolvedValue(mockSpaces);

      // Act
      const result = await SpaceService.searchAvailableSpaces(searchCriteria);

      // Assert
      expect(Space.findAvailable).toHaveBeenCalledWith({
        startDate: new Date('2025-09-15T09:00:00Z'),
        endDate: new Date('2025-09-15T12:00:00Z'),
        city: 'Milano',
        location_id: undefined,
        capacity: 10,
        space_type_id: null,
        max_price_hour: 25.50
      });
      expect(result).toEqual(mockSpaces);
    });

    it('dovrebbe gestire criteri di ricerca vuoti', async () => {
      // Arrange
      const searchCriteria = {};
      const mockSpaces = [];

      Space.findAvailable.mockResolvedValue(mockSpaces);

      // Act
      const result = await SpaceService.searchAvailableSpaces(searchCriteria);

      // Assert
      expect(Space.findAvailable).toHaveBeenCalledWith({
        startDate: null,
        endDate: null,
        city: undefined,
        location_id: undefined,
        capacity: null,
        space_type_id: null,
        max_price_hour: null
      });
      expect(result).toEqual(mockSpaces);
    });
  });
});
