const NotificationService = require('../../../src/backend/services/NotificationService');
const Notification = require('../../../src/backend/models/Notification');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const admin = require('../../../src/backend/config/firebase');

// Mocks
jest.mock('../../../src/backend/models/Notification');
jest.mock('nodemailer');
jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        readFile: jest.fn()
    }
}));
jest.mock('../../../src/backend/config/firebase', () => ({
    messaging: jest.fn()
}));

describe('NotificationService', () => {
    let mockTransporter;
    let mockNotification;
    let mockUser;
    let mockBooking;
    let mockSpace;
    let mockPayment;
    let mockMessaging;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock del transporter nodemailer
        mockTransporter = {
            sendMail: jest.fn()
        };
        nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

        // Mock della notificazione
        mockNotification = {
            notification_id: 1,
            user_id: 1,
            type: 'email',
            subject: 'Test Subject',
            content: 'Test Content',
            status: 'pending'
        };

        // Mock dell'utente
        mockUser = {
            user_id: 1,
            name: 'Mario',
            surname: 'Rossi',
            email: 'mario.rossi@example.com',
            fcm_token: 'test_fcm_token'
        };

        // Mock della prenotazione
        mockBooking = {
            booking_id: 1,
            user_id: 1,
            space_id: 1,
            start_date: '2025-09-10',
            end_date: '2025-09-12',
            total_amount: 150.00,
            space_name: 'Ufficio 1',
            location_name: 'Centro Milano'
        };

        // Mock dello spazio
        mockSpace = {
            space_id: 1,
            name: 'Ufficio 1',
            location_name: 'Centro Milano'
        };

        // Mock del pagamento
        mockPayment = {
            payment_id: 1,
            booking_id: 1,
            amount: 150.00,
            payment_method: 'card'
        };

        // Mock Firebase messaging - creiamo un mock persistente
        mockMessaging = {
            send: jest.fn()
        };
        admin.messaging.mockReturnValue(mockMessaging);

        // Reset environment variables
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASS;
        delete process.env.EMAIL_FROM;
    });

    describe('createTransporter', () => {
        it('should create test transporter when email credentials are missing', () => {
            const transporter = NotificationService.createTransporter();
            expect(transporter).toHaveProperty('sendMail');
            expect(typeof transporter.sendMail).toBe('function');
        });

        it('should create nodemailer transporter when credentials are present', () => {
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASS = 'password';
            
            const mockCreate = jest.fn().mockReturnValue(mockTransporter);
            nodemailer.createTransport = mockCreate;

            NotificationService.createTransporter();

            expect(mockCreate).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: 'test@example.com',
                    pass: 'password'
                }
            });
        });
    });

    describe('renderTemplate', () => {
        it('should render template with data replacement', async () => {
            const templateContent = '<h1>Hello {{userName}}</h1><p>{{message}}</p>';
            const templateData = {
                userName: 'Mario',
                message: 'Welcome to CoWorkSpace'
            };

            fs.access.mockResolvedValue();
            fs.readFile.mockResolvedValue(templateContent);

            const result = await NotificationService.renderTemplate('welcome', templateData);

            expect(result).toBe('<h1>Hello Mario</h1><p>Welcome to CoWorkSpace</p>');
            expect(fs.readFile).toHaveBeenCalledWith(
                expect.stringContaining('welcome.html'),
                'utf-8'
            );
        });

        it('should return default template when file does not exist', async () => {
            const templateData = {
                userName: 'Mario',
                subject: 'Test Subject',
                message: 'Test message'
            };

            fs.access.mockRejectedValue(new Error('File not found'));

            const result = await NotificationService.renderTemplate('nonexistent', templateData);

            expect(result).toContain('Mario');
            expect(result).toContain('Test Subject');
            expect(result).toContain('Test message');
        });

        it('should handle template rendering errors gracefully', async () => {
            fs.access.mockResolvedValue();
            fs.readFile.mockRejectedValue(new Error('Read error'));

            const result = await NotificationService.renderTemplate('test', { userName: 'Mario' });

            expect(result).toContain('Mario');
            expect(result).toContain('CoWorkSpace');
        });
    });

    describe('sendEmail', () => {
        beforeEach(() => {
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_FROM = 'noreply@coworkspace.com';
            
            // Override del createTransporter per i test
            jest.spyOn(NotificationService, 'createTransporter')
                .mockReturnValue(mockTransporter);
        });

        it('should send email successfully', async () => {
            const emailData = {
                recipient: 'user@example.com',
                subject: 'Test Subject',
                templateName: 'test_template',
                templateData: { userName: 'Mario' },
                user_id: 1
            };

            const mockInfo = {
                messageId: 'test-message-id',
                accepted: ['user@example.com']
            };

            // Mock template rendering
            jest.spyOn(NotificationService, 'renderTemplate')
                .mockResolvedValue('<h1>Test Email</h1>');
            
            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockResolvedValue(mockInfo);
            Notification.updateStatus.mockResolvedValue();

            const result = await NotificationService.sendEmail(emailData);

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('test-message-id');
            expect(result.notification_id).toBe(1);
            expect(Notification.create).toHaveBeenCalledWith({
                user_id: 1,
                type: 'email',
                channel: 'test_template',
                recipient: 'user@example.com',
                subject: 'Test Subject',
                content: '<h1>Test Email</h1>',
                template_name: 'test_template',
                template_data: { userName: 'Mario' },
                status: 'pending',
                booking_id: undefined,
                payment_id: undefined
            });
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'sent', {
                message_id: 'test-message-id',
                accepted: ['user@example.com']
            });
        });

        it('should handle email sending failure', async () => {
            const emailData = {
                recipient: 'user@example.com',
                subject: 'Test Subject',
                templateName: 'test_template',
                templateData: { userName: 'Mario' },
                user_id: 1
            };

            jest.spyOn(NotificationService, 'renderTemplate')
                .mockResolvedValue('<h1>Test Email</h1>');
            
            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));
            Notification.updateStatus.mockResolvedValue();

            const result = await NotificationService.sendEmail(emailData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('SMTP Error');
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'failed', {
                error: 'SMTP Error'
            });
        });
    });

    describe('sendPushNotification', () => {
        it('should send push notification successfully', async () => {
            const pushData = {
                fcmToken: 'test_fcm_token',
                title: 'Test Title',
                body: 'Test Body',
                data: { key: 'value' },
                user_id: 1
            };

            const mockResponse = 'projects/test/messages/12345';

            Notification.create.mockResolvedValue(mockNotification);
            mockMessaging.send.mockResolvedValue(mockResponse);
            Notification.updateStatus.mockResolvedValue();

            const result = await NotificationService.sendPushNotification(pushData);

            expect(result.success).toBe(true);
            expect(result.notification_id).toBe(1);
            expect(mockMessaging.send).toHaveBeenCalledWith({
                token: 'test_fcm_token',
                notification: { title: 'Test Title', body: 'Test Body' },
                data: { key: 'value' }
            });
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'sent', {
                fcmResponse: mockResponse
            });
        });

        it('should handle missing FCM token', async () => {
            const result = await NotificationService.sendPushNotification({
                title: 'Test',
                body: 'Test',
                user_id: 1
            });

            expect(result.success).toBe(false);
            expect(result.reason).toBe('missing_fcm_token');
        });

        it('should handle push notification failure', async () => {
            const pushData = {
                fcmToken: 'test_fcm_token',
                title: 'Test Title',
                body: 'Test Body',
                user_id: 1
            };

            Notification.create.mockResolvedValue(mockNotification);
            mockMessaging.send.mockRejectedValue(new Error('FCM Error'));
            Notification.updateStatus.mockResolvedValue();

            const result = await NotificationService.sendPushNotification(pushData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('FCM Error');
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'failed', {
                error: 'FCM Error'
            });
        });
    });

    describe('sendBookingConfirmation', () => {
        it('should send booking confirmation email and push', async () => {
            jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });
            jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({
                success: true
            });

            const result = await NotificationService.sendBookingConfirmation(
                mockBooking, mockUser, mockSpace
            );

            expect(NotificationService.sendEmail).toHaveBeenCalledWith({
                recipient: 'mario.rossi@example.com',
                subject: 'Conferma Prenotazione #1',
                templateName: 'booking_confirmation',
                templateData: expect.objectContaining({
                    userName: 'Mario Rossi',
                    bookingId: 1,
                    spaceName: 'Ufficio 1',
                    locationName: 'Centro Milano'
                }),
                user_id: 1,
                booking_id: 1
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendBookingCancellation', () => {
        it('should send booking cancellation email and push', async () => {
            jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });
            jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({
                success: true
            });

            const result = await NotificationService.sendBookingCancellation(
                mockBooking, mockUser, mockSpace
            );

            expect(NotificationService.sendEmail).toHaveBeenCalledWith({
                recipient: 'mario.rossi@example.com',
                subject: 'Cancellazione Prenotazione #1',
                templateName: 'booking_cancellation',
                templateData: expect.objectContaining({
                    userName: 'Mario Rossi',
                    bookingId: 1,
                    spaceName: 'Ufficio 1'
                }),
                user_id: 1,
                booking_id: 1
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendPaymentSuccess', () => {
        it('should send payment success email and push', async () => {
            jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });
            jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({
                success: true
            });

            const result = await NotificationService.sendPaymentSuccess(
                mockPayment, mockBooking, mockUser, mockSpace
            );

            expect(NotificationService.sendEmail).toHaveBeenCalledWith({
                recipient: 'mario.rossi@example.com',
                subject: 'Pagamento Confermato #1',
                templateName: 'payment_success',
                templateData: expect.objectContaining({
                    userName: 'Mario Rossi',
                    paymentId: 1,
                    amount: '€150',
                    paymentMethod: 'card'
                }),
                user_id: 1,
                booking_id: 1,
                payment_id: 1
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendUserRegistration', () => {
        it('should send user registration email and push', async () => {
            jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });
            jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({
                success: true
            });

            const result = await NotificationService.sendUserRegistration(mockUser);

            expect(NotificationService.sendEmail).toHaveBeenCalledWith({
                recipient: 'mario.rossi@example.com',
                subject: 'Benvenuto in CoWorkSpace, Mario!',
                templateName: 'user_registration',
                templateData: expect.objectContaining({
                    userName: 'Mario Rossi',
                    email: 'mario.rossi@example.com'
                }),
                user_id: 1
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendPasswordReset', () => {
        it('should send password reset email and push', async () => {
            jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });
            jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({
                success: true
            });

            const result = await NotificationService.sendPasswordReset(mockUser, 'temp123');

            expect(NotificationService.sendEmail).toHaveBeenCalledWith({
                recipient: 'mario.rossi@example.com',
                subject: 'Reset Password - CoWorkSpace',
                templateName: 'password_reset',
                templateData: expect.objectContaining({
                    userName: 'Mario Rossi',
                    tempPassword: 'temp123'
                }),
                user_id: 1
            });

            expect(result.success).toBe(true);
        });
    });

    describe('getUserNotifications', () => {
        it('should get user notifications', async () => {
            const mockNotifications = [mockNotification];
            Notification.findByUserId.mockResolvedValue(mockNotifications);

            const result = await NotificationService.getUserNotifications(1, { type: 'email' });

            expect(result).toEqual(mockNotifications);
            expect(Notification.findByUserId).toHaveBeenCalledWith(1, { type: 'email' });
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            Notification.markAsRead.mockResolvedValue(true);

            const result = await NotificationService.markAsRead(1, 1);

            expect(result).toBe(true);
            expect(Notification.markAsRead).toHaveBeenCalledWith(1, 1);
        });
    });
});
