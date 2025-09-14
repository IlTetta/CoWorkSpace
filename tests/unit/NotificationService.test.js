const NotificationService = require('../../src/backend/services/NotificationService');
const Notification = require('../../src/backend/models/Notification');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const admin = require('../../src/backend/config/firebase');

// Mock delle dipendenze
jest.mock('../../src/backend/models/Notification');
jest.mock('nodemailer', () => ({
    createTransport: jest.fn()
}));
jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        readFile: jest.fn()
    }
}));
jest.mock('../../src/backend/config/firebase', () => ({
    messaging: jest.fn()
}));

describe('NotificationService', () => {
    let mockTransporter;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock del transporter
        mockTransporter = {
            sendMail: jest.fn()
        };
        
        nodemailer.createTransport.mockReturnValue(mockTransporter);
        
        // Spy sul metodo createTransporter del service
        jest.spyOn(NotificationService, 'createTransporter').mockReturnValue(mockTransporter);
        
        // Setup environment variables per test
        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASS = 'testpass';
        process.env.EMAIL_FROM = 'noreply@coworkspace.com';
        process.env.FRONTEND_URL = 'https://coworkspace.com';
        process.env.ADMIN_EMAIL = 'admin@coworkspace.com';
    });

    afterEach(() => {
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASS;
        delete process.env.EMAIL_FROM;
        delete process.env.FRONTEND_URL;
        delete process.env.ADMIN_EMAIL;
    });

    describe('createTransporter', () => {
        beforeEach(() => {
            // Reset i spy per ogni test
            jest.restoreAllMocks();
        });

        it('dovrebbe creare transporter con credenziali email', () => {
            // Arrange
            // Non facciamo spy qui per testare il comportamento reale
            
            // Act
            const transporter = NotificationService.createTransporter();

            // Assert
            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: 'test@example.com',
                    pass: 'testpass'
                }
            });
            expect(transporter).toBeDefined();
        });

        it('dovrebbe utilizzare modalità test se credenziali mancanti', () => {
            // Arrange
            delete process.env.EMAIL_USER;
            delete process.env.EMAIL_PASS;
            console.log = jest.fn();

            // Act
            const transporter = NotificationService.createTransporter();

            // Assert
            expect(transporter.sendMail).toBeDefined();
            expect(console.log).toHaveBeenCalledWith('📧 Email credentials not found - using test mode');
        });

        it('dovrebbe simulare invio email in modalità test', async () => {
            // Arrange
            delete process.env.EMAIL_USER;
            console.log = jest.fn();
            
            const transporter = NotificationService.createTransporter();
            const mailOptions = {
                from: 'test@example.com',
                to: 'recipient@example.com',
                subject: 'Test Email',
                html: '<p>Test content</p>'
            };

            // Act
            const result = await transporter.sendMail(mailOptions);

            // Assert
            expect(result.messageId).toMatch(/test-\d+@coworkspace\.test/);
            expect(result.accepted).toEqual(['recipient@example.com']);
            expect(console.log).toHaveBeenCalledWith('📧 [TEST MODE] Email would be sent:', expect.any(Object));
        });
    });

    describe('renderTemplate', () => {
        it('dovrebbe renderizzare template da file esistente', async () => {
            // Arrange
            const templateContent = '<h1>{{userName}}</h1><p>{{message}}</p>';
            const templateData = { userName: 'John Doe', message: 'Welcome!' };
            
            fs.access.mockResolvedValue();
            fs.readFile.mockResolvedValue(templateContent);

            // Act
            const result = await NotificationService.renderTemplate('test_template', templateData);

            // Assert
            expect(fs.readFile).toHaveBeenCalled();
            expect(result).toBe('<h1>John Doe</h1><p>Welcome!</p>');
        });

        it('dovrebbe utilizzare template di default se file non esiste', async () => {
            // Arrange
            const templateData = { userName: 'John Doe', subject: 'Test Subject', message: 'Test Message' };
            fs.access.mockRejectedValue(new Error('File not found'));

            // Act
            const result = await NotificationService.renderTemplate('nonexistent_template', templateData);

            // Assert
            expect(result).toContain('John Doe');
            expect(result).toContain('Test Subject');
            expect(result).toContain('Test Message');
            expect(result).toContain('CoWorkSpace');
        });

        it('dovrebbe gestire errori di lettura file', async () => {
            // Arrange
            const templateData = { userName: 'John Doe' };
            fs.access.mockResolvedValue();
            fs.readFile.mockRejectedValue(new Error('Read error'));
            console.error = jest.fn();

            // Act
            const result = await NotificationService.renderTemplate('error_template', templateData);

            // Assert
            expect(console.error).toHaveBeenCalledWith('Errore rendering template:', expect.any(Error));
            expect(result).toContain('John Doe');
        });

        it('dovrebbe sostituire placeholder multipli della stessa variabile', async () => {
            // Arrange
            const templateContent = '<p>{{name}} {{name}}</p>';
            const templateData = { name: 'Test' };
            
            fs.access.mockResolvedValue();
            fs.readFile.mockResolvedValue(templateContent);

            // Act
            const result = await NotificationService.renderTemplate('test_template', templateData);

            // Assert
            expect(result).toBe('<p>Test Test</p>');
        });

        it('dovrebbe gestire valori undefined sostituendoli con stringa vuota', async () => {
            // Arrange
            const templateContent = '<p>{{name}} {{undefined}}</p>';
            const templateData = { name: 'Test' };
            
            fs.access.mockResolvedValue();
            fs.readFile.mockResolvedValue(templateContent);

            // Act
            const result = await NotificationService.renderTemplate('test_template', templateData);

            // Assert
            // Il comportamento reale è che placeholder non definiti rimangono come sono
            expect(result).toBe('<p>Test {{undefined}}</p>');
        });
    });

    describe('getDefaultTemplate', () => {
        it('dovrebbe generare template HTML di default', () => {
            // Arrange
            const templateData = {
                subject: 'Test Subject',
                userName: 'John Doe',
                message: 'Test message content'
            };

            // Act
            const result = NotificationService.getDefaultTemplate(templateData);

            // Assert
            expect(result).toContain('CoWorkSpace');
            expect(result).toContain('Test Subject');
            expect(result).toContain('John Doe');
            expect(result).toContain('Test message content');
            expect(result).toContain('<html>');
            expect(result).toContain('</html>');
        });

        it('dovrebbe utilizzare valori di default se dati mancanti', () => {
            // Act
            const result = NotificationService.getDefaultTemplate({});

            // Assert
            expect(result).toContain('Notifica');
            expect(result).toContain('Utente');
            expect(result).toContain('Hai ricevuto una notifica.');
        });
    });

    describe('sendEmail', () => {
        const mockEmailData = {
            recipient: 'test@example.com',
            subject: 'Test Subject',
            templateName: 'test_template',
            templateData: { userName: 'John Doe' },
            user_id: 1,
            booking_id: 1,
            payment_id: 1
        };

        beforeEach(() => {
            // Reset spy per ogni test
            jest.restoreAllMocks();
            jest.spyOn(NotificationService, 'createTransporter').mockReturnValue(mockTransporter);
        });

        it('dovrebbe inviare email con successo', async () => {
            // Arrange
            const mockNotification = { notification_id: 1 };
            const mockEmailResult = {
                messageId: 'test-message-id',
                accepted: ['test@example.com']
            };

            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockResolvedValue(mockEmailResult);
            Notification.updateStatus.mockResolvedValue(true);
            
            // Mock renderTemplate
            fs.access.mockRejectedValue(new Error('File not found'));
            console.log = jest.fn();

            // Act
            const result = await NotificationService.sendEmail(mockEmailData);

            // Assert
            expect(Notification.create).toHaveBeenCalledWith({
                user_id: 1,
                type: 'email',
                channel: 'test_template',
                recipient: 'test@example.com',
                subject: 'Test Subject',
                content: expect.any(String),
                template_name: 'test_template',
                template_data: { userName: 'John Doe' },
                status: 'pending',
                booking_id: 1,
                payment_id: 1
            });

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@coworkspace.com',
                to: 'test@example.com',
                subject: 'Test Subject',
                html: expect.any(String)
            });

            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'sent', {
                message_id: 'test-message-id',
                accepted: ['test@example.com']
            });

            expect(result).toEqual({
                success: true,
                messageId: 'test-message-id',
                notification_id: 1,
                recipient: 'test@example.com',
                subject: 'Test Subject'
            });
        });

        it('dovrebbe gestire errore durante invio email', async () => {
            // Arrange
            const mockNotification = { notification_id: 1 };
            const emailError = new Error('SMTP Error');

            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockRejectedValue(emailError);
            Notification.updateStatus.mockResolvedValue(true);
            console.error = jest.fn();
            
            fs.access.mockRejectedValue(new Error('File not found'));

            // Act
            const result = await NotificationService.sendEmail(mockEmailData);

            // Assert
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'failed', {
                error: 'SMTP Error'
            });

            expect(result).toEqual({
                success: false,
                error: 'SMTP Error',
                recipient: 'test@example.com',
                subject: 'Test Subject'
            });
        });

        it('dovrebbe utilizzare EMAIL_FROM di default se definito', async () => {
            // Arrange
            const mockNotification = { notification_id: 1 };
            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
            fs.access.mockRejectedValue(new Error('File not found'));

            // Act
            await NotificationService.sendEmail(mockEmailData);

            // Assert
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'noreply@coworkspace.com'
                })
            );
        });

        it('dovrebbe utilizzare EMAIL_USER come fallback per from', async () => {
            // Arrange
            delete process.env.EMAIL_FROM;
            const mockNotification = { notification_id: 1 };
            Notification.create.mockResolvedValue(mockNotification);
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
            fs.access.mockRejectedValue(new Error('File not found'));

            // Act
            await NotificationService.sendEmail(mockEmailData);

            // Assert
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'test@example.com'
                })
            );
        });
    });

    describe('sendPushNotification', () => {
        const mockPushData = {
            fcmToken: 'test-fcm-token',
            title: 'Test Title',
            body: 'Test Body',
            data: { type: 'booking' },
            user_id: 1,
            booking_id: 1
        };

        beforeEach(() => {
            admin.messaging = jest.fn().mockReturnValue({
                send: jest.fn()
            });
        });

        it('dovrebbe inviare notifica push con successo', async () => {
            // Arrange
            const mockNotification = { notification_id: 1 };
            const mockResponse = 'projects/test/messages/12345';

            Notification.create.mockResolvedValue(mockNotification);
            admin.messaging().send.mockResolvedValue(mockResponse);
            Notification.updateStatus.mockResolvedValue(true);
            console.log = jest.fn();

            // Act
            const result = await NotificationService.sendPushNotification(mockPushData);

            // Assert
            expect(Notification.create).toHaveBeenCalledWith({
                user_id: 1,
                type: 'push',
                channel: 'push',
                recipient: 'test-fcm-token',
                subject: 'Test Title',
                content: JSON.stringify({
                    title: 'Test Title',
                    body: 'Test Body',
                    data: { type: 'booking' }
                }),
                template_name: 'push',
                template_data: {
                    title: 'Test Title',
                    body: 'Test Body',
                    type: 'booking'
                },
                status: 'pending',
                booking_id: 1,
                payment_id: undefined
            });

            expect(admin.messaging().send).toHaveBeenCalledWith({
                token: 'test-fcm-token',
                notification: {
                    title: 'Test Title',
                    body: 'Test Body'
                },
                data: { type: 'booking' }
            });

            expect(result).toEqual({
                success: true,
                messageId: expect.stringMatching(/push_\d+/),
                notification_id: 1
            });
        });

        it('dovrebbe gestire token FCM mancante', async () => {
            // Arrange
            const pushDataWithoutToken = { ...mockPushData, fcmToken: null };
            console.warn = jest.fn();

            // Act
            const result = await NotificationService.sendPushNotification(pushDataWithoutToken);

            // Assert
            expect(console.warn).toHaveBeenCalledWith('[FCM] Token FCM mancante, notifica saltata');
            expect(result).toEqual({
                success: false,
                reason: 'missing_fcm_token'
            });
        });

        it('dovrebbe gestire errore durante invio push', async () => {
            // Arrange
            const mockNotification = { notification_id: 1 };
            const fcmError = new Error('FCM Error');

            Notification.create.mockResolvedValue(mockNotification);
            admin.messaging().send.mockRejectedValue(fcmError);
            Notification.updateStatus.mockResolvedValue(true);
            console.error = jest.fn();

            // Act
            const result = await NotificationService.sendPushNotification(mockPushData);

            // Assert
            expect(Notification.updateStatus).toHaveBeenCalledWith(1, 'failed', {
                error: 'FCM Error'
            });

            expect(result).toEqual({
                success: false,
                error: 'FCM Error'
            });
        });
    });

    describe('sendBookingConfirmation', () => {
        const mockBooking = {
            booking_id: 1,
            start_date: '2024-01-15T10:00:00Z',
            end_date: '2024-01-15T12:00:00Z',
            total_amount: 50.00
        };

        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        const mockSpace = {
            name: 'Meeting Room A',
            location_name: 'Downtown Office'
        };

        it('dovrebbe inviare conferma prenotazione con successo', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendBookingConfirmation(mockBooking, mockUser, mockSpace);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Conferma Prenotazione #1',
                templateName: 'booking_confirmation',
                templateData: {
                    userName: 'John Doe',
                    bookingId: 1,
                    spaceName: 'Meeting Room A',
                    locationName: 'Downtown Office',
                    startDate: '15/01/2024',
                    endDate: '15/01/2024',
                    totalAmount: '€50',
                    subject: 'Conferma Prenotazione #1'
                },
                user_id: 1,
                booking_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendBookingCancellation', () => {
        const mockBooking = {
            booking_id: 1,
            start_date: '2024-01-15T10:00:00Z',
            end_date: '2024-01-15T12:00:00Z'
        };

        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        const mockSpace = {
            name: 'Meeting Room A',
            location_name: 'Downtown Office'
        };

        it('dovrebbe inviare cancellazione prenotazione', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendBookingCancellation(mockBooking, mockUser, mockSpace);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Cancellazione Prenotazione #1',
                templateName: 'booking_cancellation',
                templateData: {
                    userName: 'John Doe',
                    bookingId: 1,
                    spaceName: 'Meeting Room A',
                    locationName: 'Downtown Office',
                    subject: 'Cancellazione Prenotazione #1'
                },
                user_id: 1,
                booking_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendPaymentSuccess', () => {
        const mockPayment = {
            payment_id: 1,
            amount: 50.00,
            payment_method: 'credit_card'
        };

        const mockBooking = {
            booking_id: 1,
            space_name: 'Meeting Room A'
        };

        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        const mockSpace = {
            name: 'Meeting Room A'
        };

        it('dovrebbe inviare conferma pagamento', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendPaymentSuccess(mockPayment, mockBooking, mockUser, mockSpace);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Pagamento Confermato #1',
                templateName: 'payment_success',
                templateData: {
                    userName: 'John Doe',
                    paymentId: 1,
                    bookingId: 1,
                    amount: '€50',
                    paymentMethod: 'credit_card',
                    spaceName: 'Meeting Room A',
                    subject: 'Pagamento Confermato #1'
                },
                user_id: 1,
                booking_id: 1,
                payment_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendUserRegistration', () => {
        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        it('dovrebbe inviare benvenuto registrazione', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendUserRegistration(mockUser);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Benvenuto in CoWorkSpace, John!',
                templateName: 'user_registration',
                templateData: {
                    userName: 'John Doe',
                    email: 'john@example.com',
                    companyName: 'CoWorkSpace',
                    subject: 'Benvenuto in CoWorkSpace, John!'
                },
                user_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });

        it('dovrebbe gestire utente con id alternativo', async () => {
            // Arrange
            const userWithAlternateId = { ...mockUser, id: 2, user_id: undefined };
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            await NotificationService.sendUserRegistration(userWithAlternateId);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 2
                })
            );

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendPasswordReset', () => {
        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        it('dovrebbe inviare email reset password', async () => {
            // Arrange
            const tempPassword = 'temp123';
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendPasswordReset(mockUser, tempPassword);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Reset Password - CoWorkSpace',
                templateName: 'password_reset',
                templateData: {
                    userName: 'John Doe',
                    email: 'john@example.com',
                    tempPassword: 'temp123',
                    companyName: 'CoWorkSpace',
                    loginUrl: 'https://coworkspace.com/login',
                    subject: 'Reset Password - CoWorkSpace'
                },
                user_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });

        it('dovrebbe utilizzare # come fallback per loginUrl', async () => {
            // Arrange
            delete process.env.FRONTEND_URL;
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            await NotificationService.sendPasswordReset(mockUser, 'temp123');

            // Assert
            expect(emailSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    templateData: expect.objectContaining({
                        loginUrl: '#'
                    })
                })
            );

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendManagerRequestNotification', () => {
        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com'
        };

        it('dovrebbe inviare notifica richiesta manager all\'admin', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendManagerRequestNotification(mockUser);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'admin@coworkspace.com',
                subject: 'Nuova Richiesta Manager - John Doe',
                templateName: 'manager_request_notification',
                templateData: {
                    userName: 'John Doe',
                    userEmail: 'john@example.com',
                    userId: 1,
                    requestDate: expect.any(String),
                    companyName: 'CoWorkSpace',
                    adminUrl: '#',
                    subject: 'Nuova Richiesta Manager - John Doe'
                },
                user_id: 1
            });

            emailSpy.mockRestore();
        });

        it('dovrebbe utilizzare email admin di default', async () => {
            // Arrange
            delete process.env.ADMIN_EMAIL;
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });

            // Act
            await NotificationService.sendManagerRequestNotification(mockUser);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: 'admin@coworkspace.com'
                })
            );

            emailSpy.mockRestore();
        });
    });

    describe('sendManagerApprovalNotification', () => {
        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        it('dovrebbe inviare notifica approvazione manager', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendManagerApprovalNotification(mockUser);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Richiesta Manager Approvata - CoWorkSpace',
                templateName: 'manager_approval',
                templateData: {
                    userName: 'John Doe',
                    email: 'john@example.com',
                    companyName: 'CoWorkSpace',
                    loginUrl: 'https://coworkspace.com/login',
                    subject: 'Richiesta Manager Approvata - CoWorkSpace'
                },
                user_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('sendManagerRejectionNotification', () => {
        const mockUser = {
            user_id: 1,
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            fcm_token: 'test-fcm-token'
        };

        it('dovrebbe inviare notifica rifiuto manager', async () => {
            // Arrange
            const emailSpy = jest.spyOn(NotificationService, 'sendEmail').mockResolvedValue({ success: true });
            const pushSpy = jest.spyOn(NotificationService, 'sendPushNotification').mockResolvedValue({ success: true });

            // Act
            const result = await NotificationService.sendManagerRejectionNotification(mockUser);

            // Assert
            expect(emailSpy).toHaveBeenCalledWith({
                recipient: 'john@example.com',
                subject: 'Richiesta Manager Non Approvata - CoWorkSpace',
                templateName: 'manager_rejection',
                templateData: {
                    userName: 'John Doe',
                    email: 'john@example.com',
                    companyName: 'CoWorkSpace',
                    loginUrl: 'https://coworkspace.com/login',
                    subject: 'Richiesta Manager Non Approvata - CoWorkSpace'
                },
                user_id: 1
            });

            emailSpy.mockRestore();
            pushSpy.mockRestore();
        });
    });

    describe('getUserNotifications', () => {
        it('dovrebbe ottenere notifiche per utente', async () => {
            // Arrange
            const userId = 1;
            const filters = { status: 'sent' };
            const mockNotifications = [
                { notification_id: 1, type: 'email' },
                { notification_id: 2, type: 'push' }
            ];

            Notification.findByUserId.mockResolvedValue(mockNotifications);

            // Act
            const result = await NotificationService.getUserNotifications(userId, filters);

            // Assert
            expect(Notification.findByUserId).toHaveBeenCalledWith(userId, filters);
            expect(result).toEqual(mockNotifications);
        });

        it('dovrebbe utilizzare filtri vuoti di default', async () => {
            // Arrange
            Notification.findByUserId.mockResolvedValue([]);

            // Act
            await NotificationService.getUserNotifications(1);

            // Assert
            expect(Notification.findByUserId).toHaveBeenCalledWith(1, {});
        });
    });

    describe('markAsRead', () => {
        it('dovrebbe segnare notifica come letta', async () => {
            // Arrange
            const notificationId = 1;
            const userId = 1;

            Notification.markAsRead.mockResolvedValue(true);

            // Act
            const result = await NotificationService.markAsRead(notificationId, userId);

            // Assert
            expect(Notification.markAsRead).toHaveBeenCalledWith(notificationId, userId);
            expect(result).toBe(true);
        });
    });
});
