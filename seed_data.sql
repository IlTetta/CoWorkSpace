-- Script per popolare il database CoWorkSpace con dati di test
-- Almeno 10 righe per ogni tabella

-- Pulizia dati esistenti (opzionale - decommentare se necessario)
-- TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE payments RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE bookings RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE availability RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE spaces RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE space_types RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE locations RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- INSERIMENTO UTENTI (15 utenti)
INSERT INTO users (name, surname, email, password_hash, role) VALUES
('Mario', 'Rossi', 'mario.rossi@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Giulia', 'Bianchi', 'giulia.bianchi@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'manager'),
('Luca', 'Verdi', 'luca.verdi@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Anna', 'Neri', 'anna.neri@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'admin'),
('Francesco', 'Ferrari', 'francesco.ferrari@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Sara', 'Romano', 'sara.romano@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'manager'),
('Marco', 'Galli', 'marco.galli@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Elena', 'Conti', 'elena.conti@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Andrea', 'De Luca', 'andrea.deluca@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'manager'),
('Chiara', 'Martini', 'chiara.martini@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Roberto', 'Ricci', 'roberto.ricci@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Valentina', 'Moretti', 'valentina.moretti@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Alessandro', 'Barbieri', 'alessandro.barbieri@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'manager'),
('Federica', 'Fontana', 'federica.fontana@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'user'),
('Giovanni', 'Santoro', 'giovanni.santoro@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwji6c5SvqLWK7gU6', 'admin');

-- INSERIMENTO SEDI (12 locations)
INSERT INTO locations (location_name, address, city, description, manager_id) VALUES
('CoWorkSpace Milano Centro', 'Via Roma 10', 'Milano', 'Sede moderna nel cuore di Milano, comoda ai trasporti.', 2),
('CoWorkSpace Roma EUR', 'Viale Europa 20', 'Roma', 'Spazio innovativo nel quartiere EUR di Roma.', 6),
('CoWorkSpace Torino Porta Nuova', 'Corso Vittorio Emanuele 45', 'Torino', 'Sede elegante vicino alla stazione Porta Nuova.', 9),
('CoWorkSpace Napoli Centro', 'Via Toledo 88', 'Napoli', 'Spazio creativo nel centro storico di Napoli.', 13),
('CoWorkSpace Firenze Santa Maria', 'Via dei Calzaiuoli 12', 'Firenze', 'Location storica nel centro di Firenze.', 2),
('CoWorkSpace Bologna Università', 'Via Zamboni 33', 'Bologna', 'Vicino all''università, perfetto per studenti e ricercatori.', 6),
('CoWorkSpace Venezia Mestre', 'Via Piave 18', 'Venezia', 'Comodo punto di accesso a Venezia e Mestre.', 9),
('CoWorkSpace Genova Porto', 'Via del Campo 25', 'Genova', 'Affacciato sul porto antico di Genova.', 13),
('CoWorkSpace Palermo Centro', 'Via Maqueda 150', 'Palermo', 'Nel cuore del centro storico palermitano.', 2),
('CoWorkSpace Bari Murattiano', 'Corso Cavour 88', 'Bari', 'Nel quartiere murattiano di Bari.', 6),
('CoWorkSpace Catania Etnea', 'Via Etnea 200', 'Catania', 'Sulla storica Via Etnea con vista sull''Etna.', 9),
('CoWorkSpace Verona Arena', 'Via Mazzini 40', 'Verona', 'A pochi passi dall''Arena di Verona.', 13);

-- INSERIMENTO TIPI SPAZIO (10 tipi)
INSERT INTO space_types (type_name, description) VALUES
('Stanza Privata', 'Ufficio privato e isolato, ideale per chiamate e lavoro concentrato.'),
('Postazione Flessibile', 'Postazione in area open space, prenotabile all''ora o al giorno.'),
('Sala Riunioni Piccola', 'Sala per 4-6 persone, con schermo e lavagna.'),
('Sala Riunioni Grande', 'Sala per 8-12 persone, completamente attrezzata per presentazioni.'),
('Sala Conferenze', 'Ampio spazio per eventi e conferenze fino a 50 persone.'),
('Postazione Hot Desk', 'Scrivania condivisa in ambiente dinamico e collaborativo.'),
('Ufficio Team', 'Spazio dedicato per team di 3-5 persone.'),
('Phone Booth', 'Cabina telefonica insonorizzata per chiamate private.'),
('Sala Relax', 'Area comune per pause e networking informale.'),
('Studio Creativo', 'Spazio attrezzato per attività creative e brainstorming.');

-- INSERIMENTO SPAZI (20 spazi)
INSERT INTO spaces (location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day) VALUES
(1, 1, 'Stanza Milano 1', 'Stanza privata silenziosa con vista città.', 1, 15.00, 80.00),
(1, 3, 'Sala Riunioni Alpha', 'Sala riunioni per piccoli team, con monitor.', 4, 25.00, 150.00),
(2, 2, 'Postazione Roma A1', 'Postazione in open space, dotata di prese e buona illuminazione.', 1, 8.00, 40.00),
(2, 4, 'Sala Riunioni Beta', 'Grande sala riunioni con proiettore e sistema audio.', 10, 40.00, 250.00),
(3, 1, 'Ufficio Torino Premium', 'Ufficio privato con arredamento di design.', 2, 20.00, 120.00),
(3, 6, 'Hot Desk Torino', 'Postazione flessibile nell''area principale.', 1, 12.00, 60.00),
(4, 2, 'Postazione Napoli B2', 'Postazione con vista panoramica.', 1, 10.00, 50.00),
(4, 7, 'Team Space Napoli', 'Spazio dedicato per team creativi.', 5, 30.00, 180.00),
(5, 8, 'Phone Booth Firenze', 'Cabina insonorizzata per chiamate riservate.', 1, 5.00, 25.00),
(5, 1, 'Studio Firenze Deluxe', 'Ufficio elegante in palazzo storico.', 1, 18.00, 100.00),
(6, 2, 'Postazione Bologna C3', 'Vicino alla zona universitaria.', 1, 9.00, 45.00),
(6, 5, 'Sala Conferenze Bologna', 'Auditorium per grandi eventi.', 40, 80.00, 500.00),
(7, 6, 'Hot Desk Venezia', 'Postazione moderna con vista canale.', 1, 14.00, 70.00),
(7, 9, 'Sala Relax Venezia', 'Area comune con caffetteria.', 8, 0.00, 0.00),
(8, 1, 'Ufficio Genova Vista Porto', 'Ufficio con vista sul porto antico.', 2, 22.00, 130.00),
(9, 2, 'Postazione Palermo D4', 'In ambiente climatizzato e moderno.', 1, 11.00, 55.00),
(10, 3, 'Sala Riunioni Bari', 'Sala meeting ben illuminata.', 6, 28.00, 160.00),
(11, 10, 'Studio Creativo Catania', 'Spazio per brainstorming con lavagne interattive.', 8, 35.00, 200.00),
(12, 4, 'Sala Riunioni Verona', 'Sala elegante vicino all''Arena.', 12, 45.00, 280.00),
(1, 2, 'Postazione Milano E5', 'Postazione premium nell''area business.', 1, 12.00, 65.00);

-- INSERIMENTO DISPONIBILITÀ (30 slot di disponibilità)
INSERT INTO availability (space_id, availability_date, is_available) VALUES
(1, CURRENT_DATE, true),
(1, CURRENT_DATE + 1, true),
(2, CURRENT_DATE, true),
(2, CURRENT_DATE + 1, true),
(3, CURRENT_DATE, true),
(4, CURRENT_DATE, true),
(4, CURRENT_DATE + 1, false), -- Non disponibile
(5, CURRENT_DATE, true),
(6, CURRENT_DATE, true),
(7, CURRENT_DATE + 1, true),
(8, CURRENT_DATE + 1, true),
(9, CURRENT_DATE, true),
(10, CURRENT_DATE + 2, true),
(11, CURRENT_DATE, true),
(12, CURRENT_DATE + 1, true),
(13, CURRENT_DATE, true),
(14, CURRENT_DATE, true), -- Sala relax sempre disponibile
(15, CURRENT_DATE, true),
(16, CURRENT_DATE + 1, true),
(17, CURRENT_DATE, true),
(18, CURRENT_DATE + 2, true),
(19, CURRENT_DATE, true),
(20, CURRENT_DATE, true),
(1, CURRENT_DATE + 3, true),
(2, CURRENT_DATE + 3, true),
(3, CURRENT_DATE + 3, true),
(5, CURRENT_DATE + 3, true),
(7, CURRENT_DATE + 3, true),
(10, CURRENT_DATE + 3, true);

-- INSERIMENTO PRENOTAZIONI (15 prenotazioni)
INSERT INTO bookings (user_id, space_id, start_date, end_date, total_price, status, payment_status, notes) VALUES
(1, 1, CURRENT_DATE, CURRENT_DATE, 45.00, 'confirmed', 'completed', 'Prenotazione 1'),
(3, 2, CURRENT_DATE, CURRENT_DATE, 50.00, 'confirmed', 'completed', 'Prenotazione 2'),
(5, 3, CURRENT_DATE + 1, CURRENT_DATE + 1, 64.00, 'pending', 'pending', 'Prenotazione 3'),
(7, 5, CURRENT_DATE, CURRENT_DATE, 60.00, 'confirmed', 'completed', 'Prenotazione 4'),
(10, 6, CURRENT_DATE, CURRENT_DATE, 72.00, 'completed', 'completed', 'Prenotazione 5'),
(11, 8, CURRENT_DATE + 1, CURRENT_DATE + 1, 150.00, 'confirmed', 'completed', 'Prenotazione 6'),
(12, 9, CURRENT_DATE, CURRENT_DATE, 15.00, 'confirmed', 'completed', 'Prenotazione 7'),
(14, 11, CURRENT_DATE, CURRENT_DATE, 72.00, 'completed', 'completed', 'Prenotazione 8'),
(1, 13, CURRENT_DATE, CURRENT_DATE, 56.00, 'confirmed', 'completed', 'Prenotazione 9'),
(3, 15, CURRENT_DATE, CURRENT_DATE, 176.00, 'pending', 'pending', 'Prenotazione 10'),
(5, 17, CURRENT_DATE, CURRENT_DATE, 196.00, 'confirmed', 'completed', 'Prenotazione 11'),
(7, 19, CURRENT_DATE, CURRENT_DATE, 180.00, 'completed', 'completed', 'Prenotazione 12'),
(10, 20, CURRENT_DATE, CURRENT_DATE, 36.00, 'confirmed', 'completed', 'Prenotazione 13'),
(11, 1, CURRENT_DATE + 2, CURRENT_DATE + 2, 45.00, 'pending', 'pending', 'Prenotazione 14'),
(12, 4, CURRENT_DATE + 1, CURRENT_DATE + 1, 80.00, 'cancelled', 'refunded', 'Prenotazione 15');

-- INSERIMENTO PAGAMENTI (12 pagamenti - solo per prenotazioni confermate/completate)
INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id) VALUES
(1, 45.00, 'credit_card', 'completed', 'TXN_001_CC_20250905'),
(2, 50.00, 'paypal', 'completed', 'TXN_002_PP_20250905'),
(4, 60.00, 'credit_card', 'completed', 'TXN_004_CC_20250905'),
(5, 72.00, 'bank_transfer', 'completed', 'TXN_005_BT_20250905'),
(6, 150.00, 'credit_card', 'completed', 'TXN_006_CC_20250905'),
(7, 15.00, 'cash', 'completed', 'TXN_007_CASH_20250905'),
(8, 72.00, 'paypal', 'completed', 'TXN_008_PP_20250905'),
(9, 56.00, 'credit_card', 'completed', 'TXN_009_CC_20250905'),
(11, 196.00, 'credit_card', 'completed', 'TXN_011_CC_20250905'),
(12, 180.00, 'bank_transfer', 'completed', 'TXN_012_BT_20250905'),
(13, 36.00, 'paypal', 'completed', 'TXN_013_PP_20250905'),
(15, 80.00, 'credit_card', 'refunded', 'TXN_015_CC_20250905');

-- INSERIMENTO NOTIFICHE (15 notifiche)
INSERT INTO notifications (user_id, type, channel, recipient, subject, content, status, booking_id, payment_id) VALUES
(1, 'email', 'booking_confirmation', 'mario.rossi@email.com', 'Prenotazione Confermata', 'La tua prenotazione per la Stanza Milano 1 è stata confermata.', 'sent', 1, 1),
(3, 'email', 'booking_confirmation', 'luca.verdi@email.com', 'Prenotazione Confermata', 'La tua prenotazione per la Sala Riunioni Alpha è stata confermata.', 'delivered', 2, 2),
(5, 'push', 'booking_reminder', 'francesco.ferrari@email.com', 'Promemoria Prenotazione', 'Ricordati della tua prenotazione domani.', 'delivered', 3, NULL),
(7, 'email', 'payment_success', 'marco.galli@email.com', 'Pagamento Completato', 'Il pagamento per la tua prenotazione è stato elaborato con successo.', 'sent', 4, 3),
(10, 'email', 'booking_confirmation', 'chiara.martini@email.com', 'Prenotazione Completata', 'La tua sessione di coworking è terminata. Grazie!', 'delivered', 5, 4),
(11, 'sms', 'booking_reminder', '+39123456789', '', 'Prenotazione oggi alle 10:00 - Team Space Napoli', 'sent', 6, NULL),
(12, 'email', 'payment_success', 'valentina.moretti@email.com', 'Pagamento Ricevuto', 'Confermiamo la ricezione del tuo pagamento.', 'delivered', 7, 5),
(14, 'email', 'booking_confirmation', 'giovanni.santoro@email.com', 'Prenotazione Confermata', 'Prenotazione Bologna confermata per oggi.', 'sent', 8, 6),
(1, 'push', 'booking_reminder', 'mario.rossi@email.com', 'Prenotazione Oggi', 'Hai una prenotazione oggi alle 14:00.', 'delivered', 9, NULL),
(3, 'email', 'user_registration', 'luca.verdi@email.com', 'Benvenuto in CoWorkSpace', 'Grazie per esserti registrato. Il tuo account è attivo.', 'delivered', NULL, NULL),
(5, 'email', 'booking_confirmation', 'francesco.ferrari@email.com', 'Nuova Prenotazione', 'Prenotazione per Ufficio Genova Vista Porto confermata.', 'sent', 11, 7),
(7, 'email', 'payment_success', 'marco.galli@email.com', 'Transazione Completata', 'Il pagamento di €180.00 è stato completato.', 'delivered', 12, 8),
(10, 'sms', 'booking_confirmation', '+39987654321', '', 'Prenotazione confermata per Milano E5 - Oggi 15:00', 'sent', 13, NULL),
(11, 'email', 'booking_reminder', 'roberto.ricci@email.com', 'Prenotazione Domani', 'Ricordati della prenotazione per domani mattina.', 'pending', 14, NULL),
(12, 'email', 'booking_cancellation', 'valentina.moretti@email.com', 'Prenotazione Cancellata', 'La tua prenotazione è stata cancellata e il rimborso elaborato.', 'sent', 15, 9);

-- Messaggio di completamento
SELECT 'Database popolato con successo!' as message;
SELECT 
    (SELECT COUNT(*) FROM users) as utenti,
    (SELECT COUNT(*) FROM locations) as sedi,
    (SELECT COUNT(*) FROM space_types) as tipi_spazio,
    (SELECT COUNT(*) FROM spaces) as spazi,
    (SELECT COUNT(*) FROM availability) as disponibilita,
    (SELECT COUNT(*) FROM bookings) as prenotazioni,
    (SELECT COUNT(*) FROM payments) as pagamenti,
    (SELECT COUNT(*) FROM notifications) as notifiche;
