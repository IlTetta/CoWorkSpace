-- file seed.sql

-- Popola la tabella users
INSERT INTO users (name, surname, email, password_hash, role, created_at) VALUES
('Mario', 'Rossi', 'mario.rossi@example.com', 'hashedpassword1', 'user', CURRENT_TIMESTAMP),
('Giulia', 'Bianchi', 'giulia.bianchi@example.com', 'hashedpassword2', 'manager', CURRENT_TIMESTAMP),
('Luca', 'Verdi', 'luca.verdi@example.com', 'hashedpassword3', 'admin', CURRENT_TIMESTAMP),
('Anna', 'Neri', 'anna.neri@example.com', 'hashedpassword4', 'user', CURRENT_TIMESTAMP);

-- Popola la tabella locations
INSERT INTO locations (location_name, address, city, description, manager_id) VALUES
('Coworking Space Centro', 'Via Roma 10, 00100', 'Roma', 'Moderno spazio di coworking nel cuore della città.', 2),
('Coworking Space Nord', 'Via Milano 55, 20121', 'Milano', 'Ampio spazio con vista panoramica a nord di Milano.', 2);

-- Popola la tabella space_types
INSERT INTO space_types (type_name, description) VALUES
('Private Office', 'Ufficio privato e insonorizzato.'),
('Meeting Room', 'Sala riunioni attrezzata per conferenze.'),
('Open Space Desk', 'Scrivania in area open space condivisa.'),
('Event Space', 'Ampio spazio per eventi e workshop.');

-- Popola la tabella spaces
INSERT INTO spaces (location_id, space_type_id, space_name, capacity, price_per_hour, price_per_day, available_days, status) VALUES
(1, 1, 'Ufficio Privato 101', 4, 25.00, 150.00, ARRAY[1,2,3,4,5], 'active'),
(1, 2, 'Sala Riunioni A', 10, 50.00, 300.00, ARRAY[1,2,3,4,5], 'active'),
(1, 3, 'Scrivania Condivisa', 1, 10.00, 60.00, ARRAY[1,2,3,4,5], 'active'),
(2, 4, 'Spazio Eventi Grande', 50, 100.00, 600.00, ARRAY[1,2,3,4,5,6,7], 'active'),
(2, 1, 'Ufficio Privato B', 2, 20.00, 120.00, ARRAY[1,2,3,4,5], 'active');

-- Popola la tabella additional_services
INSERT INTO additional_services (service_name, description, price, is_active) VALUES
('Coffee & Tea', 'Bevande illimitate.', 5.00, TRUE),
('Printing', 'Servizio di stampa a colori.', 0.20, TRUE),
('Projector Rental', 'Noleggio proiettore per presentazioni.', 20.00, TRUE),
('Catering', 'Servizio catering per riunioni.', 15.00, TRUE);

-- Popola la tabella di join space_services
INSERT INTO space_services (space_id, service_id) VALUES
(1, 1), -- Ufficio Privato 101 con Coffee & Tea
(1, 2), -- Ufficio Privato 101 con Printing
(2, 1), -- Sala Riunioni A con Coffee & Tea
(2, 3), -- Sala Riunioni A con Projector
(4, 4); -- Spazio Eventi Grande con Catering

-- Popola la tabella bookings
INSERT INTO bookings (user_id, space_id, start_datetime, end_datetime, total_price, status) VALUES
(1, 2, '2025-09-01 10:00:00', '2025-09-01 12:00:00', 100.00, 'confirmed'),
(4, 3, '2025-09-05 14:00:00', '2025-09-05 16:00:00', 20.00, 'pending'),
(1, 1, '2025-09-10 09:00:00', '2025-09-10 17:00:00', 150.00, 'confirmed');

-- Popola la tabella payments
INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id) VALUES
(1, 100.00, 'credit_card', 'completed', 'txn_1A2B3C4D5E6F7G8H9I0J'),
(3, 150.00, 'paypal', 'completed', 'txn_0J9I8H7G6F5E4D3C2B1A');

-- Popola la tabella availability
INSERT INTO availability (space_id, availability_date, start_time, end_time, is_available) VALUES
(1, '2025-09-15', '09:00:00', '18:00:00', TRUE),
(2, '2025-09-16', '09:00:00', '18:00:00', TRUE),
(3, '2025-09-17', '09:00:00', '18:00:00', FALSE);

-- Popola la tabella notifications
INSERT INTO notifications (user_id, type, channel, recipient, content, template_name, booking_id, status) VALUES
(1, 'email', 'booking_confirmation', 'mario.rossi@example.com', 'La tua prenotazione è confermata!', 'booking_confirmation_email', 1, 'sent'),
(4, 'push', 'booking_reminder', 'anna.neri@example.com', 'La tua prenotazione è imminente.', 'booking_reminder_push', 2, 'pending');