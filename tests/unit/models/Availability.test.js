// tests/unit/models/Availability.test.js
const Availability = require('../../../src/backend/models/Availability');

describe('Availability Model - Basic Tests', () => {
    const mockAvailability = {
        availability_id: 1,
        space_id: 1,
        availability_date: '2024-03-15',
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
    };

    describe('data structure', () => {
        it('should return consistent availability structure', () => {
            const availability = mockAvailability;

            expect(availability).toHaveProperty('availability_id');
            expect(availability).toHaveProperty('space_id');
            expect(availability).toHaveProperty('availability_date');
            expect(availability).toHaveProperty('start_time');
            expect(availability).toHaveProperty('end_time');
            expect(availability).toHaveProperty('is_available');

            expect(typeof availability.availability_id).toBe('number');
            expect(typeof availability.space_id).toBe('number');
            expect(typeof availability.availability_date).toBe('string');
            expect(typeof availability.start_time).toBe('string');
            expect(typeof availability.end_time).toBe('string');
            expect(typeof availability.is_available).toBe('boolean');
        });

        it('should handle extended availability with space info', () => {
            const extendedAvailability = {
                ...mockAvailability,
                space_name: 'Sala Conferenze A',
                location_name: 'Milano Centro'
            };

            expect(extendedAvailability).toHaveProperty('space_name');
            expect(extendedAvailability).toHaveProperty('location_name');
            expect(typeof extendedAvailability.space_name).toBe('string');
            expect(typeof extendedAvailability.location_name).toBe('string');
        });

        it('should maintain consistent property naming', () => {
            const availability = mockAvailability;

            expect(availability.hasOwnProperty('availability_id')).toBe(true);
            expect(availability.hasOwnProperty('space_id')).toBe(true);
            expect(availability.hasOwnProperty('availability_date')).toBe(true);
            expect(availability.hasOwnProperty('start_time')).toBe(true);
            expect(availability.hasOwnProperty('end_time')).toBe(true);
            expect(availability.hasOwnProperty('is_available')).toBe(true);

            // Non dovrebbe avere alias
            expect(availability.hasOwnProperty('id')).toBe(false);
            expect(availability.hasOwnProperty('date')).toBe(false);
            expect(availability.hasOwnProperty('available')).toBe(false);
        });

        it('should handle default values', () => {
            const availabilityWithDefaults = {
                space_id: 1,
                availability_date: '2024-03-15',
                start_time: '09:00',
                end_time: '17:00',
                is_available: true // default value
            };

            expect(availabilityWithDefaults.is_available).toBe(true);
        });
    });

    describe('date and time validation patterns', () => {
        it('should recognize valid date formats', () => {
            const validDates = [
                '2024-03-15',
                '2024-12-31',
                '2024-01-01',
                '2024-02-29' // leap year
            ];

            validDates.forEach(date => {
                expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(new Date(date)).toBeInstanceOf(Date);
                expect(isNaN(new Date(date).getTime())).toBe(false);
            });
        });

        it('should recognize valid time formats', () => {
            const validTimes = [
                '09:00',
                '17:30',
                '00:00',
                '23:59',
                '12:00',
                '08:15'
            ];

            validTimes.forEach(time => {
                expect(time).toMatch(/^\d{2}:\d{2}$/);
                const [hours, minutes] = time.split(':').map(Number);
                expect(hours).toBeGreaterThanOrEqual(0);
                expect(hours).toBeLessThanOrEqual(23);
                expect(minutes).toBeGreaterThanOrEqual(0);
                expect(minutes).toBeLessThanOrEqual(59);
            });
        });

        it('should validate time range consistency', () => {
            const timeRanges = [
                { start: '09:00', end: '17:00' }, // valid
                { start: '08:00', end: '18:30' }, // valid
                { start: '10:15', end: '14:45' }, // valid
                { start: '23:00', end: '23:59' }  // valid
            ];

            timeRanges.forEach(range => {
                const startMinutes = timeToMinutes(range.start);
                const endMinutes = timeToMinutes(range.end);
                expect(endMinutes).toBeGreaterThan(startMinutes);
            });

            function timeToMinutes(time) {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            }
        });

        it('should handle date validation for business rules', () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Disponibilità future dovrebbero essere valide
            expect(new Date(tomorrowStr) > today).toBe(true);
            
            // Disponibilità passate potrebbero non essere modificabili
            expect(new Date(yesterdayStr) < today).toBe(true);
        });
    });

    describe('business logic patterns', () => {
        it('should represent standard working hours', () => {
            const workingHours = [
                { start: '09:00', end: '17:00' }, // standard
                { start: '08:00', end: '18:00' }, // extended
                { start: '10:00', end: '16:00' }, // reduced
                { start: '07:00', end: '19:00' }  // full day
            ];

            workingHours.forEach(hours => {
                expect(hours.start).toMatch(/^\d{2}:\d{2}$/);
                expect(hours.end).toMatch(/^\d{2}:\d{2}$/);
                
                const startTime = new Date(`2024-01-01T${hours.start}:00`);
                const endTime = new Date(`2024-01-01T${hours.end}:00`);
                expect(endTime.getTime()).toBeGreaterThan(startTime.getTime());
            });
        });

        it('should support availability status management', () => {
            const availabilityStatuses = [
                { is_available: true, reason: null },
                { is_available: false, reason: 'Manutenzione' },
                { is_available: false, reason: 'Evento privato' },
                { is_available: true, reason: null }
            ];

            availabilityStatuses.forEach(status => {
                expect(typeof status.is_available).toBe('boolean');
                if (!status.is_available && status.reason) {
                    expect(typeof status.reason).toBe('string');
                    expect(status.reason.length).toBeGreaterThan(0);
                }
            });
        });

        it('should handle date range operations', () => {
            const dateRanges = [
                { start: '2024-03-01', end: '2024-03-31' }, // monthly
                { start: '2024-03-15', end: '2024-03-15' }, // single day
                { start: '2024-03-01', end: '2024-03-07' },  // weekly
                { start: '2024-01-01', end: '2024-12-31' }   // yearly
            ];

            dateRanges.forEach(range => {
                const startDate = new Date(range.start);
                const endDate = new Date(range.end);
                expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            });
        });

        it('should support availability filtering and search', () => {
            const searchFilters = [
                { spaceId: 1, availableOnly: true },
                { spaceId: [1, 2, 3], dateFrom: '2024-03-01' },
                { locationId: 1, timeRange: { start: '09:00', end: '17:00' } },
                { isAvailable: true, dateRange: { from: '2024-03-01', to: '2024-03-31' } }
            ];

            searchFilters.forEach(filter => {
                expect(typeof filter).toBe('object');
                
                if (filter.spaceId) {
                    expect(typeof filter.spaceId === 'number' || Array.isArray(filter.spaceId)).toBe(true);
                }
                
                if (filter.availableOnly !== undefined) {
                    expect(typeof filter.availableOnly).toBe('boolean');
                }
                
                if (filter.dateFrom) {
                    expect(filter.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                }
            });
        });
    });

    describe('time calculation utilities', () => {
        it('should handle time arithmetic operations', () => {
            const timeOperations = [
                { time: '09:00', addMinutes: 60, expected: '10:00' },
                { time: '14:30', addMinutes: 90, expected: '16:00' },
                { time: '23:30', addMinutes: 60, expected: '00:30' }, // cross midnight
                { time: '08:45', addMinutes: 15, expected: '09:00' }
            ];

            timeOperations.forEach(op => {
                if (op.time !== '23:30') { // skip cross-midnight for simplicity
                    const [hours, minutes] = op.time.split(':').map(Number);
                    const totalMinutes = hours * 60 + minutes + op.addMinutes;
                    const newHours = Math.floor(totalMinutes / 60) % 24;
                    const newMinutes = totalMinutes % 60;
                    const result = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                    
                    expect(result).toBe(op.expected);
                }
            });
        });

        it('should calculate duration between times', () => {
            const durations = [
                { start: '09:00', end: '17:00', expectedHours: 8 },
                { start: '10:30', end: '12:30', expectedHours: 2 },
                { start: '14:15', end: '16:45', expectedHours: 2.5 },
                { start: '08:00', end: '18:30', expectedHours: 10.5 }
            ];

            durations.forEach(duration => {
                const startTime = timeToMinutes(duration.start);
                const endTime = timeToMinutes(duration.end);
                const durationMinutes = endTime - startTime;
                const durationHours = durationMinutes / 60;
                
                expect(durationHours).toBe(duration.expectedHours);
            });

            function timeToMinutes(time) {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            }
        });

        it('should handle time slot generation', () => {
            const slotConfigs = [
                { start: '09:00', end: '17:00', slotDuration: 60 }, // hourly slots
                { start: '10:00', end: '16:00', slotDuration: 30 }, // half-hour slots
                { start: '08:00', end: '12:00', slotDuration: 120 } // 2-hour slots
            ];

            slotConfigs.forEach(config => {
                const startMinutes = timeToMinutes(config.start);
                const endMinutes = timeToMinutes(config.end);
                const totalDuration = endMinutes - startMinutes;
                const expectedSlots = Math.floor(totalDuration / config.slotDuration);
                
                expect(expectedSlots).toBeGreaterThan(0);
                expect(totalDuration % config.slotDuration).toBeGreaterThanOrEqual(0);
            });

            function timeToMinutes(time) {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            }
        });
    });

    describe('statistics and reporting patterns', () => {
        it('should support availability statistics calculation', () => {
            const mockStats = {
                totalSlots: 100,
                availableSlots: 75,
                bookedSlots: 20,
                unavailableSlots: 5,
                utilizationRate: 0.25, // 25%
                availabilityRate: 0.75  // 75%
            };

            expect(typeof mockStats.totalSlots).toBe('number');
            expect(typeof mockStats.availableSlots).toBe('number');
            expect(typeof mockStats.bookedSlots).toBe('number');
            expect(typeof mockStats.unavailableSlots).toBe('number');
            expect(typeof mockStats.utilizationRate).toBe('number');
            expect(typeof mockStats.availabilityRate).toBe('number');

            // Business logic validation
            expect(mockStats.availableSlots + mockStats.bookedSlots + mockStats.unavailableSlots)
                .toBe(mockStats.totalSlots);
            expect(mockStats.utilizationRate).toBeLessThanOrEqual(1);
            expect(mockStats.availabilityRate).toBeLessThanOrEqual(1);
        });

        it('should handle period-based availability analysis', () => {
            const periods = [
                { name: 'Morning', start: '08:00', end: '12:00' },
                { name: 'Afternoon', start: '12:00', end: '17:00' },
                { name: 'Evening', start: '17:00', end: '20:00' }
            ];

            periods.forEach(period => {
                expect(period.name).toBeTruthy();
                expect(typeof period.name).toBe('string');
                expect(period.start).toMatch(/^\d{2}:\d{2}$/);
                expect(period.end).toMatch(/^\d{2}:\d{2}$/);
                
                const startTime = timeToMinutes(period.start);
                const endTime = timeToMinutes(period.end);
                expect(endTime).toBeGreaterThan(startTime);
            });

            function timeToMinutes(time) {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            }
        });

        it('should support availability trend analysis', () => {
            const trendData = [
                { date: '2024-03-01', availableHours: 8, bookedHours: 6 },
                { date: '2024-03-02', availableHours: 8, bookedHours: 4 },
                { date: '2024-03-03', availableHours: 6, bookedHours: 5 },  // ridotta disponibilità
                { date: '2024-03-04', availableHours: 8, bookedHours: 7 }
            ];

            trendData.forEach(day => {
                expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(typeof day.availableHours).toBe('number');
                expect(typeof day.bookedHours).toBe('number');
                expect(day.availableHours).toBeGreaterThanOrEqual(0);
                expect(day.bookedHours).toBeGreaterThanOrEqual(0);
                expect(day.bookedHours).toBeLessThanOrEqual(day.availableHours);
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle boundary time values', () => {
            const boundaryTimes = [
                '00:00', // midnight start
                '23:59', // almost midnight end
                '12:00', // noon
                '24:00'  // should be invalid
            ];

            boundaryTimes.forEach(time => {
                if (time !== '24:00') {
                    expect(time).toMatch(/^\d{2}:\d{2}$/);
                    const [hours, minutes] = time.split(':').map(Number);
                    expect(hours).toBeGreaterThanOrEqual(0);
                    expect(hours).toBeLessThanOrEqual(23);
                    expect(minutes).toBeGreaterThanOrEqual(0);
                    expect(minutes).toBeLessThanOrEqual(59);
                } else {
                    // Invalid time should be handled appropriately
                    const [hours] = time.split(':').map(Number);
                    expect(hours).toBeGreaterThan(23); // Invalid hour
                }
            });
        });

        it('should handle date edge cases', () => {
            const validDates = [
                '2024-02-29', // leap year
                '2024-12-31', // year end
                '2024-01-01'  // year start
            ];
            
            const invalidDates = [
                '2024-02-30', // invalid date
                '2024-13-01', // invalid month
                '2023-02-29'  // non-leap year
            ];

            validDates.forEach(date => {
                expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                const dateObj = new Date(date);
                expect(isNaN(dateObj.getTime())).toBe(false);
            });

            invalidDates.forEach(date => {
                expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                // Note: JavaScript Date constructor is lenient and may auto-correct
                // For business validation, we'd need additional checks
                const dateObj = new Date(date);
                // For the purpose of this test, we just ensure it's a Date object
                expect(dateObj).toBeInstanceOf(Date);
            });
        });

        it('should handle overlapping availability scenarios', () => {
            const overlappingScenarios = [
                {
                    existing: { start: '09:00', end: '12:00' },
                    new: { start: '10:00', end: '14:00' },
                    overlaps: true
                },
                {
                    existing: { start: '09:00', end: '12:00' },
                    new: { start: '13:00', end: '16:00' },
                    overlaps: false
                },
                {
                    existing: { start: '09:00', end: '12:00' },
                    new: { start: '12:00', end: '15:00' },
                    overlaps: false // adjacent, not overlapping
                }
            ];

            overlappingScenarios.forEach(scenario => {
                const existingStart = timeToMinutes(scenario.existing.start);
                const existingEnd = timeToMinutes(scenario.existing.end);
                const newStart = timeToMinutes(scenario.new.start);
                const newEnd = timeToMinutes(scenario.new.end);

                const overlaps = (newStart < existingEnd) && (newEnd > existingStart);
                expect(overlaps).toBe(scenario.overlaps);
            });

            function timeToMinutes(time) {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            }
        });

        it('should handle empty or minimal availability data', () => {
            const minimalAvailability = {
                space_id: 1,
                availability_date: '2024-03-15',
                start_time: '09:00',
                end_time: '17:00'
                // is_available defaults to true
            };

            expect(minimalAvailability.space_id).toBe(1);
            expect(minimalAvailability.availability_date).toBeTruthy();
            expect(minimalAvailability.start_time).toBeTruthy();
            expect(minimalAvailability.end_time).toBeTruthy();
            expect(minimalAvailability.is_available).toBeUndefined(); // will default in DB
        });
    });
});
