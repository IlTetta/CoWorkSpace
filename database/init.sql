CREATE TABLE utenti (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  ruolo TEXT CHECK (ruolo IN ('cliente', 'gestore', 'admin')) NOT NULL
);
