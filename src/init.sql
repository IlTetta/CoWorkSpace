-- Tipi ENUM personalizzati per PostgreSQL
CREATE TYPE user_role_enum AS ENUM ('user', 'manager', 'admin');
CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'pending', 'cancelled', 'completed');
CREATE TYPE payment_status_enum AS ENUM ('completed', 'failed', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('credit_card', 'paypal', 'bank_transfer', 'cash');


-- Tabella Utenti
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password_hash VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL,
  is_password_reset_required BOOLEAN DEFAULT FALSE,
  temp_password_hash VARCHAR(255),
  temp_password_expires_at TIMESTAMP,
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
  FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE,
  FOREIGN KEY (space_type_id) REFERENCES space_types(space_type_id) ON DELETE CASCADE
);

-- Tabella Disponibilità
CREATE TABLE IF NOT EXISTS availability (
  availability_id SERIAL PRIMARY KEY,
  space_id INT NOT NULL,
  availability_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE,
  UNIQUE (space_id, availability_date, start_time, end_time) -- Per evitare duplicati
);

-- Tabella Prenotazioni
CREATE TABLE IF NOT EXISTS bookings (
  booking_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL, -- Riferimento all'utente che prenota
  space_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(5, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status booking_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE
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

-- Tabella Servizi Aggiuntivi
CREATE TABLE IF NOT EXISTS additional_services (
  service_id SERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabella di join tra spazi e servizi aggiuntivi (n - m)
CREATE TABLE IF NOT EXISTS space_services (
  space_id INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (space_id, service_id),
  FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES additional_services(service_id) ON DELETE CASCADE
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