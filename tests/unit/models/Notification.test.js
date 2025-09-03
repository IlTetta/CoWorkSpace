// tests/unit/models/Notification.test.js
const Notification = require('../../../src/backend/models/Notification');
const AppError = require('../../../src/backend/utils/AppError');

// Mock del database
jest.mock('../../../src/backend/config/db', () => ({
    query: jest.fn()
}));

describe('Notification Model', () => {
    const validNotificationData = {
        user_id: 1,
        type: 'email',
        channel: 'booking_confirmation',
        recipient: 'test@example.com',
        subject: 'Booking Confirmed',
        content: 'Your booking has been confirmed',
        template_name: 'booking_confirmation',
        template_data: { bookingId: 123 },
        status: 'pending',
        metadata: { priority: 'high' },
        booking_id: 123,
        payment_id: 456
    };

    const mockNotification = {
        notification_id: 1,
        ...validNotificationData,
        sent_at: null,
        delivered_at: null,
        read_at: null,
        error_message: null,
        retry_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.log e console.error per evitare output durante i test
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
        console.error.mockRestore();
    });

    describe('constructor', () => {
        it('should create notification instance with all properties', () => {
            const notification = new Notification(mockNotification);

            expect(notification.notification_id).toBe(1);
            expect(notification.user_id).toBe(1);
            expect(notification.type).toBe('email');
            expect(notification.channel).toBe('booking_confirmation');
            expect(notification.recipient).toBe('test@example.com');
            expect(notification.subject).toBe('Booking Confirmed');
            expect(notification.content).toBe('Your booking has been confirmed');
            expect(notification.template_name).toBe('booking_confirmation');
            expect(notification.status).toBe('pending');
            expect(notification.booking_id).toBe(123);
            expect(notification.payment_id).toBe(456);
            expect(notification.retry_count).toBe(0);
        });

        it('should handle minimal notification data', () => {
            const minimalData = {
                notification_id: 1,
                user_id: 1,
                type: 'email',
                channel: 'booking_confirmation',
                recipient: 'test@example.com'
            };

            const notification = new Notification(minimalData);

            expect(notification.notification_id).toBe(1);
            expect(notification.user_id).toBe(1);
            expect(notification.type).toBe('email');
            expect(notification.channel).toBe('booking_confirmation');
            expect(notification.recipient).toBe('test@example.com');
            expect(notification.subject).toBeUndefined();
            expect(notification.content).toBeUndefined();
        });

        it('should handle notification with null values', () => {
            const dataWithNulls = {
                notification_id: 1,
                user_id: 1,
                type: 'email',
                channel: 'booking_confirmation',
                recipient: 'test@example.com',
                subject: null,
                content: null,
                booking_id: null,
                payment_id: null,
                sent_at: null,
                delivered_at: null,
                read_at: null,
                error_message: null
            };

            const notification = new Notification(dataWithNulls);

            expect(notification.subject).toBeNull();
            expect(notification.content).toBeNull();
            expect(notification.booking_id).toBeNull();
            expect(notification.payment_id).toBeNull();
            expect(notification.sent_at).toBeNull();
            expect(notification.delivered_at).toBeNull();
            expect(notification.read_at).toBeNull();
            expect(notification.error_message).toBeNull();
        });
    });

    describe('validateNotificationData', () => {
        it('should pass validation with valid notification data', () => {
            expect(() => {
                Notification.validateNotificationData(validNotificationData);
            }).not.toThrow();
        });

        it('should throw error if user_id is missing', () => {
            const invalidData = { ...validNotificationData };
            delete invalidData.user_id;

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('user_id, type, channel e recipient sono obbligatori');
        });

        it('should throw error if type is missing', () => {
            const invalidData = { ...validNotificationData };
            delete invalidData.type;

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('user_id, type, channel e recipient sono obbligatori');
        });

        it('should throw error if channel is missing', () => {
            const invalidData = { ...validNotificationData };
            delete invalidData.channel;

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('user_id, type, channel e recipient sono obbligatori');
        });

        it('should throw error if recipient is missing', () => {
            const invalidData = { ...validNotificationData };
            delete invalidData.recipient;

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('user_id, type, channel e recipient sono obbligatori');
        });

        it('should validate notification types', () => {
            const validTypes = ['email', 'push', 'sms'];

            validTypes.forEach(type => {
                const data = { ...validNotificationData, type };
                expect(() => {
                    Notification.validateNotificationData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for invalid notification type', () => {
            const invalidData = { ...validNotificationData, type: 'invalid_type' };

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('Tipo notifica non valido. Valori ammessi: email, push, sms');
        });

        it('should validate notification channels', () => {
            const validChannels = [
                'booking_confirmation',
                'booking_cancellation',
                'payment_success',
                'payment_failed',
                'payment_refund',
                'booking_reminder',
                'user_registration',
                'password_reset'
            ];

            validChannels.forEach(channel => {
                const data = { ...validNotificationData, channel };
                expect(() => {
                    Notification.validateNotificationData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for invalid notification channel', () => {
            const invalidData = { ...validNotificationData, channel: 'invalid_channel' };

            expect(() => {
                Notification.validateNotificationData(invalidData);
            }).toThrow('Channel non valido');
        });

        it('should validate email format for email notifications', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.com',
                'user+tag@example.org',
                'test123@test-domain.co.uk'
            ];

            validEmails.forEach(email => {
                const data = { ...validNotificationData, type: 'email', recipient: email };
                expect(() => {
                    Notification.validateNotificationData(data);
                }).not.toThrow();
            });
        });

        it('should throw error for invalid email format', () => {
            const invalidEmails = [
                'invalid-email',
                '@example.com', 
                'test@',
                'test@.com'
            ];

            invalidEmails.forEach(email => {
                const data = { ...validNotificationData, type: 'email', recipient: email };
                expect(() => {
                    Notification.validateNotificationData(data);
                }).toThrow('Formato email non valido');
            });
        });

        it('should handle edge case emails that pass basic regex', () => {
            // This email passes the basic regex but might not be ideal
            const edgeCaseEmails = [
                'test..test@example.com' // Double dot - passes regex but not ideal
            ];

            edgeCaseEmails.forEach(email => {
                const data = { ...validNotificationData, type: 'email', recipient: email };
                // The current regex allows this, so it should not throw
                expect(() => {
                    Notification.validateNotificationData(data);
                }).not.toThrow();
            });
        });

        it('should not validate format for non-email notifications', () => {
            const data = { 
                ...validNotificationData, 
                type: 'push', 
                recipient: 'device-token-123' 
            };

            expect(() => {
                Notification.validateNotificationData(data);
            }).not.toThrow();
        });

        it('should not validate format for sms notifications', () => {
            const data = { 
                ...validNotificationData, 
                type: 'sms', 
                recipient: '+393123456789' 
            };

            expect(() => {
                Notification.validateNotificationData(data);
            }).not.toThrow();
        });
    });

    describe('toJSON method', () => {
        it('should return complete JSON representation', () => {
            const notification = new Notification(mockNotification);
            const json = notification.toJSON();

            expect(json).toEqual({
                notification_id: 1,
                user_id: 1,
                type: 'email',
                channel: 'booking_confirmation',
                recipient: 'test@example.com',
                subject: 'Booking Confirmed',
                content: 'Your booking has been confirmed',
                template_name: 'booking_confirmation',
                template_data: { bookingId: 123 },
                status: 'pending',
                metadata: { priority: 'high' },
                booking_id: 123,
                payment_id: 456,
                sent_at: null,
                delivered_at: null,
                read_at: null,
                error_message: null,
                retry_count: 0,
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z'
            });
        });

        it('should handle null values in JSON', () => {
            const notificationWithNulls = new Notification({
                notification_id: 1,
                user_id: 1,
                type: 'email',
                channel: 'booking_confirmation',
                recipient: 'test@example.com',
                subject: null,
                content: null,
                template_name: null,
                template_data: null,
                status: 'pending',
                metadata: null,
                booking_id: null,
                payment_id: null,
                sent_at: null,
                delivered_at: null,
                read_at: null,
                error_message: null,
                retry_count: 0
            });

            const json = notificationWithNulls.toJSON();

            expect(json.subject).toBeNull();
            expect(json.content).toBeNull();
            expect(json.template_name).toBeNull();
            expect(json.template_data).toBeNull();
            expect(json.metadata).toBeNull();
            expect(json.booking_id).toBeNull();
            expect(json.payment_id).toBeNull();
        });
    });

    describe('notification types and channels', () => {
        it('should support all notification types', () => {
            const types = ['email', 'push', 'sms'];
            
            types.forEach(type => {
                const notification = new Notification({
                    ...mockNotification,
                    type: type
                });
                
                expect(notification.type).toBe(type);
            });
        });

        it('should support all notification channels', () => {
            const channels = [
                'booking_confirmation',
                'booking_cancellation',
                'payment_success',
                'payment_failed',
                'payment_refund',
                'booking_reminder',
                'user_registration',
                'password_reset'
            ];
            
            channels.forEach(channel => {
                const notification = new Notification({
                    ...mockNotification,
                    channel: channel
                });
                
                expect(notification.channel).toBe(channel);
            });
        });

        it('should support different notification statuses', () => {
            const statuses = ['pending', 'sent', 'delivered', 'read', 'failed'];
            
            statuses.forEach(status => {
                const notification = new Notification({
                    ...mockNotification,
                    status: status
                });
                
                expect(notification.status).toBe(status);
            });
        });
    });

    describe('template data handling', () => {
        it('should handle complex template data', () => {
            const complexTemplateData = {
                bookingId: 123,
                userName: 'Mario Rossi',
                spaceName: 'Sala Conferenze A',
                startDate: '2024-03-15',
                startTime: '09:00',
                endTime: '17:00',
                totalPrice: 150.00,
                additionalServices: ['Proiettore', 'Caffè']
            };

            const notification = new Notification({
                ...mockNotification,
                template_data: complexTemplateData
            });

            expect(notification.template_data).toEqual(complexTemplateData);
        });

        it('should handle metadata object', () => {
            const metadata = {
                priority: 'high',
                category: 'booking',
                source: 'web_app',
                retry_strategy: 'exponential_backoff',
                custom_data: {
                    location: 'Milano Centro',
                    device_type: 'desktop'
                }
            };

            const notification = new Notification({
                ...mockNotification,
                metadata: metadata
            });

            expect(notification.metadata).toEqual(metadata);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle very long content', () => {
            const longContent = 'A'.repeat(5000);
            
            const notification = new Notification({
                ...mockNotification,
                content: longContent
            });

            expect(notification.content).toBe(longContent);
            expect(notification.content.length).toBe(5000);
        });

        it('should handle unicode characters in content', () => {
            const unicodeContent = 'Ciao! 👋 La tua prenotazione è confermata ✅ Spazio: Café Meeting Room 🍕';
            
            const notification = new Notification({
                ...mockNotification,
                content: unicodeContent
            });

            expect(notification.content).toBe(unicodeContent);
        });

        it('should handle special characters in recipient', () => {
            const specialEmail = 'user+tag@domain-name.co.uk';
            
            const notification = new Notification({
                ...mockNotification,
                recipient: specialEmail
            });

            expect(notification.recipient).toBe(specialEmail);
        });

        it('should handle empty template data', () => {
            const notification = new Notification({
                ...mockNotification,
                template_data: {}
            });

            expect(notification.template_data).toEqual({});
        });

        it('should handle large retry count', () => {
            const notification = new Notification({
                ...mockNotification,
                retry_count: 99
            });

            expect(notification.retry_count).toBe(99);
        });
    });

    describe('relationships and references', () => {
        it('should maintain booking relationship', () => {
            const notification = new Notification({
                ...mockNotification,
                booking_id: 789,
                channel: 'booking_confirmation'
            });

            expect(notification.booking_id).toBe(789);
            expect(notification.channel).toBe('booking_confirmation');
        });

        it('should maintain payment relationship', () => {
            const notification = new Notification({
                ...mockNotification,
                payment_id: 456,
                channel: 'payment_success'
            });

            expect(notification.payment_id).toBe(456);
            expect(notification.channel).toBe('payment_success');
        });

        it('should handle notifications without relationships', () => {
            const notification = new Notification({
                ...mockNotification,
                booking_id: null,
                payment_id: null,
                channel: 'password_reset'
            });

            expect(notification.booking_id).toBeNull();
            expect(notification.payment_id).toBeNull();
            expect(notification.channel).toBe('password_reset');
        });
    });

    describe('timestamp handling', () => {
        it('should handle all timestamp fields', () => {
            const now = new Date().toISOString();
            
            const notification = new Notification({
                ...mockNotification,
                sent_at: now,
                delivered_at: now,
                read_at: now,
                created_at: now,
                updated_at: now
            });

            expect(notification.sent_at).toBe(now);
            expect(notification.delivered_at).toBe(now);
            expect(notification.read_at).toBe(now);
            expect(notification.created_at).toBe(now);
            expect(notification.updated_at).toBe(now);
        });

        it('should handle null timestamps for pending notifications', () => {
            const notification = new Notification({
                ...mockNotification,
                status: 'pending',
                sent_at: null,
                delivered_at: null,
                read_at: null
            });

            expect(notification.status).toBe('pending');
            expect(notification.sent_at).toBeNull();
            expect(notification.delivered_at).toBeNull();
            expect(notification.read_at).toBeNull();
        });
    });
});
