// tests/unit/models/Location.simple.test.js
const Location = require('../../../src/backend/models/Location');

describe('Location Model - Basic Tests', () => {
    const mockLocation = {
        location_id: 1,
        location_name: 'Sede Centrale',
        address: 'Via Roma 123',
        city: 'Milano',
        description: 'Sede principale del coworking',
        manager_id: 1
    };

    describe('constructor', () => {
        it('should create location instance with correct properties', () => {
            const location = new Location(mockLocation);

            expect(location.location_id).toBe(mockLocation.location_id);
            expect(location.location_name).toBe(mockLocation.location_name);
            expect(location.address).toBe(mockLocation.address);
            expect(location.city).toBe(mockLocation.city);
            expect(location.description).toBe(mockLocation.description);
            expect(location.manager_id).toBe(mockLocation.manager_id);
        });

        it('should handle missing optional fields', () => {
            const minimalData = {
                location_id: 1,
                location_name: 'Sede Test',
                address: 'Via Test 1',
                city: 'Roma'
            };

            const location = new Location(minimalData);

            expect(location.location_id).toBe(minimalData.location_id);
            expect(location.location_name).toBe(minimalData.location_name);
            expect(location.address).toBe(minimalData.address);
            expect(location.city).toBe(minimalData.city);
            expect(location.description).toBeUndefined();
            expect(location.manager_id).toBeUndefined();
        });

        it('should handle complete location with manager data', () => {
            const locationWithManager = {
                ...mockLocation,
                manager_name: 'Mario',
                manager_surname: 'Rossi',
                manager_email: 'mario@example.com'
            };

            const location = new Location(locationWithManager);

            expect(location.location_id).toBe(locationWithManager.location_id);
            expect(location.location_name).toBe(locationWithManager.location_name);
            expect(location.manager_id).toBe(locationWithManager.manager_id);
            // I campi manager_* vengono gestiti separatamente nei metodi statici
        });
    });

    describe('validateLocationData', () => {
        it('should validate correct location data', () => {
            const validData = {
                location_name: 'Sede Test',
                address: 'Via Test 123',
                city: 'Milano',
                description: 'Descrizione test',
                manager_id: 1
            };

            expect(() => {
                Location.validateLocationData(validData);
            }).not.toThrow();
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                // missing location_name
                address: 'Via Test 123',
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Nome location deve essere di almeno 2 caratteri');
        });

        it('should throw error for empty required fields', () => {
            const invalidData = {
                location_name: '',
                address: 'Via Test 123',
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Nome location deve essere di almeno 2 caratteri');
        });

        it('should throw error for missing address', () => {
            const invalidData = {
                location_name: 'Sede Test',
                // missing address
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Indirizzo deve essere di almeno 5 caratteri');
        });

        it('should throw error for missing city', () => {
            const invalidData = {
                location_name: 'Sede Test',
                address: 'Via Test 123'
                // missing city
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Città deve essere di almeno 2 caratteri');
        });

        it('should throw error for too long fields', () => {
            const invalidData = {
                location_name: 'A'.repeat(256), // troppo lungo (> 255)
                address: 'Via Test 123',
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Nome location troppo lungo (max 255 caratteri)');
        });

        it('should throw error for too long address', () => {
            const invalidData = {
                location_name: 'Sede Test',
                address: 'A'.repeat(256), // troppo lungo (> 255)
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Indirizzo troppo lungo (max 255 caratteri)');
        });

        it('should throw error for too long city', () => {
            const invalidData = {
                location_name: 'Sede Test',
                address: 'Via Test 123',
                city: 'A'.repeat(101) // troppo lungo (> 100)
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Nome città troppo lungo (max 100 caratteri)');
        });

        it('should throw error for too long description', () => {
            const invalidData = {
                location_name: 'Sede Test',
                address: 'Via Test 123',
                city: 'Milano',
                description: 'A'.repeat(1001) // troppo lungo (> 1000)
            };

            expect(() => {
                Location.validateLocationData(invalidData);
            }).toThrow('Descrizione troppo lunga (max 1000 caratteri)');
        });

        it('should validate update data correctly', () => {
            const updateData = {
                location_name: 'Nome Aggiornato'
            };

            expect(() => {
                Location.validateLocationData(updateData, true);
            }).not.toThrow();
        });

        it('should allow partial updates', () => {
            const updateData = {
                description: 'Nuova descrizione'
            };

            expect(() => {
                Location.validateLocationData(updateData, true);
            }).not.toThrow();
        });

        it('should validate manager_id if provided', () => {
            const dataWithManager = {
                location_name: 'Sede Test',
                address: 'Via Test 123',
                city: 'Milano',
                manager_id: 'invalid' // dovrebbe essere un numero
            };

            expect(() => {
                Location.validateLocationData(dataWithManager);
            }).toThrow('ID manager non valido');
        });

        it('should accept valid manager_id', () => {
            const dataWithManager = {
                location_name: 'Sede Test',
                address: 'Via Test 123',
                city: 'Milano',
                manager_id: 123
            };

            expect(() => {
                Location.validateLocationData(dataWithManager);
            }).not.toThrow();
        });
    });

    describe('data structure', () => {
        it('should maintain consistent property naming', () => {
            const location = new Location(mockLocation);

            // Verifica che i nomi delle proprietà siano consistenti
            expect(location.hasOwnProperty('location_id')).toBe(true);
            expect(location.hasOwnProperty('location_name')).toBe(true);
            expect(location.hasOwnProperty('address')).toBe(true);
            expect(location.hasOwnProperty('city')).toBe(true);
            expect(location.hasOwnProperty('description')).toBe(true);
            expect(location.hasOwnProperty('manager_id')).toBe(true);

            // Non dovrebbe avere alias
            expect(location.hasOwnProperty('id')).toBe(false);
            expect(location.hasOwnProperty('name')).toBe(false);
        });

        it('should handle null values correctly', () => {
            const locationWithNulls = {
                location_id: 1,
                location_name: 'Sede Test',
                address: 'Via Test 1',
                city: 'Roma',
                description: null,
                manager_id: null
            };

            const location = new Location(locationWithNulls);

            expect(location.description).toBeNull();
            expect(location.manager_id).toBeNull();
        });
    });

    describe('validation edge cases', () => {
        it('should handle whitespace-only strings as empty', () => {
            const dataWithWhitespace = {
                location_name: '   ',
                address: 'Via Test 123',
                city: 'Milano'
            };

            expect(() => {
                Location.validateLocationData(dataWithWhitespace);
            }).toThrow('Nome location deve essere di almeno 2 caratteri');
        });

        it('should trim and validate data correctly', () => {
            const dataWithSpaces = {
                location_name: '  Sede Test  ',
                address: '  Via Test 123  ',
                city: '  Milano  '
            };

            // La validazione dovrebbe funzionare anche con spazi
            expect(() => {
                Location.validateLocationData(dataWithSpaces);
            }).not.toThrow();
        });

        it('should handle special characters in names', () => {
            const dataWithSpecialChars = {
                location_name: 'Sede Cà d\'Oro - Milano',
                address: 'Via dell\'Università 123/A',
                city: 'Sant\'Antonio Abate'
            };

            expect(() => {
                Location.validateLocationData(dataWithSpecialChars);
            }).not.toThrow();
        });
    });
});
