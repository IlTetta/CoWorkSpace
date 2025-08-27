-- Inserimento dati nella tabella space_types
INSERT INTO space_types (type_name, description) VALUES
('Stanza Privata', 'Ufficio privato e isolato, ideale per chiamate e lavoro concentrato.'),
('Postazione Flessibile', 'Postazione in area open space, prenotabile all''ora o al giorno.'),
('Sala Riunioni Piccola', 'Sala per 4-6 persone, con schermo e lavagna.'),
('Sala Riunioni Grande', 'Sala per 10-20 persone, con videoproiezione e impianto audio.'),
('Open Space', 'Ampia area comune con postazioni non assegnate.');

-- Inserimento dati nella tabella users
INSERT INTO users (name, surname, email, password_hash, role) VALUES
('Mario', 'Rossi', 'mario.rossi@example.com', 'password_hash_user1', 'user'),
('Luigi', 'Verdi', 'luigi.verdi@example.com', 'password_hash_user2', 'user'),
('Anna', 'Bianchi', 'anna.bianchi@example.com', 'password_hash_manager1', 'manager'),
('Marco', 'Neri', 'marco.neri@example.com', 'password_hash_admin1', 'admin');

-- Inserimento dati nella tabella locations
INSERT INTO locations (location_name, address, city, description, manager_id) VALUES
('CoWorkSpace Milano Centro', 'Via Roma 10', 'Milano', 'Sede moderna nel cuore di Milano, comoda ai trasporti.', (SELECT user_id FROM users WHERE email = 'anna.bianchi@example.com')),
('CoWorkSpace Roma EUR', 'Viale Europa 20', 'Roma', 'Spazi ampi e luminosi nel quartiere EUR di Roma.', (SELECT user_id FROM users WHERE email = 'anna.bianchi@example.com'));

-- Inserimento dati nella tabella spaces
INSERT INTO spaces (location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day) VALUES
((SELECT location_id FROM locations WHERE location_name = 'CoWorkSpace Milano Centro'), (SELECT space_type_id FROM space_types WHERE type_name = 'Stanza Privata'), 'Stanza Milano 1', 'Stanza privata silenziosa con vista città.', 1, 15.00, 80.00),
((SELECT location_id FROM locations WHERE location_name = 'CoWorkSpace Milano Centro'), (SELECT space_type_id FROM space_types WHERE type_name = 'Sala Riunioni Piccola'), 'Sala Riunioni Alpha', 'Sala riunioni per piccoli team, con monitor.', 4, 25.00, 150.00),
((SELECT location_id FROM locations WHERE location_name = 'CoWorkSpace Roma EUR'), (SELECT space_type_id FROM space_types WHERE type_name = 'Postazione Flessibile'), 'Postazione Roma A1', 'Postazione in open space, dotata di prese e buona illuminazione.', 1, 8.00, 40.00);

-- Inserimento dati nella tabella additional_services
INSERT INTO additional_services (service_name, description, price, is_active) VALUES
('Caffè Illimitato', 'Accesso illimitato a caffè, tè e acqua.', 5.00, TRUE),
('Stampante/Scanner', 'Utilizzo della stampante e scanner professionali.', 2.00, TRUE),
('Servizio Catering', 'Opzioni di catering per eventi o riunioni prolungate.', 50.00, TRUE);

-- Inserimento dati nella tabella di join space_services
-- Collega servizi a spazi specifici
INSERT INTO space_services (space_id, service_id) VALUES
((SELECT space_id FROM spaces WHERE space_name = 'Stanza Milano 1'), (SELECT service_id FROM additional_services WHERE service_name = 'Caffè Illimitato')),
((SELECT space_id FROM spaces WHERE space_name = 'Sala Riunioni Alpha'), (SELECT service_id FROM additional_services WHERE service_name = 'Caffè Illimitato')),
((SELECT space_id FROM spaces WHERE space_name = 'Sala Riunioni Alpha'), (SELECT service_id FROM additional_services WHERE service_name = 'Stampante/Scanner'));

-- Inserimento dati nella tabella availability (esempi per un giorno specifico)
INSERT INTO availability (space_id, availability_date, start_time, end_time, is_available) VALUES
((SELECT space_id FROM spaces WHERE space_name = 'Stanza Milano 1'), CURRENT_DATE + INTERVAL '1 day', '09:00:00', '13:00:00', TRUE),
((SELECT space_id FROM spaces WHERE space_name = 'Stanza Milano 1'), CURRENT_DATE + INTERVAL '1 day', '14:00:00', '18:00:00', TRUE),
((SELECT space_id FROM spaces WHERE space_name = 'Sala Riunioni Alpha'), CURRENT_DATE + INTERVAL '1 day', '10:00:00', '12:00:00', TRUE);

-- Inserimento dati nella tabella bookings (esempi)
INSERT INTO bookings (user_id, space_id, booking_date, start_time, end_time, total_hours, total_price, status) VALUES
((SELECT user_id FROM users WHERE email = 'mario.rossi@example.com'), (SELECT space_id FROM spaces WHERE space_name = 'Stanza Milano 1'), CURRENT_DATE + INTERVAL '1 day', '09:00:00', '11:00:00', 2.00, 30.00, 'confirmed'),
((SELECT user_id FROM users WHERE email = 'luigi.verdi@example.com'), (SELECT space_id FROM spaces WHERE space_name = 'Sala Riunioni Alpha'), CURRENT_DATE + INTERVAL '1 day', '10:00:00', '11:00:00', 1.00, 25.00, 'pending');

-- Inserimento dati nella tabella payments (esempi)
INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id) VALUES
((SELECT booking_id FROM bookings WHERE user_id = (SELECT user_id FROM users WHERE email = 'mario.rossi@example.com') AND space_id = (SELECT space_id FROM spaces WHERE space_name = 'Stanza Milano 1')), 30.00, 'Credit Card', 'completed', 'txn_12345abc'),
((SELECT booking_id FROM bookings WHERE user_id = (SELECT user_id FROM users WHERE email = 'luigi.verdi@example.com') AND space_id = (SELECT space_id FROM spaces WHERE space_name = 'Sala Riunioni Alpha')), 25.00, 'PayPal', 'failed', 'txn_67890def');