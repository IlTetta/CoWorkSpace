// tests/controllers/paymentController.test.js
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

const AppError = require('../../src/backend/utils/AppError');
const paymentController = require('../../src/backend/controllers/paymentController');


describe('paymentController.createPayment', () => {
    let req, res, next, mockClient;

    beforeEach(() => {
        req = {
            body: {
                booking_id: 1,
                amount: 150.00,
                payment_method: 'credit_card',
                transaction_id: 'txn_12345'
            },
            user: {
                id: 1
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();

        // Mock del client per le transazioni
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.connect.mockResolvedValue(mockClient);

        jest.clearAllMocks();
    });

    describe('Creazione pagamento con successo', () => {
        it('dovrebbe creare un pagamento e confermare la prenotazione', async () => {
            const bookingData = {
                user_id: 1,
                total_price: 150.00,
                payment_id: null
            };
            const newPayment = {
                payment_id: 1,
                booking_id: 1,
                amount: 150.00,
                payment_method: 'credit_card',
                status: 'completed',
                transaction_id: 'txn_12345'
            };

            // Mock per verifica prenotazione
            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            // Mock per inserimento pagamento
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT payment
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Pagamento registrato e prenotazione confermata.',
                data: {
                    payment: newPayment
                }
            });
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('dovrebbe creare pagamento senza transaction_id', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const newPayment = { payment_id: 1, transaction_id: null };

            req.body.transaction_id = undefined;

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockResolvedValueOnce(); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(mockClient.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO payments'),
                [1, 150.00, 'credit_card', null]
            );
        });

        it('dovrebbe aggiornare lo stato della prenotazione a confirmed', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const newPayment = { payment_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockResolvedValueOnce(); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(mockClient.query).toHaveBeenNthCalledWith(3,
                'UPDATE bookings SET status = \'confirmed\' WHERE booking_id = $1',
                [1]
            );
        });
    });

    describe('Validazione dati input', () => {
        it('dovrebbe restituire errore 400 se manca booking_id', async () => {
            req.body.booking_id = undefined;

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Booking ID, importo e metodo di pagamento sono obbligatori.'
            });
        });

        it('dovrebbe restituire errore 400 se manca amount', async () => {
            req.body.amount = undefined;

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Booking ID, importo e metodo di pagamento sono obbligatori.'
            });
        });

        it('dovrebbe restituire errore 400 se manca payment_method', async () => {
            req.body.payment_method = undefined;

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire valori null', async () => {
            req.body.booking_id = null;
            req.body.amount = null;
            req.body.payment_method = null;

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Validazione prenotazione e autorizzazione', () => {
        it('dovrebbe restituire errore 404 se prenotazione non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Prenotazione non trovata.'
            });
        });

        it('dovrebbe restituire errore 403 se utente non autorizzato', async () => {
            const bookingData = { user_id: 2, total_price: 150.00, payment_id: null };
            pool.query.mockResolvedValueOnce({ rows: [bookingData] });

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a creare un pagamento per questa prenotazione.'
            });
        });

        it('dovrebbe restituire errore 409 se esiste già pagamento completed', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: 5 };
            const existingPayment = { status: 'completed' };

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            pool.query.mockResolvedValueOnce({ rows: [existingPayment] });

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Questa prenotazione ha già un pagamento in corso o completato.'
            });
        });

        it('dovrebbe restituire errore 409 se esiste già pagamento pending', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: 5 };
            const existingPayment = { status: 'pending' };

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            pool.query.mockResolvedValueOnce({ rows: [existingPayment] });

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('dovrebbe permettere nuovo pagamento se quello esistente è failed', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: 5 };
            const existingPayment = { status: 'failed' };
            const newPayment = { payment_id: 2 };

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            pool.query.mockResolvedValueOnce({ rows: [existingPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockResolvedValueOnce(); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Validazione importo', () => {
        it('dovrebbe restituire errore 400 se importo non corrisponde', async () => {
            const bookingData = { user_id: 1, total_price: 200.00, payment_id: null };
            req.body.amount = 150.00;

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });

            await paymentController.createPayment(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'L\'importo del pagamento (150) non corrisponde al prezzo totale della prenotazione (200).'
            });
        });

        it('dovrebbe gestire confronto con numeri float', async () => {
            const bookingData = { user_id: 1, total_price: 150.50, payment_id: null };
            const newPayment = { payment_id: 1 };

            req.body.amount = '150.50';

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockResolvedValueOnce(); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Gestione errori transazione', () => {
        it('dovrebbe gestire errore durante inserimento pagamento', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const dbError = new Error('Insert failed');

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockRejectedValueOnce(dbError); // INSERT failure

            await paymentController.createPayment(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).toHaveBeenCalledWith(dbError);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di constraint unique (23505)', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const constraintError = new Error('Unique constraint violation');
            constraintError.code = '23505';

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockRejectedValueOnce(constraintError); // INSERT failure

            await paymentController.createPayment(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Questa prenotazione ha già un pagamento associato.'
            });
        });

        it('dovrebbe gestire errore durante aggiornamento booking', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const newPayment = { payment_id: 1 };
            const updateError = new Error('Update failed');

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockRejectedValueOnce(updateError); // UPDATE failure

            await paymentController.createPayment(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).toHaveBeenCalledWith(updateError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe restituire errore 400 per importi a 0 (considerati falsy)', async () => {
            req.body.amount = 0.00;

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Booking ID, importo e metodo di pagamento sono obbligatori.'
            });
        });

        it('dovrebbe gestire metodi di pagamento diversi', async () => {
            const bookingData = { user_id: 1, total_price: 150.00, payment_id: null };
            const newPayment = { payment_id: 1 };

            req.body.payment_method = 'paypal';

            pool.query.mockResolvedValueOnce({ rows: [bookingData] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [newPayment] }); // INSERT
            mockClient.query.mockResolvedValueOnce(); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.createPayment(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('paymentController.getAllPayments', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                id: 1,
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

    describe('Autorizzazione per ruolo user', () => {
        it('dovrebbe restituire solo i pagamenti dell\'utente', async () => {
            const userPayments = [
                { payment_id: 1, booking_id: 1, space_name: 'Sala A', location_name: 'Sede 1' },
                { payment_id: 2, booking_id: 2, space_name: 'Sala B', location_name: 'Sede 1' }
            ];

            pool.query.mockResolvedValueOnce({ rows: userPayments });

            await paymentController.getAllPayments(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.user_id = $1'),
                [1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    payments: userPayments
                }
            });
        });

        it('dovrebbe ordinare per data pagamento DESC', async () => {
            const userPayments = [];
            pool.query.mockResolvedValueOnce({ rows: userPayments });

            await paymentController.getAllPayments(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY p.payment_date DESC'),
                [1]
            );
        });
    });

    describe('Autorizzazione per ruolo manager', () => {
        it('dovrebbe restituire pagamenti delle sedi gestite', async () => {
            const managerPayments = [
                { payment_id: 1, user_name: 'Mario', user_surname: 'Rossi', location_name: 'Sede Gestita' }
            ];

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: managerPayments });

            await paymentController.getAllPayments(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE l.manager_id = $1'),
                [1]
            );
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 1,
                data: {
                    payments: managerPayments
                }
            });
        });

        it('dovrebbe includere nome e cognome utente per manager', async () => {
            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.getAllPayments(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('u.name as user_name, u.surname as user_surname'),
                [1]
            );
        });
    });

    describe('Autorizzazione per ruolo admin', () => {
        it('dovrebbe restituire tutti i pagamenti del sistema', async () => {
            const allPayments = [
                { payment_id: 1, user_name: 'Mario', user_surname: 'Rossi' },
                { payment_id: 2, user_name: 'Luigi', user_surname: 'Verdi' },
                { payment_id: 3, user_name: 'Anna', user_surname: 'Bianchi' }
            ];

            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: allPayments });

            await paymentController.getAllPayments(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM payments p'),
                []
            );
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 3,
                data: {
                    payments: allPayments
                }
            });
        });

        it('non dovrebbe avere clausola WHERE per admin', async () => {
            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.getAllPayments(req, res, next);

            const query = pool.query.mock.calls[0][0];
            expect(query).not.toContain('WHERE');
        });
    });

    describe('Ruoli non autorizzati', () => {
        it('dovrebbe restituire errore 403 per ruolo sconosciuto', async () => {
            req.user.role = 'unknown_role';

            await paymentController.getAllPayments(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare i pagamenti.'
            });
        });

        it('dovrebbe gestire ruolo undefined', async () => {
            req.user.role = undefined;

            await paymentController.getAllPayments(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await paymentController.getAllPayments(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire risultati vuoti', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.getAllPayments(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    payments: []
                }
            });
        });
    });
});

