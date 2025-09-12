-- Tipi ENUM personalizzati per PostgreSQL
CREATE TYPE user_role_enum AS ENUM ('user', 'manager', 'admin');
CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'pending', 'cancelled', 'completed');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('credit_card', 'paypal', 'bank_transfer', 'cash');


-- Tabella Utenti
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password_hash VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'user',
  is_password_reset_required BOOLEAN DEFAULT FALSE,
  temp_password_hash VARCHAR(255),
  temp_password_expires_at TIMESTAMP,
  fcm_token VARCHAR(255),
  manager_request_pending BOOLEAN DEFAULT FALSE,
  manager_request_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--Tabella Sedi
CREATE TABLE IF NOT EXISTS locations (
  location_id SERIAL PRIMARY KEY,
  location_name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL, -- Filtri per città
  description TEXT,
  manager_id INT,
  FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Tabella TipiSpazio (es. Stanza privata, Sala riunioni, Open space, ecc.)
CREATE TABLE IF NOT EXISTS space_types (
  space_type_id SERIAL PRIMARY KEY,
  type_name VARCHAR(100) UNIQUE NOT NULL, -- Tipologia dello spazio
  description TEXT
);

-- Tabella Spazi (Singoli spazi di una sede, es. Stanza 101, Sala riunioni A, ecc.)
CREATE TABLE IF NOT EXISTS spaces (
  space_id SERIAL PRIMARY KEY,
  location_id INT NOT NULL,
  space_type_id INT NOT NULL,
  space_name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INT NOT NULL,
  price_per_hour DECIMAL(10, 2) NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  -- Orari di disponibilità standard
  opening_time TIME DEFAULT '09:00:00',
  closing_time TIME DEFAULT '18:00:00',
  -- Giorni della settimana disponibili (1=Lunedì, 7=Domenica)
  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- Lunedì-Domenica di default
  -- Configurazioni avanzate
  booking_advance_days INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE,
  FOREIGN KEY (space_type_id) REFERENCES space_types(space_type_id) ON DELETE CASCADE
);

-- Tabella Disponibilità (gestione giornaliera)
CREATE TABLE IF NOT EXISTS availability (
  availability_id SERIAL PRIMARY KEY,
  space_id INT NOT NULL,
  availability_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE,
  UNIQUE (space_id, availability_date) -- Un solo record per spazio per giorno
);

-- Tabella Prenotazioni
CREATE TABLE IF NOT EXISTS bookings (
  booking_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL, -- Riferimento all'utente che prenota
  space_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  total_price DECIMAL(10, 2) NOT NULL,
  status booking_status_enum NOT NULL DEFAULT 'pending',
  payment_status payment_status_enum DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE,
  -- Constraint per validazione date
  CONSTRAINT booking_date_order CHECK (start_date <= end_date),
  CONSTRAINT booking_future_date CHECK (start_date >= CURRENT_DATE)
);

-- Tabella Pagamenti
CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE NOT NULL, -- Ogni prenotazioni ha un solo pagamento associato
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method payment_method_enum NOT NULL,
  status payment_status_enum NOT NULL DEFAULT 'completed',
  transaction_id VARCHAR(100) UNIQUE, -- ID della transazione del gataway di pagamento (es. Stripe, PayPal, ecc.)
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- Tabella Notifiche
CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'push', 'sms')),
  channel VARCHAR(50) NOT NULL CHECK (channel IN (
    'booking_confirmation',
    'booking_cancellation', 
    'payment_success',
    'payment_failed',
    'payment_refund',
    'booking_reminder',
    'user_registration',
    'password_reset'
  )),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  template_name VARCHAR(100),
  template_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  metadata JSONB,
  booking_id INT,
  payment_id INT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL
);

-- Inserimento tipi di spazio predefiniti
INSERT INTO space_types (type_name, description) VALUES
  ('Ufficio Privato', 'Ufficio privato per singola persona o piccoli team'),
  ('Sala Riunioni', 'Sala attrezzata per meeting e riunioni di lavoro'),
  ('Open Space', 'Spazio aperto condiviso per lavoro collaborativo'),
  ('Coworking Desk', 'Singola postazione di lavoro in ambiente condiviso'),
  ('Phone Booth', 'Cabina telefonica insonorizzata per chiamate private'),
  ('Sala Conferenze', 'Ampia sala per conferenze e presentazioni'),
  ('Focus Room', 'Stanza silenziosa per lavoro concentrato'),
  ('Lounge Area', 'Area relax informale per incontri casual'),
  ('Training Room', 'Aula per formazione e workshop'),
  ('Event Space', 'Spazio per eventi e networking')
ON CONFLICT (type_name) DO NOTHING;

-- Inserimento utente admin di default
-- Password: CoWorkSpace2025!
-- Hash generato con bcrypt rounds=12
INSERT INTO users (name, surname, email, password_hash, role) 
VALUES (
  'Admin',
  'CoWorkSpace', 
  'admin@coworkspace.com',
  '$2b$12$3QkdEdtpCfqQrm74UK.6AuQTrZH/jI683J1f0CkpwvS30lZEWn9pG',
  'admin'
) ON CONFLICT (email) DO NOTHING;