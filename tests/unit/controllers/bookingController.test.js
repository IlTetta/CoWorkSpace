// tests/controllers/bookingController.test.js
const pool = require('../../src/backend/config/db');

// Setup mock per il pool di connessioni
jest.mock('../../src/backend/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn()
}));

// Mock catchAsync
jest.mock('../../src/backend/utils/catchAsync', () => {
    return jest.fn((fn) => {
        return async (req, res, next) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                next(error);
            }
        };
    });
});

// Mock AppError come classe
jest.mock('../../src/backend/utils/AppError', () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.message = message;
        return error;
    });
});

// Mock bookingCalculator
jest.mock('../../src/backend/utils/bookingCalculator', () => ({
    calculateBookingPrice: jest.fn()
}));

const AppError = require('../../src/backend/utils/AppError');
const bookingController = require('../../src/backend/controllers/bookingController');
const { calculateBookingPrice } = require('../../src/backend/utils/bookingCalculator');

// Mock sendEmailNotification globalmente per evitare errori
global.sendEmailNotification = jest.fn().mockResolvedValue(true);

describe('bookingController.createBooking', () => {
    let req, res, next, mockClient;

    beforeEach(() => {
        req = {
            body: {
                space_id: 1,
                booking_date: '2024-08-15',
                start_time: '09:00',
                end_time: '17:00'
            },
            user: {
                id: 123,
                email: 'user@example.com',
                name: 'Test User'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();

        // Mock client per transazioni
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.connect.mockResolvedValue(mockClient);

        jest.clearAllMocks();
    });

    describe('Creazione prenotazione con successo', () => {
        it('dovrebbe creare una nuova prenotazione', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const newBooking = {
                booking_id: 1,
                user_id: 123,
                space_id: 1,
                booking_date: '2024-08-15',
                start_time: '09:00',
                end_time: '17:00',
                total_hours: 8,
                total_price: 180,
                status: 'pending'
            };

            // Mock per verifica spazio esistente
            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            // Mock per calculateBookingPrice
            calculateBookingPrice.mockReturnValue(180);
            // Mock per controllo disponibilità
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Mock per controllo conflitti
            pool.query.mockResolvedValueOnce({ rows: [] });
            // Mock per transazione
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newBooking] }); // INSERT
            mockClient.query.mockResolvedValueOnce({}); // COMMIT

            await bookingController.createBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT price_per_hour, price_per_day FROM spaces WHERE id = $1',
                [1]
            );
            expect(calculateBookingPrice).toHaveBeenCalledWith(8, 25, 180);
            expect(mockClient.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO bookings'),
                [123, 1, '2024-08-15', '09:00', '17:00', 8, 180]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Prenotazione creata con successo (in attesa di pagamento/conferma).',
                data: {
                    booking: newBooking
                }
            });
        });

        it('dovrebbe gestire prenotazioni con orari diversi', async () => {
            const spaceData = { price_per_hour: 30, price_per_day: 200 };
            const newBooking = { booking_id: 2, total_hours: 4, total_price: 120 };

            req.body = {
                space_id: 2,
                booking_date: '2024-08-16',
                start_time: '14:00',
                end_time: '18:00'
            };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(120);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // disponibilità
            pool.query.mockResolvedValueOnce({ rows: [] }); // conflitti
            mockClient.query.mockResolvedValueOnce({});
            mockClient.query.mockResolvedValueOnce({ rows: [newBooking] });
            mockClient.query.mockResolvedValueOnce({});

            await bookingController.createBooking(req, res, next);

            expect(calculateBookingPrice).toHaveBeenCalledWith(4, 30, 200);
        });

        it('dovrebbe gestire orari che attraversano la mezzanotte', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const newBooking = { booking_id: 3, total_hours: 8, total_price: 200 };

            req.body.start_time = '22:00';
            req.body.end_time = '06:00'; // giorno dopo

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(200);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({});
            mockClient.query.mockResolvedValueOnce({ rows: [newBooking] });
            mockClient.query.mockResolvedValueOnce({});

            await bookingController.createBooking(req, res, next);

            expect(calculateBookingPrice).toHaveBeenCalledWith(8, 25, 180);
        });
    });

    describe('Validazione input', () => {
        it('dovrebbe restituire errore 400 se manca space_id', async () => {
            req.body.space_id = undefined;

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
            });
        });

        it('dovrebbe restituire errore 400 se manca booking_date', async () => {
            req.body.booking_date = undefined;

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca start_time', async () => {
            req.body.start_time = undefined;

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca end_time', async () => {
            req.body.end_time = undefined;

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire valori null', async () => {
            req.body.space_id = null;
            req.body.booking_date = null;

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Verifica spazio esistente', () => {
        it('dovrebbe restituire errore 404 se spazio non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // spazio non trovato

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Spazio non trovato.'
            });
        });

        it('dovrebbe verificare space_id diversi', async () => {
            req.body.space_id = 999;
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.createBooking(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT price_per_hour, price_per_day FROM spaces WHERE id = $1',
                [999]
            );
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Controllo disponibilità', () => {
        it('dovrebbe restituire errore 409 se spazio non disponibile', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] }); // spazio esistente
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [] }); // disponibilità non trovata

            await bookingController.createBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('SELECT * FROM availability'),
                [1, '2024-08-15', '17:00', '09:00']
            );
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Lo spazio non è disponibile l\'orario richiesto.'
            });
        });

        it('dovrebbe verificare disponibilità con parametri corretti', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };

            req.body = {
                space_id: 5,
                booking_date: '2024-09-01',
                start_time: '10:30',
                end_time: '15:30'
            };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(125);
            pool.query.mockResolvedValueOnce({ rows: [] }); // non disponibile

            await bookingController.createBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('WHERE space_id = $1'),
                [5, '2024-09-01', '15:30', '10:30']
            );
        });
    });

    describe('Controllo conflitti prenotazioni', () => {
        it('dovrebbe restituire errore 409 se esiste conflitto', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const conflictingBooking = { booking_id: 999, status: 'confirmed' };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // disponibile
            pool.query.mockResolvedValueOnce({ rows: [conflictingBooking] }); // conflitto

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Esiste già una prenotazione confermata o in sospeso per questo spazio e orario.'
            });
        });

        it('dovrebbe verificare conflitti con query corretta', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [{ booking_id: 1 }] });

            await bookingController.createBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(3,
                expect.stringContaining('SELECT * FROM bookings'),
                [1, '2024-08-15', '17:00', '09:00']
            );
        });

        it('dovrebbe permettere prenotazione se nessun conflitto', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const newBooking = { booking_id: 1, status: 'pending' };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] }); // nessun conflitto
            mockClient.query.mockResolvedValueOnce({});
            mockClient.query.mockResolvedValueOnce({ rows: [newBooking] });
            mockClient.query.mockResolvedValueOnce({});

            await bookingController.createBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Gestione transazioni', () => {
        it('dovrebbe fare rollback in caso di errore', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const dbError = new Error('Database insert failed');

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockRejectedValueOnce(dbError); // INSERT fallisce

            await bookingController.createBooking(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).toHaveBeenCalledWith(dbError);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('dovrebbe rilasciare sempre il client', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockRejectedValueOnce(new Error('Transaction error'));

            await bookingController.createBooking(req, res, next);

            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante verifica spazio', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.createBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante controllo disponibilità', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };
            const dbError = new Error('Availability check failed');

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(180);
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.createBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('Calcolo ore e prezzo', () => {
        it('dovrebbe calcolare correttamente le ore per orario normale', async () => {
            const spaceData = { price_per_hour: 20, price_per_day: 150 };

            req.body.start_time = '10:00';
            req.body.end_time = '13:30';

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(70);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({});
            mockClient.query.mockResolvedValueOnce({ rows: [{ booking_id: 1 }] });
            mockClient.query.mockResolvedValueOnce({});

            await bookingController.createBooking(req, res, next);

            expect(calculateBookingPrice).toHaveBeenCalledWith(3.5, 20, 150);
        });

        it('dovrebbe calcolare correttamente le ore per orario attraverso mezzanotte', async () => {
            const spaceData = { price_per_hour: 25, price_per_day: 180 };

            req.body.start_time = '23:00';
            req.body.end_time = '03:00';

            pool.query.mockResolvedValueOnce({ rows: [spaceData] });
            calculateBookingPrice.mockReturnValue(100);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({});
            mockClient.query.mockResolvedValueOnce({ rows: [{ booking_id: 1 }] });
            mockClient.query.mockResolvedValueOnce({});

            await bookingController.createBooking(req, res, next);

            expect(calculateBookingPrice).toHaveBeenCalledWith(4, 25, 180);
        });
    });
});

