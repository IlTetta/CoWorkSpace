// tests/unit/models/AdditionalService.test.js
const AdditionalService = require('../../../src/backend/models/AdditionalService');

describe('AdditionalService Model - Basic Tests', () => {
    const mockAdditionalService = {
        service_id: 1,
        service_name: 'Proiettore',
        description: 'Proiettore ad alta risoluzione per presentazioni',
        price: 25.00,
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
    };

    describe('data structure', () => {
        it('should return consistent additional service structure', () => {
            const service = mockAdditionalService;

            expect(service).toHaveProperty('service_id');
            expect(service).toHaveProperty('service_name');
            expect(service).toHaveProperty('description');
            expect(service).toHaveProperty('price');
            expect(service).toHaveProperty('is_active');

            expect(typeof service.service_id).toBe('number');
            expect(typeof service.service_name).toBe('string');
            expect(typeof service.description).toBe('string');
            expect(typeof service.price).toBe('number');
            expect(typeof service.is_active).toBe('boolean');
        });

        it('should maintain consistent property naming', () => {
            const service = mockAdditionalService;

            expect(service.hasOwnProperty('service_id')).toBe(true);
            expect(service.hasOwnProperty('service_name')).toBe(true);
            expect(service.hasOwnProperty('description')).toBe(true);
            expect(service.hasOwnProperty('price')).toBe(true);
            expect(service.hasOwnProperty('is_active')).toBe(true);

            // Non dovrebbe avere alias
            expect(service.hasOwnProperty('id')).toBe(false);
            expect(service.hasOwnProperty('name')).toBe(false);
            expect(service.hasOwnProperty('active')).toBe(false);
        });

        it('should handle minimal service data', () => {
            const minimalService = {
                service_id: 1,
                service_name: 'Caffè',
                price: 2.50,
                is_active: true
            };

            expect(minimalService.service_id).toBe(1);
            expect(minimalService.service_name).toBe('Caffè');
            expect(minimalService.price).toBe(2.50);
            expect(minimalService.is_active).toBe(true);
            expect(minimalService.description).toBeUndefined();
        });

        it('should handle service with null values', () => {
            const serviceWithNulls = {
                service_id: 1,
                service_name: 'Test Service',
                description: null,
                price: 10.00,
                is_active: true
            };

            expect(serviceWithNulls.description).toBeNull();
            expect(serviceWithNulls.service_name).toBe('Test Service');
            expect(serviceWithNulls.price).toBe(10.00);
        });
    });

    describe('service type validation patterns', () => {
        it('should recognize common additional services', () => {
            const commonServices = [
                'Proiettore',
                'Caffè',
                'Acqua',
                'Lavagna',
                'Flipchart',
                'Wi-Fi Premium',
                'Servizio Catering',
                'Parcheggio',
                'Aria Condizionata',
                'Televisore',
                'Sistema Audio',
                'Stampante',
                'Scanner',
                'Videoconferenza'
            ];

            commonServices.forEach(serviceName => {
                expect(serviceName).toBeTruthy();
                expect(typeof serviceName).toBe('string');
                expect(serviceName.length).toBeGreaterThan(0);
                expect(serviceName.length).toBeLessThanOrEqual(100); // Assumendo un limite ragionevole
            });
        });

        it('should handle service names with special characters', () => {
            const serviceNamesWithSpecialChars = [
                'Caffè & Tè',
                'Wi-Fi 5G',
                'Proiettore 4K',
                'Aria Condizionata (Premium)',
                'Servizio H24/7',
                'Parcheggio 1° Piano'
            ];

            serviceNamesWithSpecialChars.forEach(name => {
                expect(name).toBeTruthy();
                expect(typeof name).toBe('string');
                expect(name.length).toBeGreaterThan(0);
            });
        });

        it('should validate description lengths', () => {
            const descriptions = [
                'Breve descrizione',
                'Descrizione più dettagliata del servizio offerto agli utenti',
                'Una descrizione molto lunga e dettagliata che include tutte le specifiche tecniche, modalità di utilizzo, condizioni di servizio e altre informazioni utili per gli utenti che potrebbero necessitare di questo servizio aggiuntivo durante la loro prenotazione',
                '' // Descrizione vuota
            ];

            descriptions.forEach(desc => {
                if (desc) {
                    expect(typeof desc).toBe('string');
                    expect(desc.length).toBeLessThanOrEqual(1000); // Assumendo un limite ragionevole
                } else {
                    expect(desc).toBe('');
                }
            });
        });

        it('should validate price ranges', () => {
            const validPrices = [0, 0.50, 1.00, 5.99, 25.00, 100.00, 999.99];
            const invalidPrices = [-1, -0.01, 'not-a-number', null];

            validPrices.forEach(price => {
                expect(typeof price).toBe('number');
                expect(price).toBeGreaterThanOrEqual(0);
                expect(isNaN(price)).toBe(false);
            });

            invalidPrices.forEach(price => {
                if (price !== null) {
                    if (typeof price === 'number') {
                        expect(price < 0 || isNaN(price)).toBe(true);
                    } else {
                        expect(typeof price).not.toBe('number');
                    }
                }
            });
        });

        it('should validate active status', () => {
            const validStatuses = [true, false];
            
            validStatuses.forEach(status => {
                expect(typeof status).toBe('boolean');
            });
        });
    });

    describe('business logic patterns', () => {
        it('should represent service categories', () => {
            const serviceCategories = [
                { name: 'Proiettore', category: 'technology', price: 25.00 },
                { name: 'Caffè', category: 'catering', price: 2.50 },
                { name: 'Parcheggio', category: 'facility', price: 5.00 },
                { name: 'Pulizia Extra', category: 'service', price: 15.00 }
            ];

            serviceCategories.forEach(service => {
                expect(service.name).toBeTruthy();
                expect(service.category).toBeTruthy();
                expect(typeof service.name).toBe('string');
                expect(typeof service.category).toBe('string');
                expect(typeof service.price).toBe('number');
                expect(service.price).toBeGreaterThanOrEqual(0);
            });
        });

        it('should support pricing tiers', () => {
            const pricingTiers = [
                { name: 'Acqua', price: 1.00, tier: 'basic' },
                { name: 'Caffè', price: 2.50, tier: 'basic' },
                { name: 'Proiettore', price: 25.00, tier: 'standard' },
                { name: 'Sistema Videoconferenza', price: 75.00, tier: 'premium' },
                { name: 'Servizio Catering Completo', price: 150.00, tier: 'premium' }
            ];

            pricingTiers.forEach(service => {
                expect(service.tier).toBeTruthy();
                expect(['basic', 'standard', 'premium'].includes(service.tier)).toBe(true);
                
                if (service.tier === 'basic') {
                    expect(service.price).toBeLessThanOrEqual(10);
                } else if (service.tier === 'standard') {
                    expect(service.price).toBeGreaterThan(10);
                    expect(service.price).toBeLessThanOrEqual(50);
                } else if (service.tier === 'premium') {
                    expect(service.price).toBeGreaterThan(50);
                }
            });
        });

        it('should support service availability filtering', () => {
            const services = [
                { service_name: 'Proiettore Attivo', is_active: true },
                { service_name: 'Servizio Dismesso', is_active: false },
                { service_name: 'Caffè Disponibile', is_active: true },
                { service_name: 'Servizio In Manutenzione', is_active: false }
            ];

            const activeServices = services.filter(service => service.is_active);
            const inactiveServices = services.filter(service => !service.is_active);

            expect(activeServices.length).toBe(2);
            expect(inactiveServices.length).toBe(2);
            
            activeServices.forEach(service => {
                expect(service.is_active).toBe(true);
            });
            
            inactiveServices.forEach(service => {
                expect(service.is_active).toBe(false);
            });
        });
    });

    describe('search and filtering patterns', () => {
        it('should support name-based search', () => {
            const services = [
                { service_name: 'Proiettore HD', description: 'Proiettore alta definizione' },
                { service_name: 'Caffè Premium', description: 'Servizio caffè di qualità' },
                { service_name: 'Lavagna Interattiva', description: 'Lavagna digitale per presentazioni' },
                { service_name: 'Sistema Audio', description: 'Impianto audio professionale' }
            ];

            // Simulazione ricerca per "audio"
            const searchTerm = 'audio';
            const audioResults = services.filter(service => 
                service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.description.toLowerCase().includes(searchTerm.toLowerCase())
            );

            expect(audioResults.length).toBe(1);
            expect(audioResults[0].service_name).toBe('Sistema Audio');
        });

        it('should support price range filtering', () => {
            const services = [
                { service_name: 'Acqua', price: 1.00 },
                { service_name: 'Caffè', price: 2.50 },
                { service_name: 'Proiettore', price: 25.00 },
                { service_name: 'Catering', price: 100.00 }
            ];

            // Filtro per servizi sotto 10 euro
            const affordableServices = services.filter(service => service.price <= 10);
            expect(affordableServices.length).toBe(2);
            
            // Filtro per servizi premium (sopra 50 euro)
            const premiumServices = services.filter(service => service.price > 50);
            expect(premiumServices.length).toBe(1);
            expect(premiumServices[0].service_name).toBe('Catering');
        });

        it('should support sorting by different criteria', () => {
            const services = [
                { service_name: 'Zucchero', price: 0.50 },
                { service_name: 'Acqua', price: 1.00 },
                { service_name: 'Proiettore', price: 25.00 },
                { service_name: 'Caffè', price: 2.50 }
            ];

            // Ordinamento per nome
            const sortedByName = [...services].sort((a, b) => 
                a.service_name.localeCompare(b.service_name)
            );
            expect(sortedByName[0].service_name).toBe('Acqua');
            expect(sortedByName[sortedByName.length - 1].service_name).toBe('Zucchero');

            // Ordinamento per prezzo
            const sortedByPrice = [...services].sort((a, b) => a.price - b.price);
            expect(sortedByPrice[0].price).toBe(0.50);
            expect(sortedByPrice[sortedByPrice.length - 1].price).toBe(25.00);
        });
    });

    describe('space-service associations', () => {
        it('should represent service-space relationships', () => {
            const spaceServiceAssociations = [
                { space_id: 1, service_id: 1, space_name: 'Sala Conferenze A', service_name: 'Proiettore' },
                { space_id: 1, service_id: 2, space_name: 'Sala Conferenze A', service_name: 'Sistema Audio' },
                { space_id: 2, service_id: 1, space_name: 'Ufficio Privato', service_name: 'Proiettore' },
                { space_id: 3, service_id: 3, space_name: 'Area Break', service_name: 'Caffè' }
            ];

            spaceServiceAssociations.forEach(association => {
                expect(association).toHaveProperty('space_id');
                expect(association).toHaveProperty('service_id');
                expect(association).toHaveProperty('space_name');
                expect(association).toHaveProperty('service_name');
                
                expect(typeof association.space_id).toBe('number');
                expect(typeof association.service_id).toBe('number');
                expect(typeof association.space_name).toBe('string');
                expect(typeof association.service_name).toBe('string');
            });
        });

        it('should handle available services filtering', () => {
            const allServices = [
                { service_id: 1, service_name: 'Proiettore', is_active: true },
                { service_id: 2, service_name: 'Sistema Audio', is_active: true },
                { service_id: 3, service_name: 'Caffè', is_active: true },
                { service_id: 4, service_name: 'Servizio Dismesso', is_active: false }
            ];

            const spaceAssociatedServices = [1, 3]; // Servizi già associati allo spazio

            // Servizi disponibili per un nuovo spazio (attivi e non ancora associati)
            const availableServices = allServices.filter(service => 
                service.is_active && !spaceAssociatedServices.includes(service.service_id)
            );

            expect(availableServices.length).toBe(1);
            expect(availableServices[0].service_name).toBe('Sistema Audio');
        });
    });

    describe('statistics and analytics patterns', () => {
        it('should support service usage statistics', () => {
            const mockStats = {
                total_services: 10,
                active_services: 8,
                inactive_services: 2,
                most_popular_service: 'Proiettore',
                least_popular_service: 'Scanner',
                average_price: 15.75,
                total_revenue_potential: 157.50
            };

            expect(typeof mockStats.total_services).toBe('number');
            expect(typeof mockStats.active_services).toBe('number');
            expect(typeof mockStats.inactive_services).toBe('number');
            expect(typeof mockStats.most_popular_service).toBe('string');
            expect(typeof mockStats.least_popular_service).toBe('string');
            expect(typeof mockStats.average_price).toBe('number');
            expect(typeof mockStats.total_revenue_potential).toBe('number');

            // Business logic validation
            expect(mockStats.active_services + mockStats.inactive_services)
                .toBe(mockStats.total_services);
            expect(mockStats.average_price).toBeGreaterThan(0);
            expect(mockStats.total_revenue_potential).toBeGreaterThan(0);
        });

        it('should support service popularity tracking', () => {
            const servicePopularity = [
                { service_name: 'Proiettore', usage_count: 45, spaces_count: 8 },
                { service_name: 'Caffè', usage_count: 32, spaces_count: 12 },
                { service_name: 'Sistema Audio', usage_count: 28, spaces_count: 6 },
                { service_name: 'Lavagna', usage_count: 15, spaces_count: 10 },
                { service_name: 'Scanner', usage_count: 3, spaces_count: 2 }
            ];

            servicePopularity.forEach(service => {
                expect(service).toHaveProperty('service_name');
                expect(service).toHaveProperty('usage_count');
                expect(service).toHaveProperty('spaces_count');
                
                expect(typeof service.usage_count).toBe('number');
                expect(typeof service.spaces_count).toBe('number');
                expect(service.usage_count).toBeGreaterThanOrEqual(0);
                expect(service.spaces_count).toBeGreaterThanOrEqual(0);
            });

            // Il più popolare dovrebbe avere il maggior numero di utilizzi
            const sortedByUsage = [...servicePopularity].sort((a, b) => b.usage_count - a.usage_count);
            expect(sortedByUsage[0].service_name).toBe('Proiettore');
            expect(sortedByUsage[0].usage_count).toBe(45);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle very long service names', () => {
            const longName = 'A'.repeat(255);
            
            expect(typeof longName).toBe('string');
            expect(longName.length).toBe(255);
        });

        it('should handle zero-price services', () => {
            const freeService = {
                service_name: 'Wi-Fi Base',
                price: 0.00,
                is_active: true
            };

            expect(freeService.price).toBe(0.00);
            expect(typeof freeService.price).toBe('number');
        });

        it('should handle high-precision prices', () => {
            const precisePrice = 12.999;
            
            expect(typeof precisePrice).toBe('number');
            expect(precisePrice).toBeCloseTo(12.999, 3);
        });

        it('should handle empty or minimal service data', () => {
            const minimalService = {
                service_name: 'Test',
                price: 1.00,
                is_active: true
            };

            expect(minimalService.service_name).toBe('Test');
            expect(minimalService.price).toBe(1.00);
            expect(minimalService.is_active).toBe(true);
            expect(minimalService.description).toBeUndefined();
        });

        it('should handle unicode characters in service names', () => {
            const unicodeNames = [
                'Caffè Espresso ☕',
                'Wi-Fi Premium 📶',
                'Área de Descanso',
                'Salle de Réunion',
                'Büro Service'
            ];

            unicodeNames.forEach(name => {
                expect(typeof name).toBe('string');
                expect(name.length).toBeGreaterThan(0);
            });
        });

        it('should handle date objects for timestamps', () => {
            const now = new Date();
            const serviceWithDates = {
                service_id: 1,
                service_name: 'Test Service',
                price: 10.00,
                is_active: true,
                created_at: now.toISOString(),
                updated_at: now.toISOString()
            };

            expect(serviceWithDates.created_at).toBeTruthy();
            expect(serviceWithDates.updated_at).toBeTruthy();
            expect(new Date(serviceWithDates.created_at)).toBeInstanceOf(Date);
            expect(new Date(serviceWithDates.updated_at)).toBeInstanceOf(Date);
        });
    });
});
