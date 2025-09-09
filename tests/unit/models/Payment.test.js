// tests/unit/models/Payment.test.js
const Payment = require('../../../src/backend/models/Payment');
const AppError = require('../../../src/backend/utils/AppError');

// Mock del database
jest.mock('../../../src/backend/config/db', () => ({
    query: jest.fn()
}));

describe('Payment Model', () => {
    const validPaymentData = {
        booking_id: 1,
        amount: 150.00,
        payment_method: 'credit_card',
        status: 'completed',
        transaction_id: 'TXN_123456789'
    };

    const mockPayment = {
        payment_id: 1,
        ...validPaymentData,
        payment_date: '2024-01-15T10:00:00Z'
    };

    const mockExtendedPayment = {
        ...mockPayment,
        // Booking data
        booking_user_id: 2,
        space_id: 3,
        booking_date: '2024-03-15',
        start_time: '09:00',
        end_time: '17:00',
        
        // Space data
        space_name: 'Sala Conferenze A',
        location_name: 'Milano Centro',
        
        // User data
        user_name: 'Mario',
        user_surname: 'Rossi',
        user_email: 'mario.rossi@example.com'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create payment instance with basic properties', () => {
            const payment = new Payment(mockPayment);

            expect(payment.payment_id).toBe(1);
            expect(payment.booking_id).toBe(1);
            expect(payment.amount).toBe(150.00);
            expect(payment.payment_method).toBe('credit_card');
            expect(payment.status).toBe('completed');
            expect(payment.transaction_id).toBe('TXN_123456789');
            expect(payment.payment_date).toBe('2024-01-15T10:00:00Z');
        });

        it('should create payment with extended booking data', () => {
            const payment = new Payment(mockExtendedPayment);

            expect(payment.booking).toEqual({
                id: 1,
                user_id: 2,
                space_id: 3,
                booking_date: '2024-03-15',
                start_time: '09:00',
                end_time: '17:00'
            });
        });

        it('should create payment with extended space data', () => {
            const payment = new Payment(mockExtendedPayment);

            expect(payment.space).toEqual({
                name: 'Sala Conferenze A',
                location_name: 'Milano Centro'
            });
        });

        it('should create payment with extended user data', () => {
            const payment = new Payment(mockExtendedPayment);

            expect(payment.user).toEqual({
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com'
            });
        });

        it('should handle minimal payment data', () => {
            const minimalData = {
                payment_id: 1,
                booking_id: 1,
                amount: 100.00,
                payment_method: 'paypal',
                status: 'completed'
            };

            const payment = new Payment(minimalData);

            expect(payment.payment_id).toBe(1);
            expect(payment.booking_id).toBe(1);
            expect(payment.amount).toBe(100.00);
            expect(payment.payment_method).toBe('paypal');
            expect(payment.status).toBe('completed');
            expect(payment.transaction_id).toBeUndefined();
            expect(payment.booking).toEqual({
                id: 1,
                user_id: undefined,
                space_id: undefined,
                booking_date: undefined,
                start_time: undefined,
                end_time: undefined
            });
        });

        it('should handle payment with null values', () => {
            const dataWithNulls = {
                payment_id: 1,
                booking_id: 1,
                amount: 75.50,
                payment_method: 'bank_transfer',
                status: 'completed',
                transaction_id: null,
                payment_date: null
            };

            const payment = new Payment(dataWithNulls);

            expect(payment.transaction_id).toBeNull();
            expect(payment.payment_date).toBeNull();
        });
    });

    describe('validatePaymentData', () => {
        it('should pass validation with valid payment data', () => {
            expect(() => {
                Payment.validatePaymentData(validPaymentData);
            }).not.toThrow();
        });

        it('should throw error if booking_id is missing', () => {
            const invalidData = { ...validPaymentData };
            delete invalidData.booking_id;

            expect(() => {
                Payment.validatePaymentData(invalidData);
            }).toThrow('booking_id, amount e payment_method sono obbligatori');
        });

        it('should throw error if amount is missing', () => {
            const invalidData = { ...validPaymentData };
            delete invalidData.amount;

            expect(() => {
                Payment.validatePaymentData(invalidData);
            }).toThrow('booking_id, amount e payment_method sono obbligatori');
        });

        it('should throw error if payment_method is missing', () => {
            const invalidData = { ...validPaymentData };
            delete invalidData.payment_method;

            expect(() => {
                Payment.validatePaymentData(invalidData);
            }).toThrow('booking_id, amount e payment_method sono obbligatori');
        });

        it('should validate amount is a positive number', () => {
            const validAmounts = [0.01, 1.00, 100.50, 999.99, 1000];

            validAmounts.forEach(amount => {
                const data = { ...validPaymentData, amount };
                expect(() => {
                    Payment.validatePaymentData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for zero amount (falsy check)', () => {
            // Zero amount fails the !amount check (falsy)
            const data = { amount: 0, booking_id: 1, payment_method: 'credit_card' };

            expect(() => {
                Payment.validatePaymentData(data);
            }).toThrow('booking_id, amount e payment_method sono obbligatori');
        });

        it('should throw error for negative amounts', () => {
            // Negative amounts pass !amount check but fail the number validation
            const negativeAmounts = [
                { amount: -10.00, booking_id: 1, payment_method: 'credit_card' },
                { amount: -0.01, booking_id: 1, payment_method: 'credit_card' }
            ];

            negativeAmounts.forEach(data => {
                expect(() => {
                    Payment.validatePaymentData(data);
                }).toThrow('L\'importo deve essere un numero positivo');
            });
        });

        it('should throw error for non-numeric amounts that pass truthy check', () => {
            // Non-empty strings pass the !amount check but fail isNaN
            const nonNumericAmounts = [
                { amount: 'not-a-number', booking_id: 1, payment_method: 'credit_card' },
                { amount: 'abc', booking_id: 1, payment_method: 'credit_card' },
                { amount: '0', booking_id: 1, payment_method: 'credit_card' } // String '0' passes !amount but is valid number
            ];

            nonNumericAmounts.forEach(data => {
                expect(() => {
                    Payment.validatePaymentData(data);
                }).toThrow(); // Will throw either required fields or number validation error
            });
        });

        it('should throw error for missing amounts', () => {
            // Test missing amounts (these fail the required field check)
            const missingAmounts = [
                { booking_id: 1, payment_method: 'credit_card' }, // amount undefined
                { amount: null, booking_id: 1, payment_method: 'credit_card' },
                { amount: undefined, booking_id: 1, payment_method: 'credit_card' },
                { amount: '', booking_id: 1, payment_method: 'credit_card' } // empty string is falsy
            ];

            missingAmounts.forEach(data => {
                expect(() => {
                    Payment.validatePaymentData(data);
                }).toThrow('booking_id, amount e payment_method sono obbligatori');
            });
        });

        it('should validate payment methods', () => {
            const validMethods = ['credit_card', 'paypal', 'bank_transfer', 'cash'];

            validMethods.forEach(method => {
                const data = { ...validPaymentData, payment_method: method };
                expect(() => {
                    Payment.validatePaymentData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for invalid payment method', () => {
            const invalidMethods = [
                { booking_id: 1, amount: 100, payment_method: 'bitcoin' },
                { booking_id: 1, amount: 100, payment_method: 'check' },
                { booking_id: 1, amount: 100, payment_method: 'gift_card' },
                { booking_id: 1, amount: 100, payment_method: 'invalid' }
            ];

            invalidMethods.forEach(data => {
                expect(() => {
                    Payment.validatePaymentData(data);
                }).toThrow('Metodo di pagamento non valido. Valori ammessi: credit_card, paypal, bank_transfer, cash');
            });
        });

        it('should validate payment statuses when provided', () => {
            const validStatuses = ['completed', 'failed', 'refunded'];

            validStatuses.forEach(status => {
                const data = { ...validPaymentData, status };
                expect(() => {
                    Payment.validatePaymentData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for invalid payment status', () => {
            const invalidStatuses = ['pending', 'processing', 'cancelled', 'invalid'];

            invalidStatuses.forEach(status => {
                const data = { ...validPaymentData, status };
                expect(() => {
                    Payment.validatePaymentData(data);
                }).toThrow('Stato non valido. Valori ammessi: completed, failed, refunded');
            });
        });

        it('should allow undefined status (uses default)', () => {
            const data = { ...validPaymentData };
            delete data.status;

            expect(() => {
                Payment.validatePaymentData(data);
            }).not.toThrow();
        });
    });

    describe('toJSON method', () => {
        it('should return complete JSON representation', () => {
            const payment = new Payment(mockExtendedPayment);
            const json = payment.toJSON();

            expect(json).toEqual({
                payment_id: 1,
                booking_id: 1,
                amount: 150.00,
                payment_date: '2024-01-15T10:00:00Z',
                payment_method: 'credit_card',
                status: 'completed',
                transaction_id: 'TXN_123456789',
                booking: {
                    id: 1,
                    user_id: 2,
                    space_id: 3,
                    booking_date: '2024-03-15',
                    start_time: '09:00',
                    end_time: '17:00'
                },
                space: {
                    name: 'Sala Conferenze A',
                    location_name: 'Milano Centro'
                },
                user: {
                    name: 'Mario',
                    surname: 'Rossi',
                    email: 'mario.rossi@example.com'
                }
            });
        });

        it('should parse amount as float', () => {
            const paymentWithStringAmount = new Payment({
                ...mockPayment,
                amount: '123.45'
            });

            const json = paymentWithStringAmount.toJSON();
            expect(json.amount).toBe(123.45);
            expect(typeof json.amount).toBe('number');
        });

        it('should handle null values in JSON', () => {
            const paymentWithNulls = new Payment({
                payment_id: 1,
                booking_id: 1,
                amount: 100.00,
                payment_date: null,
                payment_method: 'cash',
                status: 'completed',
                transaction_id: null
            });

            const json = paymentWithNulls.toJSON();

            expect(json.payment_date).toBeNull();
            expect(json.transaction_id).toBeNull();
            expect(json.space).toBeUndefined();
            expect(json.user).toBeUndefined();
        });
    });

    describe('payment methods and statuses', () => {
        it('should support all payment methods', () => {
            const methods = ['credit_card', 'paypal', 'bank_transfer', 'cash'];
            
            methods.forEach(method => {
                const payment = new Payment({
                    ...mockPayment,
                    payment_method: method
                });
                
                expect(payment.payment_method).toBe(method);
            });
        });

        it('should support all payment statuses', () => {
            const statuses = ['completed', 'failed', 'refunded'];
            
            statuses.forEach(status => {
                const payment = new Payment({
                    ...mockPayment,
                    status: status
                });
                
                expect(payment.status).toBe(status);
            });
        });
    });

    describe('amount handling', () => {
        it('should handle different amount formats', () => {
            const amounts = [
                { input: 10, expected: 10 },
                { input: 10.50, expected: 10.50 },
                { input: 0.01, expected: 0.01 },
                { input: 999.99, expected: 999.99 },
                { input: 1000, expected: 1000 }
            ];

            amounts.forEach(({ input, expected }) => {
                const payment = new Payment({
                    ...mockPayment,
                    amount: input
                });

                expect(payment.amount).toBe(expected);
            });
        });

        it('should handle large amounts', () => {
            const largeAmount = 99999.99;
            const payment = new Payment({
                ...mockPayment,
                amount: largeAmount
            });

            expect(payment.amount).toBe(largeAmount);
        });

        it('should handle decimal precision', () => {
            const preciseAmount = 123.456789;
            const payment = new Payment({
                ...mockPayment,
                amount: preciseAmount
            });

            // Amount should be stored as-is, precision handling in toJSON
            expect(payment.amount).toBe(preciseAmount);
            
            const json = payment.toJSON();
            expect(json.amount).toBe(123.456789);
        });
    });

    describe('transaction IDs', () => {
        it('should handle various transaction ID formats', () => {
            const transactionIds = [
                'TXN_123456789',
                'PAYPAL_ABC123XYZ',
                'STRIPE_pi_1234567890',
                'BT_2024_0001',
                'CASH_RECEIPT_001',
                '1234567890'
            ];

            transactionIds.forEach(transactionId => {
                const payment = new Payment({
                    ...mockPayment,
                    transaction_id: transactionId
                });

                expect(payment.transaction_id).toBe(transactionId);
            });
        });

        it('should handle null transaction ID', () => {
            const payment = new Payment({
                ...mockPayment,
                transaction_id: null
            });

            expect(payment.transaction_id).toBeNull();
        });
    });

    describe('relationships and joins', () => {
        it('should build booking relationship correctly', () => {
            const paymentWithBooking = new Payment({
                ...mockPayment,
                booking_user_id: 5,
                space_id: 10,
                booking_date: '2024-04-01',
                start_time: '14:00',
                end_time: '18:00'
            });

            expect(paymentWithBooking.booking).toEqual({
                id: 1,
                user_id: 5,
                space_id: 10,
                booking_date: '2024-04-01',
                start_time: '14:00',
                end_time: '18:00'
            });
        });

        it('should build space relationship correctly', () => {
            const paymentWithSpace = new Payment({
                ...mockPayment,
                space_name: 'Ufficio Privato',
                location_name: 'Roma Centro'
            });

            expect(paymentWithSpace.space).toEqual({
                name: 'Ufficio Privato',
                location_name: 'Roma Centro'
            });
        });

        it('should build user relationship correctly', () => {
            const paymentWithUser = new Payment({
                ...mockPayment,
                user_name: 'Giulia',
                user_surname: 'Bianchi',
                user_email: 'giulia.bianchi@test.com'
            });

            expect(paymentWithUser.user).toEqual({
                name: 'Giulia',
                surname: 'Bianchi',
                email: 'giulia.bianchi@test.com'
            });
        });

        it('should not create relationships when data is missing', () => {
            const simplePayment = new Payment({
                payment_id: 1,
                booking_id: 1,
                amount: 100.00,
                payment_method: 'cash',
                status: 'completed'
            });

            // Should still create booking object because booking_id exists
            expect(simplePayment.booking).toEqual({
                id: 1,
                user_id: undefined,
                space_id: undefined,
                booking_date: undefined,
                start_time: undefined,
                end_time: undefined
            });

            // But not space or user objects
            expect(simplePayment.space).toBeUndefined();
            expect(simplePayment.user).toBeUndefined();
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle very small amounts', () => {
            const smallAmount = 0.01;
            const payment = new Payment({
                ...mockPayment,
                amount: smallAmount
            });

            expect(payment.amount).toBe(0.01);
        });

        it('should handle empty and null transaction IDs', () => {
            const paymentEmptyTxn = new Payment({
                ...mockPayment,
                transaction_id: ''
            });

            const paymentNullTxn = new Payment({
                ...mockPayment,
                transaction_id: null
            });

            expect(paymentEmptyTxn.transaction_id).toBe('');
            expect(paymentNullTxn.transaction_id).toBeNull();
        });

        it('should handle special characters in transaction IDs', () => {
            const specialTxnIds = [
                'TXN-2024-01-15_001',
                'PAY@123#ABC',
                'STRIPE_π_special',
                'PAYMENT (REFUND) #123'
            ];

            specialTxnIds.forEach(txnId => {
                const payment = new Payment({
                    ...mockPayment,
                    transaction_id: txnId
                });

                expect(payment.transaction_id).toBe(txnId);
            });
        });

        it('should handle different date formats', () => {
            const dateFormats = [
                '2024-01-15T10:00:00Z',
                '2024-01-15T10:00:00.000Z',
                '2024-01-15 10:00:00',
                new Date().toISOString()
            ];

            dateFormats.forEach(date => {
                const payment = new Payment({
                    ...mockPayment,
                    payment_date: date
                });

                expect(payment.payment_date).toBe(date);
            });
        });
    });
});