describe('paymentController.getPaymentById', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            user: {
                id: 1,
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

    describe('Recupero pagamento con successo', () => {
        it('dovrebbe restituire il pagamento per il proprietario', async () => {
            const payment = {
                payment_id: 1,
                booking_user_id: 1,
                amount: 150.00,
                status: 'completed'
            };

            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    payment
                }
            });
        });

        it('dovrebbe utilizzare query con JOIN corretto', async () => {
            const payment = { payment_id: 1, booking_user_id: 1 };
            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('JOIN bookings b ON p.booking_id = b.booking_id'),
                ['1']
            );
        });
    });

    describe('Pagamento non trovato', () => {
        it('dovrebbe restituire errore 404 se pagamento non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Pagamento non trovato.'
            });
        });
    });

    describe('Autorizzazione per utenti', () => {
        it('dovrebbe negare accesso se utente non è proprietario', async () => {
            const payment = {
                payment_id: 1,
                booking_user_id: 2, // Diverso dall'user_id = 1
                manager_id: 3
            };

            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare questo pagamento.'
            });
        });
    });

    describe('Autorizzazione per manager', () => {
        it('dovrebbe permettere accesso se manager gestisce la sede', async () => {
            const payment = {
                payment_id: 1,
                booking_user_id: 2,
                manager_id: 1 // Stesso dell'user_id = 1
            };

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe negare accesso se manager non gestisce la sede', async () => {
            const payment = {
                payment_id: 1,
                booking_user_id: 2,
                manager_id: 3 // Diverso dall'user_id = 1
            };

            req.user.role = 'manager';
            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a visualizzare questo pagamento (non sei il manager della sede).'
            });
        });
    });

    describe('Autorizzazione per admin', () => {
        it('dovrebbe permettere accesso completo agli admin', async () => {
            const payment = {
                payment_id: 1,
                booking_user_id: 999, // Diverso dall'user_id = 1
                manager_id: 888
            };

            req.user.role = 'admin';
            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database query failed');
            pool.query.mockRejectedValueOnce(dbError);

            await paymentController.getPaymentById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID diversi', async () => {
            const payment = { payment_id: 5, booking_user_id: 1 };

            req.params.id = '5';
            pool.query.mockResolvedValueOnce({ rows: [payment] });

            await paymentController.getPaymentById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.any(String),
                ['5']
            );
        });
    });
});

