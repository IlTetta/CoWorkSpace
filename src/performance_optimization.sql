-- Performance optimization script for CoWorkSpace database
-- Run questo script dopo aver creato le tabelle principali

-- Indici per performance su query frequenti
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_space_date ON bookings(space_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);

CREATE INDEX IF NOT EXISTS idx_spaces_location_id ON spaces(location_id);
CREATE INDEX IF NOT EXISTS idx_spaces_type_id ON spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_spaces_location_type ON spaces(location_id, space_type_id);

CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_manager_id ON locations(manager_id);

CREATE INDEX IF NOT EXISTS idx_availability_space_date ON availability(space_id, availability_date);
CREATE INDEX IF NOT EXISTS idx_availability_date_available ON availability(availability_date, is_available);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_payment_id ON notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_users_password_reset ON users(is_password_reset_required);

-- Constraint per prevenire sovrapposizioni di prenotazioni (richiede estensione btree_gist)
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- 
-- ALTER TABLE bookings 
-- ADD CONSTRAINT no_overlapping_bookings 
-- EXCLUDE USING gist (
--   space_id WITH =,
--   tsrange(
--     (booking_date + start_time)::timestamp,
--     (booking_date + end_time)::timestamp
--   ) WITH &&
-- ) WHERE (status IN ('confirmed', 'pending'));

-- Statistiche per query optimizer
ANALYZE users;
ANALYZE bookings;
ANALYZE spaces;
ANALYZE locations;
ANALYZE availability;
ANALYZE payments;

-- Views utili per reporting
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    b.booking_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.total_hours,
    b.total_price,
    b.status,
    b.created_at,
    u.name as user_name,
    u.surname as user_surname,
    u.email as user_email,
    s.space_name,
    s.capacity,
    st.type_name as space_type,
    l.location_name,
    l.city,
    l.address
FROM bookings b
JOIN users u ON b.user_id = u.user_id
JOIN spaces s ON b.space_id = s.space_id
JOIN space_types st ON s.space_type_id = st.space_type_id
JOIN locations l ON s.location_id = l.location_id;

-- View per statistiche prenotazioni
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
    l.location_name,
    l.city,
    s.space_name,
    st.type_name as space_type,
    COUNT(b.booking_id) as total_bookings,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    SUM(b.total_price) as total_revenue,
    AVG(b.total_hours) as avg_hours_per_booking
FROM spaces s
JOIN space_types st ON s.space_type_id = st.space_type_id
JOIN locations l ON s.location_id = l.location_id
LEFT JOIN bookings b ON s.space_id = b.space_id
GROUP BY l.location_id, l.location_name, l.city, s.space_id, s.space_name, st.type_name
ORDER BY l.city, l.location_name, s.space_name;

-- Funzione per calcolare disponibilità spazio
CREATE OR REPLACE FUNCTION is_space_available(
    p_space_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Controlla conflitti con prenotazioni esistenti
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE space_id = p_space_id
    AND booking_date = p_date
    AND status IN ('confirmed', 'pending')
    AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
    );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare automaticamente timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aggiungi colonna updated_at se non esiste (opzionale)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE spaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
