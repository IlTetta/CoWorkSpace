const PaymentService = require('../../../src/backend/services/PaymentService');
const Payment = require('../../../src/backend/models/Payment');
const Booking = require('../../../src/backend/models/Booking');
const db = require('../../../src/backend/config/db');
const AppError = require('../../../src/backend/utils/AppError');

// Mock dei modelli e del db
jest.mock('../../../src/backend/models/Payment');
jest.mock('../../../src/backend/models/Booking');
jest.mock('../../../src/backend/config/db');

describe('PaymentService', () => {
    let adminUser;
    let managerUser;
    let regularUser;
    let mockBooking;
    let mockPayment;
    let mockClient;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup degli utenti di test
        adminUser = { user_id: 1, role: 'admin' };
        managerUser = { user_id: 2, role: 'manager' };
        regularUser = { user_id: 3, role: 'user' };

        // Setup mock booking
        mockBooking = {
            booking_id: 1,
            user_id: regularUser.user_id,
            total_price: 100,
            status: 'pending'
        };

        // Setup mock payment
        mockPayment = {
            payment_id: 1,
            booking_id: 1,
            amount: 100,
            payment_method: 'credit_card',
            status: 'completed',
            transaction_id: 'tx_123',
            booking: mockBooking
        };

        // Setup mock database client
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        db.pool = {
            connect: jest.fn().mockResolvedValue(mockClient)
        };
    });

    describe('createPayment', () => {
        const paymentData = {
            booking_id: 1,
            amount: 100,
            payment_method: 'credit_card',
            transaction_id: 'tx_123'
        };

        it('should create payment successfully for own booking', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);
            Payment.create.mockResolvedValue(mockPayment);
            Payment.findById.mockResolvedValue(mockPayment);

            const result = await PaymentService.createPayment(regularUser, paymentData);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(Payment.create).toHaveBeenCalled();
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'confirmed' });
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toEqual(mockPayment);
        });

        it('should not allow payment for others booking as regular user', async () => {
            const otherBooking = { ...mockBooking, user_id: 999 };
            Booking.findById.mockResolvedValue(otherBooking);

            await expect(
                PaymentService.createPayment(regularUser, paymentData)
            ).rejects.toThrow('Non puoi creare un pagamento per questa prenotazione');
        });

        it('should prevent duplicate payments', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue({ ...mockPayment, status: 'completed' });

            await expect(
                PaymentService.createPayment(regularUser, paymentData)
            ).rejects.toThrow('Questa prenotazione ha già un pagamento completato');
        });

        it('should validate payment amount matches booking price', async () => {
            const wrongAmountData = { ...paymentData, amount: 50 };
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);

            await expect(
                PaymentService.createPayment(regularUser, wrongAmountData)
            ).rejects.toThrow('L\'importo del pagamento');
        });
    });

    describe('getPayments', () => {
        const payments = [
            mockPayment,
            { ...mockPayment, payment_id: 2, booking: { ...mockBooking, user_id: 4 } }
        ];

        it('should return only user\'s payments for regular users', async () => {
            Payment.findAll.mockResolvedValue([payments[0]]);

            const result = await PaymentService.getPayments(regularUser);

            expect(Payment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: regularUser.user_id })
            );
            expect(result).toHaveLength(1);
        });

        it('should return all payments for admin', async () => {
            Payment.findAll.mockResolvedValue(payments);

            const result = await PaymentService.getPayments(adminUser);

            expect(Payment.findAll).toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });

        it('should return location payments for manager', async () => {
            Payment.findAll.mockResolvedValue([payments[0]]);

            const result = await PaymentService.getPayments(managerUser);

            expect(Payment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ manager_id: managerUser.user_id })
            );
        });
    });

    describe('updatePaymentStatus', () => {
        const updateData = { status: 'completed' };

        it('should update payment status as admin', async () => {
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue({ ...mockPayment, ...updateData });

            const result = await PaymentService.updatePaymentStatus(adminUser, 1, updateData);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(Payment.update).toHaveBeenCalledWith(1, updateData);
            expect(Booking.update).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should not allow regular users to update payment status', async () => {
            await expect(
                PaymentService.updatePaymentStatus(regularUser, 1, updateData)
            ).rejects.toThrow('Non hai il permesso per aggiornare lo stato dei pagamenti');
        });

        it('should update booking status based on payment status', async () => {
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue({ ...mockPayment, status: 'refunded' });

            await PaymentService.updatePaymentStatus(adminUser, 1, { status: 'refunded' });

            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'cancelled' });
        });
    });

    describe('deletePayment', () => {
        it('should allow admin to delete payment', async () => {
            Payment.findById.mockResolvedValue(mockPayment);
            Payment.delete.mockResolvedValue(true);

            const result = await PaymentService.deletePayment(adminUser, 1);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(Payment.delete).toHaveBeenCalledWith(1);
            expect(Booking.update).toHaveBeenCalledWith(1, { status: 'pending' });
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toBe(true);
        });

        it('should not allow non-admin users to delete payments', async () => {
            await expect(
                PaymentService.deletePayment(regularUser, 1)
            ).rejects.toThrow('Solo gli admin possono eliminare pagamenti');
        });
    });

    describe('getPaymentStatistics', () => {
        const mockPayments = [
            { 
                ...mockPayment, 
                payment_date: '2025-09-01',
                payment_method: 'credit_card',
                status: 'completed',
                amount: 100
            },
            { 
                ...mockPayment, 
                payment_id: 2,
                status: 'failed',
                payment_method: 'paypal',
                payment_date: '2025-09-01',
                amount: 75
            },
            {
                ...mockPayment,
                payment_id: 3,
                status: 'refunded',
                payment_method: 'bank_transfer',
                amount: 50,
                payment_date: '2025-08-01'
            }
        ];

        it('should calculate statistics correctly for admin', async () => {
            Payment.findAll.mockResolvedValue(mockPayments);

            const stats = await PaymentService.getPaymentStatistics(adminUser);

            expect(stats).toEqual({
                total_payments: 3,
                total_revenue: 100, // Solo pagamenti completed
                completed_payments: 1,
                failed_payments: 1,
                refunded_payments: 1,
                payment_methods: {
                    credit_card: 1,
                    paypal: 1,
                    bank_transfer: 1
                },
                monthly_revenue: {
                    '2025-09': 100,
                    '2025-08': 0
                }
            });
        });

        it('should not allow regular users to view statistics', async () => {
            await expect(
                PaymentService.getPaymentStatistics(regularUser)
            ).rejects.toThrow('Non hai il permesso per visualizzare le statistiche');
        });
    });

    describe('canPayBooking', () => {
        it('should allow payment for booking without existing payment', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(null);

            const result = await PaymentService.canPayBooking(1);

            expect(result.can_pay).toBe(true);
            expect(result.booking).toBeDefined();
            expect(result.existing_payment).toBeNull();
        });

        it('should allow payment for booking with failed payment', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue({ ...mockPayment, status: 'failed' });

            const result = await PaymentService.canPayBooking(1);

            expect(result.can_pay).toBe(true);
        });

        it('should not allow payment for booking with completed payment', async () => {
            Booking.findById.mockResolvedValue(mockBooking);
            Payment.findByBookingId.mockResolvedValue(mockPayment);

            const result = await PaymentService.canPayBooking(1);

            expect(result.can_pay).toBe(false);
        });
    });
});