describe('paymentController.updatePaymentStatus', () => {
    let req, res, next, mockClient;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            body: { status: 'completed' },
            user: {
                id: 1,
                role: 'admin'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();

        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.connect.mockResolvedValue(mockClient);

        jest.clearAllMocks();
    });

    describe('Aggiornamento stato con successo', () => {
        it('dovrebbe aggiornare stato a completed e confermare booking', async () => {
            const currentPayment = {
                booking_id: 1,
                current_status: 'pending',
                booking_user_id: 2,
                manager_id: 3
            };
            const updatedPayment = {
                payment_id: 1,
                status: 'completed',
                booking_id: 1
            };

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE payment
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Stato pagamento aggiornato.',
                data: {
                    payment: updatedPayment
                }
            });

            expect(mockClient.query).toHaveBeenNthCalledWith(3,
                expect.stringContaining('UPDATE bookings SET status = \'confirmed\''),
                [1]
            );
        });

        it('dovrebbe aggiornare stato a failed e cancellare booking', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updatedPayment = { payment_id: 1, status: 'failed' };

            req.body.status = 'failed';
            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE payment
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(mockClient.query).toHaveBeenNthCalledWith(3,
                'UPDATE bookings SET status = \'cancelled\' WHERE booking_id = $1',
                [1]
            );
        });

        it('dovrebbe aggiornare stato a refunded e cancellare booking', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updatedPayment = { payment_id: 1, status: 'refunded' };

            req.body.status = 'refunded';
            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE payment
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(mockClient.query).toHaveBeenNthCalledWith(3,
                'UPDATE bookings SET status = \'cancelled\' WHERE booking_id = $1',
                [1]
            );
        });
    });

    describe('Validazione stato', () => {
        it('dovrebbe restituire errore 400 se status mancante', async () => {
            req.body.status = undefined;

            await paymentController.updatePaymentStatus(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Lo stato è obbligatorio.'
            });
        });

        it('dovrebbe restituire errore 400 per stato non valido', async () => {
            req.body.status = 'invalid_status';

            await paymentController.updatePaymentStatus(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Stato non valido. Sono ammessi: completed, failed, refunded'
            });
        });

        it('dovrebbe accettare tutti gli stati validi', async () => {
            const validStatuses = ['completed', 'failed', 'refunded'];
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updatedPayment = { payment_id: 1 };

            req.user.role = 'manager';

            for (const status of validStatuses) {
                req.body.status = status;

                pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
                mockClient.query.mockResolvedValueOnce(); // BEGIN
                mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE
                mockClient.query.mockResolvedValueOnce(); // UPDATE booking
                mockClient.query.mockResolvedValueOnce(); // COMMIT

                await paymentController.updatePaymentStatus(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
                jest.clearAllMocks();
            }
        });
    });

    describe('Pagamento non trovato', () => {
        it('dovrebbe restituire errore 404 se pagamento non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await paymentController.updatePaymentStatus(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Pagamento non trovato.'
            });
        });
    });

    describe('Autorizzazione per manager', () => {
        it('dovrebbe permettere aggiornamento se manager gestisce la sede', async () => {
            const currentPayment = {
                booking_id: 1,
                booking_user_id: 2,
                manager_id: 1 // Stesso dell'user_id = 1
            };
            const updatedPayment = { payment_id: 1 };

            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe negare aggiornamento se manager non gestisce la sede', async () => {
            const currentPayment = {
                booking_id: 1,
                booking_user_id: 2,
                manager_id: 3 // Diverso dall'user_id = 1
            };

            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });

            await paymentController.updatePaymentStatus(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a modificare lo stato di questo pagamento (non sei il manager della sede).'
            });
        });
    });

    describe('Autorizzazione per altri ruoli', () => {
        it('dovrebbe negare accesso a utenti normali', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 1, manager_id: 2 };

            req.user.role = 'user';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });

            await paymentController.updatePaymentStatus(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Non autorizzato a modificare lo stato di questo pagamento.'
            });
        });

        it('dovrebbe permettere accesso completo agli admin', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 999, manager_id: 888 };
            const updatedPayment = { payment_id: 1 };

            req.user.role = 'admin';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Gestione errori transazione', () => {
        it('dovrebbe gestire errore durante aggiornamento pagamento', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updateError = new Error('Update failed');

            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockRejectedValueOnce(updateError); // UPDATE failure

            await paymentController.updatePaymentStatus(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).toHaveBeenCalledWith(updateError);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('dovrebbe gestire errore durante aggiornamento booking', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updatedPayment = { payment_id: 1 };
            const bookingError = new Error('Booking update failed');

            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE payment
            mockClient.query.mockRejectedValueOnce(bookingError); // UPDATE booking failure

            await paymentController.updatePaymentStatus(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(next).toHaveBeenCalledWith(bookingError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire status null', async () => {
            req.body.status = null;

            await paymentController.updatePaymentStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Lo stato è obbligatorio.'
            });
        });

        it('dovrebbe gestire ID pagamento come stringa', async () => {
            const currentPayment = { booking_id: 1, booking_user_id: 2, manager_id: 1 };
            const updatedPayment = { payment_id: 1 };

            req.params.id = '999';
            req.user.role = 'manager';

            pool.query.mockResolvedValueOnce({ rows: [currentPayment] });
            mockClient.query.mockResolvedValueOnce(); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] }); // UPDATE
            mockClient.query.mockResolvedValueOnce(); // UPDATE booking
            mockClient.query.mockResolvedValueOnce(); // COMMIT

            await paymentController.updatePaymentStatus(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.any(String),
                ['999']
            );
        });
    });
});