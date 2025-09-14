const AvailabilityService = require('../../src/backend/services/AvailabilityService');
const Availability = require('../../src/backend/models/Availability');
const Space = require('../../src/backend/models/Space');
const AppError = require('../../src/backend/utils/AppError');
const db = require('../../src/backend/config/db');

// Mock delle dipendenze
jest.mock('../../src/backend/models/Availability');
jest.mock('../../src/backend/models/Space');
jest.mock('../../src/backend/config/db');

describe('AvailabilityService', () => {
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock client database
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        
        db.connect = jest.fn().mockResolvedValue(mockClient);
    });

    describe('getSpaceAvailability', () => {
        const mockSpace = {
            space_id: 1,
            space_name: 'Test Space',
            price_per_hour: 10.50,
            price_per_day: 80.00,
            capacity: 4,
            opening_time: '08:00',
            closing_time: '18:00',
            available_days: [1, 2, 3, 4, 5]
        };

        const mockAvailability = [
            {
                availability_id: 1,
                space_id: 1,
                availability_date: '2024-12-21',
                start_time: '09:00',
                end_time: '17:00',
                is_available: true
            }
        ];

        it('dovrebbe restituire disponibilità spazio con successo', async () => {
            // Arrange
            Space.findById.mockResolvedValue(mockSpace);
            Availability.findBySpaceAndDateRange.mockResolvedValue(mockAvailability);

            // Act
            const result = await AvailabilityService.getSpaceAvailability(1, '2024-12-21', '2024-12-21');

            // Assert
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Availability.findBySpaceAndDateRange).toHaveBeenCalledWith(1, '2024-12-21', '2024-12-21');
            expect(result).toEqual({
                spaceDetails: {
                    id: 1,
                    name: 'Test Space',
                    pricePerHour: 10.50,
                    pricePerDay: 80.00,
                    capacity: 4,
                    openingTime: '08:00',
                    closingTime: '18:00',
                    availableDays: [1, 2, 3, 4, 5]
                },
                availabilityBlocks: mockAvailability
            });
        });

        it('dovrebbe lanciare errore se spazio non trovato', async () => {
            // Arrange
            Space.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(AvailabilityService.getSpaceAvailability(999, '2024-12-21', '2024-12-21'))
                .rejects.toThrow('Spazio non trovato');
        });

        it('dovrebbe validare parametri di input', async () => {
            // Act & Assert
            await expect(AvailabilityService.getSpaceAvailability(null, '2024-12-21', '2024-12-21'))
                .rejects.toThrow('Space ID, data di inizio e data di fine sono obbligatori');

            await expect(AvailabilityService.getSpaceAvailability(1, 'invalid-date', '2024-12-21'))
                .rejects.toThrow('Formato data non valido');

            await expect(AvailabilityService.getSpaceAvailability(1, '2024-12-22', '2024-12-21'))
                .rejects.toThrow('La data di inizio deve essere precedente alla data di fine');
        });
    });

    describe('createAvailability', () => {
        const mockSpace = {
            space_id: 1,
            opening_time: '08:00',
            closing_time: '18:00',
            available_days: [1, 2, 3, 4, 5]
        };

        const mockAvailabilityData = {
            space_id: 1,
            availability_date: '2024-12-23', // Lunedì
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
        };

        beforeEach(() => {
            Space.findById.mockResolvedValue(mockSpace);
        });

        it('dovrebbe creare disponibilità con successo', async () => {
            // Arrange
            const newAvailability = { availability_id: 1, ...mockAvailabilityData };
            Availability.create.mockResolvedValue(newAvailability);
            AvailabilityService.checkForOverlaps = jest.fn().mockResolvedValue();

            // Act
            const result = await AvailabilityService.createAvailability(mockAvailabilityData);

            // Assert
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Availability.create).toHaveBeenCalledWith(mockAvailabilityData);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(newAvailability);
        });

        it('dovrebbe lanciare errore se spazio non trovato', async () => {
            // Arrange
            Space.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(AvailabilityService.createAvailability(mockAvailabilityData))
                .rejects.toThrow('Spazio non trovato');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('dovrebbe validare dati di input', async () => {
            // Arrange
            const invalidData = { space_id: 1 }; // Dati incompleti

            // Act & Assert
            await expect(AvailabilityService.createAvailability(invalidData))
                .rejects.toThrow('Space ID, data, ora di inizio e ora di fine sono obbligatori');
        });

        it('dovrebbe lanciare errore per orario fuori apertura', async () => {
            // Arrange
            const invalidTimeData = {
                ...mockAvailabilityData,
                start_time: '07:00', // Prima dell'apertura
                end_time: '09:00'
            };

            // Act & Assert
            await expect(AvailabilityService.createAvailability(invalidTimeData))
                .rejects.toThrow('Orario fuori dall\'orario di apertura dello spazio');
        });

        it('dovrebbe lanciare errore per giorno non disponibile', async () => {
            // Arrange
            const weekendData = {
                ...mockAvailabilityData,
                availability_date: '2024-12-22' // Domenica (giorno 0)
            };

            // Act & Assert
            await expect(AvailabilityService.createAvailability(weekendData))
                .rejects.toThrow('Il giorno selezionato non è tra i giorni disponibili dello spazio');
        });

        it('dovrebbe gestire errori di transazione', async () => {
            // Arrange
            Availability.create.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(AvailabilityService.createAvailability(mockAvailabilityData))
                .rejects.toThrow('Errore nella creazione del blocco di disponibilità');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    describe('updateAvailability', () => {
        const mockAvailability = {
            availability_id: 1,
            space_id: 1,
            availability_date: '2024-12-23',
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
        };

        const mockSpace = {
            space_id: 1,
            opening_time: '08:00',
            closing_time: '18:00'
        };

        beforeEach(() => {
            AvailabilityService.getAvailabilityById = jest.fn().mockResolvedValue(mockAvailability);
            Space.findById.mockResolvedValue(mockSpace);
            AvailabilityService.checkForOverlaps = jest.fn().mockResolvedValue();
        });

        it('dovrebbe aggiornare disponibilità con successo', async () => {
            // Arrange
            const updateData = { start_time: '10:00' };
            const updatedAvailability = { ...mockAvailability, ...updateData };
            Availability.update.mockResolvedValue(updatedAvailability);

            // Act
            const result = await AvailabilityService.updateAvailability(1, updateData);

            // Assert
            expect(AvailabilityService.getAvailabilityById).toHaveBeenCalledWith(1);
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Availability.update).toHaveBeenCalledWith(1, updateData);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(updatedAvailability);
        });

        it('dovrebbe lanciare errore se nessun campo fornito', async () => {
            // Act & Assert
            await expect(AvailabilityService.updateAvailability(1, {}))
                .rejects.toThrow('Nessun campo valido fornito per l\'aggiornamento');
        });

        it('dovrebbe validare nuovo orario se fornito', async () => {
            // Arrange
            const invalidUpdate = { start_time: '07:00' }; // Prima dell'apertura

            // Act & Assert
            await expect(AvailabilityService.updateAvailability(1, invalidUpdate))
                .rejects.toThrow('Orario fuori dall\'orario di apertura dello spazio');
        });

        it('dovrebbe gestire errori di transazione', async () => {
            // Arrange
            const updateData = { start_time: '10:00' };
            Availability.update.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(AvailabilityService.updateAvailability(1, updateData))
                .rejects.toThrow('Errore nell\'aggiornamento del blocco di disponibilità');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    describe('deleteAvailability', () => {
        const mockAvailability = {
            availability_id: 1,
            space_id: 1
        };

        beforeEach(() => {
            AvailabilityService.getAvailabilityById = jest.fn().mockResolvedValue(mockAvailability);
        });

        it('dovrebbe eliminare disponibilità con successo', async () => {
            // Arrange
            Availability.hasAssociatedBookings.mockResolvedValue(false);
            Availability.delete.mockResolvedValue(true);

            // Act
            const result = await AvailabilityService.deleteAvailability(1);

            // Assert
            expect(AvailabilityService.getAvailabilityById).toHaveBeenCalledWith(1);
            expect(Availability.hasAssociatedBookings).toHaveBeenCalledWith(1);
            expect(Availability.delete).toHaveBeenCalledWith(1);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toBe(true);
        });

        it('dovrebbe lanciare errore se ci sono prenotazioni associate', async () => {
            // Arrange
            Availability.hasAssociatedBookings.mockResolvedValue(true);

            // Act & Assert
            await expect(AvailabilityService.deleteAvailability(1))
                .rejects.toThrow('Impossibile eliminare il blocco: esistono prenotazioni associate');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    // Nota: getAvailabilityById è testato indirettamente attraverso updateAvailability e deleteAvailability

    describe('generateAvailabilitySchedule', () => {
        const mockSpace = {
            space_id: 1,
            opening_time: '08:00',
            closing_time: '18:00',
            available_days: [1, 2, 3, 4, 5]
        };

        beforeEach(() => {
            Space.findById.mockResolvedValue(mockSpace);
        });

        it('dovrebbe generare programma disponibilità con successo', async () => {
            // Arrange
            const mockBlock = { availability_id: 1, space_id: 1 };
            Availability.findBySpaceDateTime.mockResolvedValue(null);
            Availability.create.mockResolvedValue(mockBlock);

            // Act
            const result = await AvailabilityService.generateAvailabilitySchedule(
                1, '2024-12-23', '2024-12-25', '09:00', '17:00', []
            );

            // Assert
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(result).toHaveLength(3); // 3 giorni lavorativi
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('dovrebbe escludere giorni specificati', async () => {
            // Arrange
            Availability.findBySpaceDateTime.mockResolvedValue(null);
            Availability.create.mockResolvedValue({ availability_id: 1 });

            // Act
            const result = await AvailabilityService.generateAvailabilitySchedule(
                1, '2024-12-23', '2024-12-25', '09:00', '17:00', [1, 2] // Escludi lunedì e martedì
            );

            // Assert
            expect(result).toHaveLength(1); // Solo mercoledì rimane
        });

        it('dovrebbe lanciare errore per orario non valido', async () => {
            // Act & Assert
            await expect(AvailabilityService.generateAvailabilitySchedule(
                1, '2024-12-23', '2024-12-25', '07:00', '09:00' // Prima dell'apertura
            )).rejects.toThrow('Orario fuori dall\'orario di apertura dello spazio');
        });

        it('dovrebbe saltare blocchi già esistenti', async () => {
            // Arrange
            Availability.findBySpaceDateTime.mockResolvedValue({ availability_id: 1 }); // Blocco esistente

            // Act
            const result = await AvailabilityService.generateAvailabilitySchedule(
                1, '2024-12-23', '2024-12-23', '09:00', '17:00', []
            );

            // Assert
            expect(result).toHaveLength(0); // Nessun nuovo blocco creato
            expect(Availability.create).not.toHaveBeenCalled();
        });
    });

    describe('checkBookingAvailability', () => {
        it('dovrebbe verificare disponibilità per prenotazione singolo giorno', async () => {
            // Arrange
            const mockAvailabilityCheck = {
                isAvailable: true,
                availableDays: ['2024-12-23'],
                conflictingBookings: []
            };
            Space.checkDailyAvailability.mockResolvedValue(mockAvailabilityCheck);

            // Act
            const result = await AvailabilityService.checkBookingAvailability(1, '2024-12-23');

            // Assert
            expect(Space.checkDailyAvailability).toHaveBeenCalledWith(1, '2024-12-23', '2024-12-23');
            expect(result).toEqual(mockAvailabilityCheck);
        });

        it('dovrebbe verificare disponibilità per periodo multiplo', async () => {
            // Arrange
            const mockAvailabilityCheck = {
                isAvailable: false,
                availableDays: ['2024-12-23'],
                conflictingBookings: ['2024-12-24']
            };
            Space.checkDailyAvailability.mockResolvedValue(mockAvailabilityCheck);

            // Act
            const result = await AvailabilityService.checkBookingAvailability(1, '2024-12-23', '2024-12-25');

            // Assert
            expect(Space.checkDailyAvailability).toHaveBeenCalledWith(1, '2024-12-23', '2024-12-25');
            expect(result).toEqual(mockAvailabilityCheck);
        });
    });

    describe('getAvailabilityStatistics', () => {
        const mockSpace = {
            space_id: 1,
            space_name: 'Test Space',
            space_type_id: 1,
            capacity: 4,
            price_per_hour: '10.50'
        };

        const mockStats = {
            totalBlocks: 10,
            availableBlocks: 8,
            bookedBlocks: 2,
            utilizationRate: 20
        };

        it('dovrebbe restituire statistiche complete', async () => {
            // Arrange
            Space.findById.mockResolvedValue(mockSpace);
            Availability.getStatistics.mockResolvedValue(mockStats);

            // Act
            const result = await AvailabilityService.getAvailabilityStatistics(1, '2024-12-23', '2024-12-25');

            // Assert
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Availability.getStatistics).toHaveBeenCalledWith(1, '2024-12-23', '2024-12-25');
            expect(result).toEqual({
                ...mockStats,
                spaceInfo: {
                    name: 'Test Space',
                    type: 1,
                    capacity: 4,
                    pricePerHour: 10.50
                },
                periodInfo: {
                    startDate: '2024-12-23',
                    endDate: '2024-12-25',
                    totalDays: 3
                }
            });
        });

        it('dovrebbe lanciare errore se spazio non trovato', async () => {
            // Arrange
            Space.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(AvailabilityService.getAvailabilityStatistics(999, '2024-12-23', '2024-12-25'))
                .rejects.toThrow('Spazio non trovato');
        });
    });

    describe('disableAvailabilityPeriod', () => {
        const mockSpace = { space_id: 1 };

        beforeEach(() => {
            Space.findById.mockResolvedValue(mockSpace);
        });

        it('dovrebbe disabilitare periodo con successo', async () => {
            // Arrange
            const disabledBlocks = [
                { availability_id: 1, is_available: false, reason: 'Manutenzione' }
            ];
            Availability.hasBookingsInPeriod.mockResolvedValue(false);
            Availability.disablePeriod.mockResolvedValue(disabledBlocks);

            // Act
            const result = await AvailabilityService.disableAvailabilityPeriod(
                1, '2024-12-23', '2024-12-25', 'Manutenzione'
            );

            // Assert
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Availability.hasBookingsInPeriod).toHaveBeenCalledWith(1, '2024-12-23', '2024-12-25');
            expect(Availability.disablePeriod).toHaveBeenCalledWith(1, '2024-12-23', '2024-12-25', 'Manutenzione');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(disabledBlocks);
        });

        it('dovrebbe lanciare errore se ci sono prenotazioni', async () => {
            // Arrange
            Availability.hasBookingsInPeriod.mockResolvedValue(true);

            // Act & Assert
            await expect(AvailabilityService.disableAvailabilityPeriod(1, '2024-12-23', '2024-12-25'))
                .rejects.toThrow('Esistono prenotazioni nel periodo selezionato');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    describe('isWithinOpeningHours', () => {
        const mockSpace = {
            opening_time: '08:00',
            closing_time: '18:00'
        };

        it('dovrebbe restituire true per orario valido', () => {
            // Act
            const result = AvailabilityService.isWithinOpeningHours('09:00', '17:00', mockSpace);

            // Assert
            expect(result).toBe(true);
        });

        it('dovrebbe restituire false per orario prima apertura', () => {
            // Act
            const result = AvailabilityService.isWithinOpeningHours('07:00', '09:00', mockSpace);

            // Assert
            expect(result).toBe(false);
        });

        it('dovrebbe restituire false per orario dopo chiusura', () => {
            // Act
            const result = AvailabilityService.isWithinOpeningHours('17:00', '19:00', mockSpace);

            // Assert
            expect(result).toBe(false);
        });

        it('dovrebbe gestire orario esatto di apertura/chiusura', () => {
            // Act
            const result = AvailabilityService.isWithinOpeningHours('08:00', '18:00', mockSpace);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('validateAvailabilityQuery', () => {
        it('dovrebbe validare query corretta', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityQuery(1, '2024-12-23', '2024-12-25');
            }).not.toThrow();
        });

        it('dovrebbe lanciare errore per parametri mancanti', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityQuery(null, '2024-12-23', '2024-12-25');
            }).toThrow('Space ID, data di inizio e data di fine sono obbligatori');
        });

        it('dovrebbe lanciare errore per date non valide', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityQuery(1, 'invalid-date', '2024-12-25');
            }).toThrow('Formato data non valido');
        });

        it('dovrebbe lanciare errore per intervallo date non valido', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityQuery(1, '2024-12-25', '2024-12-23');
            }).toThrow('La data di inizio deve essere precedente alla data di fine');
        });
    });

    describe('validateAvailabilityData', () => {
        const validData = {
            space_id: 1,
            availability_date: '2024-12-23',
            start_time: '09:00',
            end_time: '17:00'
        };

        it('dovrebbe validare dati corretti', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityData(validData);
            }).not.toThrow();
        });

        it('dovrebbe lanciare errore per dati incompleti', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityData({ space_id: 1 });
            }).toThrow('Space ID, data, ora di inizio e ora di fine sono obbligatori');
        });

        it('dovrebbe lanciare errore per formato data non valido', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityData({
                    ...validData,
                    availability_date: 'invalid-date'
                });
            }).toThrow('Formato data non valido');
        });

        it('dovrebbe lanciare errore per formato ora non valido', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityData({
                    ...validData,
                    start_time: '25:00'
                });
            }).toThrow('Formato ora non valido');
        });

        it('dovrebbe lanciare errore per intervallo ora non valido', () => {
            // Act & Assert
            expect(() => {
                AvailabilityService.validateAvailabilityData({
                    ...validData,
                    start_time: '17:00',
                    end_time: '09:00'
                });
            }).toThrow('L\'ora di inizio deve essere precedente all\'ora di fine');
        });
    });

    describe('isValidDate', () => {
        it('dovrebbe validare date corrette', () => {
            expect(AvailabilityService.isValidDate('2024-12-23')).toBe(true);
            expect(AvailabilityService.isValidDate('2024-02-29')).toBe(true); // Anno bisestile
        });

        it('dovrebbe invalidare date non corrette', () => {
            expect(AvailabilityService.isValidDate('invalid-date')).toBe(false);
            expect(AvailabilityService.isValidDate('2024-13-01')).toBe(false);
            expect(AvailabilityService.isValidDate('2024-12-32')).toBe(false);
        });
    });

    describe('isValidTime', () => {
        it('dovrebbe validare orari corretti', () => {
            expect(AvailabilityService.isValidTime('09:00')).toBe(true);
            expect(AvailabilityService.isValidTime('23:59')).toBe(true);
            expect(AvailabilityService.isValidTime('00:00')).toBe(true);
        });

        it('dovrebbe invalidare orari non corretti', () => {
            expect(AvailabilityService.isValidTime('25:00')).toBe(false);
            expect(AvailabilityService.isValidTime('12:60')).toBe(false);
            expect(AvailabilityService.isValidTime('invalid-time')).toBe(false);
        });
    });
});
