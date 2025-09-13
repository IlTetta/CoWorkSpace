const PaymentService = require('../../src/backend/services/PaymentService');
const Payment = require('../../src/backend/models/Payment');
const Booking = require('../../src/backend/models/Booking');
const Space = require('../../src/backend/models/Space');
const Location = require('../../src/backend/models/Location');
const AppError = require('../../src/backend/utils/AppError');
const db = require('../../src/backend/config/db');

// Mock delle dipendenze
jest.mock('../../src/backend/models/Payment');
jest.mock('../../src/backend/models/Booking');
jest.mock('../../src/backend/models/Space');
jest.mock('../../src/backend/models/Location');
jest.mock('../../src/backend/config/db');

describe('PaymentService', () => {
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock del database client per transazioni
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        
        const mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient)
        };
        
        db.pool = mockPool;
    });

    describe('createPayment', () => {
        const mockUser = {
            user_id: 1,
            role: 'user',
            email: 'test@example.com'
        };

        const mockBooking = {
            booking_id: 1,
            user_id: 1,
            space_id: 1,
            total_price: 50.00,
            status: 'pending'
        };

        const mockPaymentData = {
            booking_id: 1,
            amount: 50.00,
            payment_method: 'credit_card',
            transaction_id: 'txn_123456'
        };

        it('dovrebbe creare un pagamento con successo per utente proprietario', async () => {
            // Arrange
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);
            
            const mockCreatedPayment = {
                payment_id: 1,
                booking_id: 1,
                amount: 50.00,
                status: 'completed'
            };
            
            Payment.create.mockResolvedValue(mockCreatedPayment);
            Payment.findById.mockResolvedValue(mockCreatedPayment);
            Booking.update.mockResolvedValue(true);

            // Act
            const result = await PaymentService.createPayment(mockUser, mockPaymentData);

            // Assert
            expect(Booking.findById).toHaveBeenCalledWith(1);
            expect(Payment.findByBookingId).toHaveBeenCalledWith(1);
            expect(Payment.create).toHaveBeenCalledWith({
                booking_id: 1,
                amount: 50.00,
                payment_method: 'credit_card',
                status: 'completed',
                transaction_id: 'txn_123456'
            });
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'confirmed' });
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(mockCreatedPayment);
        });

        it('dovrebbe lanciare errore se utente non autenticato', async () => {
            // Act & Assert
            await expect(PaymentService.createPayment(null, mockPaymentData))
                .rejects.toThrow('Utente non autenticato');
                
            await expect(PaymentService.createPayment({}, mockPaymentData))
                .rejects.toThrow('Utente non autenticato');
        });

        it('dovrebbe lanciare errore se prenotazione non trovata', async () => {
            // Arrange
            Booking.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, mockPaymentData))
                .rejects.toThrow('Prenotazione non trovata');
        });

        it('dovrebbe lanciare errore se utente normale tenta di pagare prenotazione altrui', async () => {
            // Arrange
            const otherUserBooking = { ...mockBooking, user_id: 2 };
            Booking.findById.mockResolvedValue(otherUserBooking);

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, mockPaymentData))
                .rejects.toThrow('Non puoi creare un pagamento per questa prenotazione');
        });

        it('dovrebbe permettere a manager di processare pagamenti per propria location', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const otherUserBooking = { ...mockBooking, user_id: 3, space_id: 1 };
            const mockSpace = { space_id: 1, location_id: 1 };
            const mockLocation = { location_id: 1, manager_id: 2 };

            Booking.findById.mockResolvedValue(otherUserBooking);
            Space.findById.mockResolvedValue(mockSpace);
            Location.findById.mockResolvedValue(mockLocation);
            Payment.findByBookingId.mockResolvedValue(null);
            
            const mockCreatedPayment = { payment_id: 1, booking_id: 1 };
            Payment.create.mockResolvedValue(mockCreatedPayment);
            Payment.findById.mockResolvedValue(mockCreatedPayment);
            Booking.update.mockResolvedValue(true);

            // Act
            const result = await PaymentService.createPayment(managerUser, mockPaymentData);

            // Assert
            expect(Space.findById).toHaveBeenCalledWith(1);
            expect(Location.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockCreatedPayment);
        });

        it('dovrebbe lanciare errore se manager non gestisce la location', async () => {
            // Arrange
            const managerUser = { user_id: 2, role: 'manager' };
            const otherUserBooking = { ...mockBooking, user_id: 3, space_id: 1 };
            const mockSpace = { space_id: 1, location_id: 1 };
            const mockLocation = { location_id: 1, manager_id: 3 }; // Altro manager

            Booking.findById.mockResolvedValue(otherUserBooking);
            Space.findById.mockResolvedValue(mockSpace);
            Location.findById.mockResolvedValue(mockLocation);

            // Act & Assert
            await expect(PaymentService.createPayment(managerUser, mockPaymentData))
                .rejects.toThrow('Puoi processare pagamenti solo per prenotazioni delle tue location');
        });

        it('dovrebbe lanciare errore se esiste già un pagamento completato', async () => {
            // Arrange
            const existingPayment = {
                payment_id: 1,
                booking_id: 1,
                status: 'completed'
            };
            
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(existingPayment);

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, mockPaymentData))
                .rejects.toThrow('Questa prenotazione ha già un pagamento completato');
        });

        it('dovrebbe lanciare errore se esiste già un pagamento pending', async () => {
            // Arrange
            const existingPayment = {
                payment_id: 1,
                booking_id: 1,
                status: 'pending'
            };
            
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(existingPayment);

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, mockPaymentData))
                .rejects.toThrow('Questa prenotazione ha già un pagamento in corso');
        });

        it('dovrebbe lanciare errore se importo non corrisponde al prezzo prenotazione', async () => {
            // Arrange
            const wrongAmountData = { ...mockPaymentData, amount: 75.00 };
            
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, wrongAmountData))
                .rejects.toThrow('L\'importo del pagamento (75) non corrisponde al prezzo totale della prenotazione (50)');
        });

        it('dovrebbe gestire rollback in caso di errore durante transazione', async () => {
            // Arrange
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);
            Payment.create.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(PaymentService.createPayment(mockUser, mockPaymentData))
                .rejects.toThrow('Database error');
                
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('getPayments', () => {
        it('dovrebbe restituire pagamenti per utente normale (solo propri)', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };
            const mockPayments = [
                { payment_id: 1, booking: { user_id: 1 } },
                { payment_id: 2, booking: { user_id: 1 } }
            ];
            
            Payment.findAll.mockResolvedValue(mockPayments);

            // Act
            const result = await PaymentService.getPayments(user);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({ user_id: 1 });
            expect(result).toEqual(mockPayments);
        });

        it('dovrebbe restituire pagamenti per manager (solo propria location)', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const mockPayments = [
                { payment_id: 1, manager_id: 2 },
                { payment_id: 2, manager_id: 2 }
            ];
            
            Payment.findAll.mockResolvedValue(mockPayments);

            // Act
            const result = await PaymentService.getPayments(manager);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({ manager_id: 2 });
            expect(result).toEqual(mockPayments);
        });

        it('dovrebbe restituire tutti i pagamenti per admin', async () => {
            // Arrange
            const admin = { user_id: 3, role: 'admin' };
            const mockPayments = [
                { payment_id: 1 },
                { payment_id: 2 },
                { payment_id: 3 }
            ];
            
            Payment.findAll.mockResolvedValue(mockPayments);

            // Act
            const result = await PaymentService.getPayments(admin);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({});
            expect(result).toEqual(mockPayments);
        });

        it('dovrebbe applicare filtri aggiuntivi mantenendo filtri di ruolo', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };
            const filters = { status: 'completed', payment_method: 'credit_card' };
            
            Payment.findAll.mockResolvedValue([]);

            // Act
            await PaymentService.getPayments(user, filters);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({
                user_id: 1,
                status: 'completed',
                payment_method: 'credit_card'
            });
        });

        it('dovrebbe lanciare errore per utente non autenticato', async () => {
            // Act & Assert
            await expect(PaymentService.getPayments(null))
                .rejects.toThrow('Utente non autenticato');
        });

        it('dovrebbe lanciare errore per ruolo non autorizzato', async () => {
            // Arrange
            const invalidUser = { user_id: 1, role: 'invalid' };

            // Act & Assert
            await expect(PaymentService.getPayments(invalidUser))
                .rejects.toThrow('Ruolo non autorizzato');
        });
    });

    describe('getPaymentDetails', () => {
        const mockPayment = {
            payment_id: 1,
            booking: { user_id: 1 },
            manager_id: 2,
            amount: 50.00
        };

        it('dovrebbe restituire dettagli pagamento per proprietario', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };
            Payment.findById.mockResolvedValue(mockPayment);

            // Act
            const result = await PaymentService.getPaymentDetails(user, 1);

            // Assert
            expect(Payment.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockPayment);
        });

        it('dovrebbe restituire dettagli pagamento per manager della location', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            Payment.findById.mockResolvedValue(mockPayment);

            // Act
            const result = await PaymentService.getPaymentDetails(manager, 1);

            // Assert
            expect(result).toEqual(mockPayment);
        });

        it('dovrebbe restituire dettagli pagamento per admin', async () => {
            // Arrange
            const admin = { user_id: 3, role: 'admin' };
            Payment.findById.mockResolvedValue(mockPayment);

            // Act
            const result = await PaymentService.getPaymentDetails(admin, 1);

            // Assert
            expect(result).toEqual(mockPayment);
        });

        it('dovrebbe lanciare errore se pagamento non trovato', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };
            Payment.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.getPaymentDetails(user, 999))
                .rejects.toThrow('Pagamento non trovata');
        });

        it('dovrebbe lanciare errore se utente normale non è proprietario', async () => {
            // Arrange
            const user = { user_id: 2, role: 'user' };
            Payment.findById.mockResolvedValue(mockPayment);

            // Act & Assert
            await expect(PaymentService.getPaymentDetails(user, 1))
                .rejects.toThrow('Non puoi visualizzare questo pagamento');
        });

        it('dovrebbe lanciare errore se manager non gestisce la location', async () => {
            // Arrange
            const manager = { user_id: 3, role: 'manager' };
            Payment.findById.mockResolvedValue(mockPayment);

            // Act & Assert
            await expect(PaymentService.getPaymentDetails(manager, 1))
                .rejects.toThrow('Non puoi visualizzare questo pagamento (non sei il manager della sede)');
        });
    });

    describe('canPayBooking', () => {
        it('dovrebbe permettere pagamento se non esiste pagamento precedente', async () => {
            // Arrange
            const mockBooking = { booking_id: 1, total_price: 50.00 };
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);

            // Act
            const result = await PaymentService.canPayBooking(1);

            // Assert
            expect(result).toEqual({
                can_pay: true,
                booking: mockBooking,
                existing_payment: null,
                message: 'La prenotazione può essere pagata'
            });
        });

        it('dovrebbe permettere pagamento se pagamento precedente è fallito', async () => {
            // Arrange
            const mockBooking = { booking_id: 1, total_price: 50.00 };
            const failedPayment = { payment_id: 1, status: 'failed' };
            
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(failedPayment);

            // Act
            const result = await PaymentService.canPayBooking(1);

            // Assert
            expect(result).toEqual({
                can_pay: true,
                booking: mockBooking,
                existing_payment: failedPayment,
                message: 'Esiste già un pagamento con stato: failed'
            });
        });

        it('dovrebbe impedire pagamento se esiste pagamento completato', async () => {
            // Arrange
            const mockBooking = { booking_id: 1, total_price: 50.00 };
            const completedPayment = { payment_id: 1, status: 'completed' };
            
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(completedPayment);

            // Act
            const result = await PaymentService.canPayBooking(1);

            // Assert
            expect(result).toEqual({
                can_pay: false,
                booking: mockBooking,
                existing_payment: completedPayment,
                message: 'Esiste già un pagamento con stato: completed'
            });
        });

        it('dovrebbe lanciare errore se prenotazione non trovata', async () => {
            // Arrange
            Booking.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.canPayBooking(999))
                .rejects.toThrow('Prenotazione non trovata');
        });
    });

    describe('updatePaymentStatus', () => {
        const mockPayment = {
            payment_id: 1,
            booking_id: 1,
            manager_id: 2,
            status: 'pending'
        };

        it('dovrebbe aggiornare stato pagamento se manager della location', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const updateData = { status: 'completed' };
            const updatedPayment = { ...mockPayment, status: 'completed' };

            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue(updatedPayment);
            Payment.findById.mockResolvedValueOnce(mockPayment).mockResolvedValueOnce(updatedPayment);
            Booking.update.mockResolvedValue(true);

            // Act
            const result = await PaymentService.updatePaymentStatus(manager, 1, updateData);

            // Assert
            expect(Payment.findById).toHaveBeenCalledWith(1);
            expect(Payment.update).toHaveBeenCalledWith(1, updateData);
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'confirmed' });
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(updatedPayment);
        });

        it('dovrebbe aggiornare stato pagamento se admin', async () => {
            // Arrange
            const admin = { user_id: 3, role: 'admin' };
            const updateData = { status: 'refunded' };
            const updatedPayment = { ...mockPayment, status: 'refunded' };

            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue(updatedPayment);
            Payment.findById.mockResolvedValueOnce(mockPayment).mockResolvedValueOnce(updatedPayment);
            Booking.update.mockResolvedValue(true);

            // Act
            const result = await PaymentService.updatePaymentStatus(admin, 1, updateData);

            // Assert
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'cancelled' });
            expect(result).toEqual(updatedPayment);
        });

        it('dovrebbe aggiornare prenotazione a cancelled per status failed', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const updateData = { status: 'failed' };
            const updatedPayment = { ...mockPayment, status: 'failed' };

            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue(updatedPayment);
            Payment.findById.mockResolvedValueOnce(mockPayment).mockResolvedValueOnce(updatedPayment);
            Booking.update.mockResolvedValue(true);

            // Act
            await PaymentService.updatePaymentStatus(manager, 1, updateData);

            // Assert
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'cancelled' });
        });

        it('dovrebbe non aggiornare prenotazione per status che non richiede cambio', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const updateData = { status: 'pending' };
            const updatedPayment = { ...mockPayment, status: 'pending' };

            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue(updatedPayment);
            Payment.findById.mockResolvedValueOnce(mockPayment).mockResolvedValueOnce(updatedPayment);

            // Act
            await PaymentService.updatePaymentStatus(manager, 1, updateData);

            // Assert
            expect(Booking.update).not.toHaveBeenCalled();
        });

        it('dovrebbe lanciare errore se utente non autenticato', async () => {
            // Act & Assert
            await expect(PaymentService.updatePaymentStatus(null, 1, {}))
                .rejects.toThrow('Utente non autenticato');
        });

        it('dovrebbe lanciare errore se utente normale tenta aggiornamento', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };

            // Act & Assert
            await expect(PaymentService.updatePaymentStatus(user, 1, {}))
                .rejects.toThrow('Non hai il permesso per aggiornare lo stato dei pagamenti');
        });

        it('dovrebbe lanciare errore se pagamento non trovato', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            Payment.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.updatePaymentStatus(manager, 999, {}))
                .rejects.toThrow('Pagamento non trovato');
        });

        it('dovrebbe lanciare errore se manager non gestisce la location', async () => {
            // Arrange
            const manager = { user_id: 3, role: 'manager' };
            const paymentOtherLocation = { ...mockPayment, manager_id: 2 };
            Payment.findById.mockResolvedValue(paymentOtherLocation);

            // Act & Assert
            await expect(PaymentService.updatePaymentStatus(manager, 1, {}))
                .rejects.toThrow('Non puoi modificare lo stato di questo pagamento (non sei il manager della sede)');
        });

        it('dovrebbe gestire rollback in caso di errore', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(PaymentService.updatePaymentStatus(manager, 1, { status: 'completed' }))
                .rejects.toThrow('Database error');
                
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('deletePayment', () => {
        const mockPayment = {
            payment_id: 1,
            booking_id: 1,
            status: 'completed'
        };

        it('dovrebbe eliminare pagamento se admin', async () => {
            // Arrange
            const admin = { user_id: 1, role: 'admin' };
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.delete.mockResolvedValue(true);
            Booking.update.mockResolvedValue(true);

            // Act
            const result = await PaymentService.deletePayment(admin, 1);

            // Assert
            expect(Payment.findById).toHaveBeenCalledWith(1);
            expect(Payment.delete).toHaveBeenCalledWith(1);
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'pending' });
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toBe(true);
        });

        it('dovrebbe lanciare errore se utente non autenticato', async () => {
            // Act & Assert
            await expect(PaymentService.deletePayment(null, 1))
                .rejects.toThrow('Utente non autenticato');
        });

        it('dovrebbe lanciare errore se non admin', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };

            // Act & Assert
            await expect(PaymentService.deletePayment(manager, 1))
                .rejects.toThrow('Solo gli admin possono eliminare pagamenti');
        });

        it('dovrebbe lanciare errore se pagamento non trovato', async () => {
            // Arrange
            const admin = { user_id: 1, role: 'admin' };
            Payment.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(PaymentService.deletePayment(admin, 999))
                .rejects.toThrow('Pagamento non trovato');
        });

        it('dovrebbe gestire rollback in caso di errore', async () => {
            // Arrange
            const admin = { user_id: 1, role: 'admin' };
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.delete.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(PaymentService.deletePayment(admin, 1))
                .rejects.toThrow('Database error');
                
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('getPaymentStatistics', () => {
        const mockPayments = [
            {
                payment_id: 1,
                amount: '50.00',
                status: 'completed',
                payment_method: 'credit_card',
                payment_date: '2024-01-15T10:00:00Z'
            },
            {
                payment_id: 2,
                amount: '30.00',
                status: 'completed',
                payment_method: 'credit_card',
                payment_date: '2024-01-20T14:00:00Z'
            },
            {
                payment_id: 3,
                amount: '25.00',
                status: 'failed',
                payment_method: 'credit_card',
                payment_date: '2024-02-01T09:00:00Z'
            },
            {
                payment_id: 4,
                amount: '40.00',
                status: 'refunded',
                payment_method: 'credit_card',
                payment_date: '2024-02-10T16:00:00Z'
            }
        ];

        it('dovrebbe calcolare statistiche per manager', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            Payment.findAll.mockResolvedValue(mockPayments);

            // Act
            const result = await PaymentService.getPaymentStatistics(manager);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({ manager_id: 2 });
            expect(result).toEqual({
                total_payments: 4,
                total_revenue: 80.00, // 50 + 30 (solo completed)
                completed_payments: 2,
                failed_payments: 1,
                refunded_payments: 1,
                payment_methods: {
                    credit_card: 4
                },
                monthly_revenue: {
                    '2024-01': 80.00, // 50 + 30
                    '2024-02': 0 // failed e refunded non contano
                }
            });
        });

        it('dovrebbe calcolare statistiche per admin', async () => {
            // Arrange
            const admin = { user_id: 1, role: 'admin' };
            Payment.findAll.mockResolvedValue(mockPayments);

            // Act
            const result = await PaymentService.getPaymentStatistics(admin);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({});
            expect(result.total_payments).toBe(4);
            expect(result.total_revenue).toBe(80.00);
        });

        it('dovrebbe applicare filtri aggiuntivi mantenendo filtri di ruolo', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const filters = { start_date: '2024-01-01', end_date: '2024-01-31' };
            Payment.findAll.mockResolvedValue([]);

            // Act
            await PaymentService.getPaymentStatistics(manager, filters);

            // Assert
            expect(Payment.findAll).toHaveBeenCalledWith({
                manager_id: 2,
                start_date: '2024-01-01',
                end_date: '2024-01-31'
            });
        });

        it('dovrebbe lanciare errore se utente non autenticato', async () => {
            // Act & Assert
            await expect(PaymentService.getPaymentStatistics(null))
                .rejects.toThrow('Utente non autenticato');
        });

        it('dovrebbe lanciare errore se utente normale tenta di vedere statistiche', async () => {
            // Arrange
            const user = { user_id: 1, role: 'user' };

            // Act & Assert
            await expect(PaymentService.getPaymentStatistics(user))
                .rejects.toThrow('Non hai il permesso per visualizzare le statistiche');
        });

        it('dovrebbe gestire pagamenti senza importo valido', async () => {
            // Arrange
            const manager = { user_id: 2, role: 'manager' };
            const paymentsWithInvalidAmount = [
                { payment_id: 1, amount: 'invalid', status: 'completed', payment_method: 'credit_card', payment_date: '2024-01-01T10:00:00Z' }
            ];
            Payment.findAll.mockResolvedValue(paymentsWithInvalidAmount);

            // Act
            const result = await PaymentService.getPaymentStatistics(manager);

            // Assert
            expect(result.total_revenue).toBeNaN(); // parseFloat('invalid') = NaN
            expect(result.total_payments).toBe(1);
            expect(result.completed_payments).toBe(1);
        });
    });
});