describe('bookingController.getAllBookings', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                id: 123,
                role: 'user'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Autorizzazione ruolo user', () => {
        it('dovrebbe restituire solo le prenotazioni dell\'utente', async () => {
            const userBookings = [
                { booking_id: 1, user_id: 123, space_name: 'Sala A', location_name: 'Sede Roma' },
                { booking_id: 2, user_id: 123, space_name: 'Sala B', location_name: 'Sede Milano' }
            ];

            pool.query.mockResolvedValueOnce({ rows: userBookings });

            await bookingController.getAllBookings(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.user_id = $1'),
                [123]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    bookings: userBookings
                }
            });
        });

        it('dovrebbe gestire risultati vuoti per utente', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getAllBookings(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    bookings: []
                }
            });
        });
    });

    describe('Autorizzazione ruolo manager', () => {
        it('dovrebbe restituire prenotazioni delle sedi gestite', async () => {
            const managerBookings = [
                { booking_id: 3, user_name: 'Mario', user_surname: 'Rossi', space_name: 'Sala C' },
                { booking_id: 4, user_name: 'Luigi', user_surname: 'Verdi', space_name: 'Sala D' }
            ];

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: managerBookings });

            await bookingController.getAllBookings(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE l.manager_id = $1'),
                [123]
            );
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    bookings: managerBookings
                }
            });
        });

        it('dovrebbe includere dati utente per manager', async () => {
            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getAllBookings(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('u.name as user_name, u.surname as user_surname'),
                [123]
            );
        });
    });

    describe('Autorizzazione ruolo admin', () => {
        it('dovrebbe restituire tutte le prenotazioni', async () => {
            const allBookings = [
                { booking_id: 5, user_name: 'Anna', space_name: 'Sala E' },
                { booking_id: 6, user_name: 'Paolo', space_name: 'Sala F' },
                { booking_id: 7, user_name: 'Giulia', space_name: 'Sala G' }
            ];

            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: allBookings });

            await bookingController.getAllBookings(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM bookings b'),
                []
            );
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 3,
                data: {
                    bookings: allBookings
                }
            });
        });

        it('dovrebbe non avere parametri nella query per admin', async () => {
            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getAllBookings(req, res, next);

            const [query, params] = pool.query.mock.calls[0];
            expect(params).toEqual([]);
        });
    });

    describe('Ruoli non autorizzati', () => {
        it('dovrebbe restituire errore 403 per ruolo sconosciuto', async () => {
            req.user.role = 'unknown';

            await bookingController.getAllBookings(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare le prenotazioni.'
            });
        });

        it('dovrebbe gestire ruolo undefined', async () => {
            req.user.role = undefined;

            await bookingController.getAllBookings(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('dovrebbe gestire ruolo null', async () => {
            req.user.role = null;

            await bookingController.getAllBookings(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database query failed');
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.getAllBookings(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('Formato query e join', () => {
        it('dovrebbe includere tutti i join necessari per user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getAllBookings(req, res, next);

            const [query] = pool.query.mock.calls[0];
            expect(query).toContain('JOIN spaces s ON b.space_id = s.space_id');
            expect(query).toContain('JOIN locations l ON s.location_id = l.location_id');
            expect(query).toContain('ORDER BY b.created_at DESC');
        });

        it('dovrebbe includere join utenti per manager e admin', async () => {
            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getAllBookings(req, res, next);

            const [query] = pool.query.mock.calls[0];
            expect(query).toContain('JOIN users u ON b.user_id = u.user_id');
        });
    });
});

describe('bookingController.getBookingById', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            user: {
                id: 123,
                role: 'user'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero prenotazione con successo', () => {
        it('dovrebbe restituire prenotazione per il proprietario', async () => {
            const booking = {
                booking_id: 1,
                user_id: 123,
                space_name: 'Sala A',
                location_name: 'Sede Roma',
                user_name: 'Mario',
                user_surname: 'Rossi'
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.booking_id = $1'),
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    booking
                }
            });
        });

        it('dovrebbe restituire prenotazione per admin', async () => {
            const booking = {
                booking_id: 1,
                user_id: 456, // diverso dall'utente corrente
                space_name: 'Sala B'
            };

            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire ID diversi', async () => {
            const booking = { booking_id: 99, user_id: 123 };

            req.params.id = '99';
            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.booking_id = $1'),
                ['99']
            );
        });
    });

    describe('Autorizzazione manager', () => {
        it('dovrebbe permettere accesso se manager gestisce la sede', async () => {
            const booking = {
                booking_id: 1,
                user_id: 456, // diverso dall'utente corrente
                location_id: 10
            };

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [booking] }); // booking
            pool.query.mockResolvedValueOnce({ rows: [{ location_id: 10 }] }); // manager check

            await bookingController.getBookingById(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                'SELECT 1 FROM locations WHERE location_id = $1 AND manager_id = $2',
                [10, 123]
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe negare accesso se manager non gestisce la sede', async () => {
            const booking = {
                booking_id: 1,
                user_id: 456,
                location_id: 10
            };

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [] }); // manager non autorizzato

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare questa prenotazione.'
            });
        });
    });

    describe('Prenotazione non trovata', () => {
        it('dovrebbe restituire errore 404 se prenotazione non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Prenotazione non trovata.'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Controlli di autorizzazione', () => {
        it('dovrebbe negare accesso a utente non proprietario', async () => {
            const booking = {
                booking_id: 1,
                user_id: 456 // diverso dall'utente corrente (123)
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare questa prenotazione.'
            });
        });

        it('dovrebbe permettere accesso al proprietario', async () => {
            const booking = {
                booking_id: 1,
                user_id: 123 // stesso utente corrente
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.getBookingById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante controllo manager', async () => {
            const booking = { booking_id: 1, user_id: 456, location_id: 10 };
            const dbError = new Error('Manager check failed');

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.getBookingById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('Formato query', () => {
        it('dovrebbe includere tutti i join necessari', async () => {
            const booking = { booking_id: 1, user_id: 123 };
            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.getBookingById(req, res, next);

            const [query] = pool.query.mock.calls[0];
            expect(query).toContain('JOIN spaces s ON b.space_id = s.space_id');
            expect(query).toContain('JOIN locations l ON s.location_id = l.location_id');
            expect(query).toContain('JOIN users u ON b.user_id = u.user_id');
        });
    });
});

describe('bookingController.updateBookingStatus', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            body: { status: 'confirmed' },
            user: {
                id: 123,
                role: 'manager'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento stato con successo', () => {
        it('dovrebbe aggiornare stato per manager autorizzato', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                location_id: 10,
                manager_id: 123
            };
            const updatedBooking = {
                booking_id: 1,
                status: 'confirmed'
            };

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] }); // booking check
            pool.query.mockResolvedValueOnce({ rows: [updatedBooking] }); // update

            await bookingController.updateBookingStatus(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *',
                ['confirmed', '1']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Stato prenotazione aggiornato.',
                data: {
                    booking: updatedBooking
                }
            });
        });

        it('dovrebbe aggiornare stato per admin', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                manager_id: 999 // manager diverso
            };
            const updatedBooking = { booking_id: 1, status: 'cancelled' };

            req.user.role = 'admin';
            req.body.status = 'cancelled';

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });
            pool.query.mockResolvedValueOnce({ rows: [updatedBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire tutti gli stati validi', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                manager_id: 123
            };
            const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed'];

            for (const status of validStatuses) {
                jest.clearAllMocks();
                req.body.status = status;
                const updatedBooking = { booking_id: 1, status };

                pool.query.mockResolvedValueOnce({ rows: [currentBooking] });
                pool.query.mockResolvedValueOnce({ rows: [updatedBooking] });

                await bookingController.updateBookingStatus(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
            }
        });
    });

    describe('Validazione input', () => {
        it('dovrebbe restituire errore 400 se manca status', async () => {
            req.body.status = undefined;

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Lo stato è obbligatorio.'
            });
        });

        it('dovrebbe restituire errore 400 per stato non valido', async () => {
            req.body.status = 'invalid_status';

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Stato non valido. Sono ammessi: confirmed, pending, cancelled, completed'
            });
        });

        it('dovrebbe gestire status null', async () => {
            req.body.status = null;

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire status stringa vuota', async () => {
            req.body.status = '';

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Prenotazione non trovata', () => {
        it('dovrebbe restituire errore 404 se prenotazione non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Prenotazione non trovata.'
            });
        });
    });

    describe('Controlli di autorizzazione', () => {
        it('dovrebbe negare accesso a manager non autorizzato', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                manager_id: 999 // manager diverso
            };

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a modificare lo stato di questa prenotazione (non sei il manager della sede).'
            });
        });

        it('dovrebbe negare accesso a utente normale', async () => {
            const currentBooking = {
                user_id: 123, // stesso utente
                current_status: 'pending',
                manager_id: 456
            };

            req.user.role = 'user';

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a modificare lo stato di questa prenotazione.'
            });
        });
    });

    describe('Validazione stati', () => {
        it('dovrebbe impedire modifica di prenotazione completata', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'completed',
                manager_id: 123
            };

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non è possibile cambiare lo stato di una prenotazione già completed.'
            });
        });

        it('dovrebbe impedire modifica di prenotazione cancellata', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'cancelled',
                manager_id: 123
            };

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non è possibile cambiare lo stato di una prenotazione già cancelled.'
            });
        });

        it('dovrebbe permettere modifica di prenotazione pending', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                manager_id: 123
            };
            const updatedBooking = { booking_id: 1, status: 'confirmed' };

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });
            pool.query.mockResolvedValueOnce({ rows: [updatedBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe permettere modifica di prenotazione confirmed', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'confirmed',
                manager_id: 123
            };
            const updatedBooking = { booking_id: 1, status: 'completed' };

            req.body.status = 'completed';

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });
            pool.query.mockResolvedValueOnce({ rows: [updatedBooking] });

            await bookingController.updateBookingStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante recupero prenotazione', async () => {
            const dbError = new Error('Database query failed');
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.updateBookingStatus(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante update', async () => {
            const currentBooking = {
                user_id: 456,
                current_status: 'pending',
                manager_id: 123
            };
            const updateError = new Error('Update failed');

            pool.query.mockResolvedValueOnce({ rows: [currentBooking] });
            pool.query.mockRejectedValueOnce(updateError);

            await bookingController.updateBookingStatus(req, res, next);

            expect(next).toHaveBeenCalledWith(updateError);
        });
    });
});

describe('bookingController.deleteBooking', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            user: {
                id: 123,
                role: 'user'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Eliminazione con successo', () => {
        it('dovrebbe eliminare prenotazione del proprietario', async () => {
            const booking = {
                user_id: 123,
                status: 'pending'
            };
            const deletedBooking = { booking_id: 1, user_id: 123 };

            pool.query.mockResolvedValueOnce({ rows: [booking] }); // booking check
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] }); // delete

            await bookingController.deleteBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                'DELETE FROM bookings WHERE booking_id = $1 RETURNING *',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        it('dovrebbe eliminare qualsiasi prenotazione per admin', async () => {
            const booking = {
                user_id: 456, // diverso dall'utente corrente
                status: 'confirmed' // anche se confermata
            };
            const deletedBooking = { booking_id: 1 };

            req.user.role = 'admin';

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('dovrebbe gestire ID diversi', async () => {
            const booking = { user_id: 123, status: 'pending' };
            const deletedBooking = { booking_id: 99 };

            req.params.id = '99';

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT user_id, status FROM bookings WHERE booking_id = $1',
                ['99']
            );
        });
    });

    describe('Prenotazione non trovata', () => {
        it('dovrebbe restituire errore 404 se prenotazione non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Prenotazione non trovata.'
            });
        });
    });

    describe('Controlli di autorizzazione', () => {
        it('dovrebbe negare eliminazione a utente non proprietario', async () => {
            const booking = {
                user_id: 456, // diverso dall'utente corrente
                status: 'pending'
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a eliminare questa prenotazione (non sei il proprietario).'
            });
        });

        it('dovrebbe permettere eliminazione al proprietario', async () => {
            const booking = {
                user_id: 123, // stesso utente corrente
                status: 'pending'
            };
            const deletedBooking = { booking_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Validazione stati per utenti normali', () => {
        it('dovrebbe impedire eliminazione prenotazione confermata', async () => {
            const booking = {
                user_id: 123,
                status: 'confirmed'
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non è possibile eliminare una prenotazione già confermata o completata. Contattare l\'assistenza.'
            });
        });

        it('dovrebbe impedire eliminazione prenotazione completata', async () => {
            const booking = {
                user_id: 123,
                status: 'completed'
            };

            pool.query.mockResolvedValueOnce({ rows: [booking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe permettere eliminazione prenotazione pending', async () => {
            const booking = {
                user_id: 123,
                status: 'pending'
            };
            const deletedBooking = { booking_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('dovrebbe permettere eliminazione prenotazione cancelled', async () => {
            const booking = {
                user_id: 123,
                status: 'cancelled'
            };
            const deletedBooking = { booking_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Admin può eliminare tutto', () => {
        it('dovrebbe permettere eliminazione di prenotazione confermata per admin', async () => {
            const booking = {
                user_id: 456,
                status: 'confirmed'
            };
            const deletedBooking = { booking_id: 1 };

            req.user.role = 'admin';

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('dovrebbe permettere eliminazione di prenotazione completata per admin', async () => {
            const booking = {
                user_id: 456,
                status: 'completed'
            };
            const deletedBooking = { booking_id: 1 };

            req.user.role = 'admin';

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante recupero prenotazione', async () => {
            const dbError = new Error('Database query failed');
            pool.query.mockRejectedValueOnce(dbError);

            await bookingController.deleteBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante eliminazione', async () => {
            const booking = { user_id: 123, status: 'pending' };
            const deleteError = new Error('Delete failed');

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockRejectedValueOnce(deleteError);

            await bookingController.deleteBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(deleteError);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere formato risposta corretto per eliminazione', async () => {
            const booking = { user_id: 123, status: 'pending' };
            const deletedBooking = { booking_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('data', null);
        });

        it('dovrebbe restituire status 204 per eliminazione riuscita', async () => {
            const booking = { user_id: 123, status: 'pending' };
            const deletedBooking = { booking_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [booking] });
            pool.query.mockResolvedValueOnce({ rows: [deletedBooking] });

            await bookingController.deleteBooking(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
});