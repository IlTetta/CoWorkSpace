# CoWorkSpace Backend - Guida per il Team Frontend

## 📋 Indice
1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Backend](#architettura-del-backend)
3. [Struttura delle API](#struttura-delle-api)
4. [Autenticazione e Autorizzazione](#autenticazione-e-autorizzazione)
5. [Endpoint Principali](#endpoint-principali)
6. [Modelli di Dati](#modelli-di-dati)
7. [Gestione degli Errori](#gestione-degli-errori)
8. [Come Iniziare](#come-iniziare)
9. [Documentazione API (Swagger)](#documentazione-api-swagger)
10. [Esempi Pratici](#esempi-pratici)

---

## 🌐 Panoramica Generale

CoWorkSpace è un sistema di gestione per spazi coworking che permette di:
- **Gestire utenti** (registrazione, autenticazione, profili)
- **Gestire location e spazi** (uffici, sale riunioni, postazioni)
- **Gestire prenotazioni** (disponibilità, booking, calendario)
- **Gestire pagamenti** (transazioni, metodi di pagamento)
- **Gestire servizi aggiuntivi** (catering, equipment extra)
- **Gestire notifiche** (email, push, SMS)

### Stack Tecnologico Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Autenticazione**: JWT (JSON Web Tokens)
- **Documentazione**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Deployment**: Docker + Render

---

## 🏗 Architettura del Backend

### Struttura Directory
```
src/backend/
├── app.js              # Configurazione applicazione Express
├── server.js           # Entry point e avvio server
├── config/
│   ├── db.js           # Configurazione database PostgreSQL
│   └── swagger.js      # Configurazione documentazione API
├── controllers/        # Logica business per ogni endpoint
├── middleware/         # Middleware di autenticazione e validazione
├── models/            # Modelli di dati e interazione con DB
├── routes/            # Definizione delle route API
├── services/          # Servizi business e logica complessa
├── utils/             # Utility e helper functions
└── templates/         # Template HTML per email
```

### Pattern Architetturale
Il backend segue il pattern **MVC (Model-View-Controller)** con separazione delle responsabilità:

- **Routes** → Definiscono gli endpoint e middleware
- **Controllers** → Gestiscono la logica di business
- **Services** → Contengono la logica applicativa complessa
- **Models** → Interagiscono con il database
- **Middleware** → Gestiscono autenticazione, validazione, errori

---

## 🔗 Struttura delle API

### Base URL
- **Sviluppo**: `http://localhost:3000/api`
- **Produzione**: `https://api.coworkspace.com/api`

### Endpoint di Sistema
| Endpoint | Descrizione |
|----------|-------------|
| `GET /health` | Health check del server e database |
| `GET /api` | Informazioni generali sulle API |
| `GET /api-docs` | Documentazione Swagger interattiva |

### Principali Gruppi di Endpoint

| Gruppo | Base Path | Descrizione |
|--------|-----------|-------------|
| **Utenti** | `/api/users` | Autenticazione e gestione profili |
| **Location** | `/api/locations` | Gestione sedi coworking |
| **Spazi** | `/api/spaces` | Gestione uffici e sale |
| **Tipi Spazio** | `/api/space-types` | Tipologie di spazi (ufficio, sala riunioni, etc.) |
| **Disponibilità** | `/api/availability` | Gestione calendario disponibilità |
| **Prenotazioni** | `/api/bookings` | Gestione booking e prenotazioni |
| **Pagamenti** | `/api/payments` | Gestione transazioni |
| **Servizi Extra** | `/api/additional-services` | Servizi aggiuntivi (catering, etc.) |
| **Notifiche** | `/api/notifications` | Sistema di notifiche |

---

## 🔐 Autenticazione e Autorizzazione

### Sistema di Autenticazione
- **Tipo**: JWT (JSON Web Tokens)
- **Header**: `Authorization: Bearer <token>`
- **Scadenza**: Configurabile (default: 24h)

### Ruoli Utente
1. **user** - Utente standard (può prenotare spazi)
2. **manager** - Manager location (gestisce una o più sedi)
3. **admin** - Amministratore sistema (accesso completo)

### Rate Limiting
- **API Generali**: 100 richieste per IP ogni 15 minuti
- **Autenticazione**: 5 tentativi di login per IP ogni 15 minuti

### Esempio Header Autenticazione
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};
```

---

## 🚀 Endpoint Principali

### 👤 Gestione Utenti (`/api/users`)

| Metodo | Endpoint | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| `POST` | `/register` | ❌ | Registrazione nuovo utente |
| `POST` | `/login` | ❌ | Login utente |
| `GET` | `/profile` | ✅ | Ottieni profilo utente corrente |
| `PUT` | `/profile` | ✅ | Aggiorna profilo |
| `PUT` | `/change-password` | ✅ | Cambio password |
| `POST` | `/logout` | ✅ | Logout utente |

### 🏢 Gestione Location (`/api/locations`)

| Metodo | Endpoint | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| `GET` | `/` | ❌ | Lista location pubbliche |
| `GET` | `/:id` | ❌ | Dettagli location specifica |
| `POST` | `/` | ✅ (admin) | Crea nuova location |
| `PUT` | `/:id` | ✅ (admin/manager) | Aggiorna location |
| `DELETE` | `/:id` | ✅ (admin) | Elimina location |

### 🏠 Gestione Spazi (`/api/spaces`)

| Metodo | Endpoint | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| `GET` | `/` | ❌ | Lista spazi con filtri |
| `GET` | `/:id` | ❌ | Dettagli spazio specifico |
| `GET` | `/location/:locationId` | ❌ | Spazi per location |
| `POST` | `/` | ✅ (admin/manager) | Crea nuovo spazio |
| `PUT` | `/:id` | ✅ (admin/manager) | Aggiorna spazio |
| `DELETE` | `/:id` | ✅ (admin/manager) | Elimina spazio |

### 📅 Gestione Prenotazioni (`/api/bookings`)

| Metodo | Endpoint | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| `POST` | `/check-availability` | ❌ | Verifica disponibilità spazio |
| `POST` | `/calculate-price` | ❌ | Calcola prezzo prenotazione |
| `GET` | `/` | ✅ | Lista prenotazioni utente |
| `GET` | `/:id` | ✅ | Dettagli prenotazione |
| `POST` | `/` | ✅ | Crea nuova prenotazione |
| `PUT` | `/:id` | ✅ | Aggiorna prenotazione |
| `DELETE` | `/:id` | ✅ | Cancella prenotazione |
| `PATCH` | `/:id/status` | ✅ (manager/admin) | Aggiorna stato |

### 💳 Gestione Pagamenti (`/api/payments`)

| Metodo | Endpoint | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| `GET` | `/` | ✅ | Lista pagamenti utente |
| `GET` | `/:id` | ✅ | Dettagli pagamento |
| `POST` | `/` | ✅ | Crea nuovo pagamento |
| `POST` | `/:id/refund` | ✅ (admin/manager) | Rimborso pagamento |

---

## 📊 Modelli di Dati

### Utente (User)
```javascript
{
  "user_id": 1,
  "name": "Mario",
  "surname": "Rossi",
  "email": "mario.rossi@email.com",
  "role": "user", // user, manager, admin
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Location
```javascript
{
  "location_id": 1,
  "location_name": "CoWork Milano Centro",
  "address": "Via Brera 10, Milano",
  "city": "Milano",
  "description": "Moderno spazio coworking nel cuore di Milano",
  "manager_id": 2
}
```

### Spazio (Space)
```javascript
{
  "space_id": 1,
  "location_id": 1,
  "space_type_id": 1,
  "space_name": "Stanza 101",
  "description": "Ufficio privato con vista sul cortile",
  "capacity": 4,
  "price_per_hour": 15.50,
  "price_per_day": 120.00
}
```

### Prenotazione (Booking)
```javascript
{
  "booking_id": 1,
  "user_id": 1,
  "space_id": 1,
  "booking_date": "2024-01-20",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "total_hours": 8.00,
  "total_price": 124.00,
  "status": "pending", // confirmed, pending, cancelled, completed
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## ⚠️ Gestione degli Errori

### Formato Risposta Standard
```javascript
// Successo
{
  "success": true,
  "message": "Operazione completata con successo",
  "data": { /* dati di risposta */ }
}

// Errore
{
  "success": false,
  "message": "Messaggio di errore user-friendly",
  "error": "Codice errore tecnico",
  "details": { /* dettagli aggiuntivi in development */ }
}
```

### Codici di Stato HTTP Comuni
- **200** - OK (operazione riuscita)
- **201** - Created (risorsa creata)
- **400** - Bad Request (dati non validi)
- **401** - Unauthorized (non autenticato)
- **403** - Forbidden (non autorizzato)
- **404** - Not Found (risorsa non trovata)
- **409** - Conflict (conflitto, es. email già esistente)
- **429** - Too Many Requests (rate limit exceeded)
- **500** - Internal Server Error (errore del server)

---

## 🚀 Come Iniziare

### 1. Avvio del Backend
```bash
# Installa dipendenze
npm install

# Avvia database (Docker)
cd src && docker-compose up -d

# Avvia server in sviluppo
npm run dev

# Server disponibile su: http://localhost:3000
```

### 2. Variabili d'Ambiente
Crea un file `.env` nella root del progetto:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworkspace_db
DB_USER=coworkspace_user
DB_PASSWORD=a_strong_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development
```

### 3. Test delle API
```bash
# Health check
curl http://localhost:3000/health

# Info API
curl http://localhost:3000/api

# Documentazione Swagger
# Apri nel browser: http://localhost:3000/api-docs
```

---

## 📚 Documentazione API (Swagger)

### Accesso alla Documentazione
- **URL**: `http://localhost:3000/api-docs`
- **Caratteristiche**:
  - Documentazione interattiva completa
  - Possibilità di testare endpoint direttamente
  - Esempi di request/response
  - Schemi dei dati completi
  - Supporto per autenticazione Bearer token

### Come Usare Swagger
1. Apri `http://localhost:3000/api-docs` nel browser
2. Esplora i vari endpoint organizzati per tag
3. Clicca su "Authorize" per inserire il token JWT
4. Testa gli endpoint direttamente dall'interfaccia

---

## 💡 Esempi Pratici

### 1. Registrazione e Login
```javascript
// Registrazione
const registerUser = async (userData) => {
  const response = await fetch('http://localhost:3000/api/users/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Salva il token
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }
  
  return result;
};

// Login
const loginUser = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  
  const result = await response.json();
  
  if (result.success) {
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }
  
  return result;
};
```

### 2. Ricerca Spazi Disponibili
```javascript
// Cerca spazi per location
const searchSpaces = async (locationId, filters = {}) => {
  const queryParams = new URLSearchParams({
    locationId,
    ...filters
  });
  
  const response = await fetch(`http://localhost:3000/api/spaces?${queryParams}`);
  const result = await response.json();
  
  return result.data.spaces;
};

// Verifica disponibilità specifica
const checkAvailability = async (spaceId, startDateTime, endDateTime) => {
  const response = await fetch('http://localhost:3000/api/bookings/check-availability', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceId,
      startDateTime,
      endDateTime
    })
  });
  
  const result = await response.json();
  return result.data.available;
};
```

### 3. Creazione Prenotazione
```javascript
const createBooking = async (bookingData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      spaceId: bookingData.spaceId,
      startDateTime: bookingData.startDateTime,
      endDateTime: bookingData.endDateTime,
      notes: bookingData.notes,
      additionalServices: bookingData.additionalServices || []
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Prenotazione creata:', result.data.booking);
  }
  
  return result;
};
```

### 4. Gestione Errori Centralizzata
```javascript
// Utility per gestire le chiamate API
const apiCall = async (url, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    const result = await response.json();
    
    // Gestione errori di autenticazione
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }
    
    // Gestione rate limiting
    if (response.status === 429) {
      alert('Troppe richieste. Riprova tra qualche minuto.');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Errore API:', error);
    return {
      success: false,
      message: 'Errore di connessione. Verifica la tua connessione internet.'
    };
  }
};
```

### 5. Gestione Stato Utente
```javascript
// Verifica se l'utente è loggato
const isLoggedIn = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return token && user;
};

// Ottieni dati utente corrente
const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

// Logout
const logout = async () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    // Chiamata logout al server
    await fetch('http://localhost:3000/api/users/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
  
  // Rimuovi dati locali
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirect alla home o login
  window.location.href = '/login';
};
```

---

## 🔧 Consigli per il Frontend

### 1. Gestione Token JWT
- Salva il token nel `localStorage` o `sessionStorage`
- Implementa auto-refresh del token se necessario
- Gestisci la scadenza del token automaticamente

### 2. Gestione degli Stati
- Usa stati di loading per le chiamate asincrone
- Implementa gestione errori user-friendly
- Gestisci gli stati di "non trovato" e "accesso negato"

### 3. Performance
- Implementa caching per dati che cambiano raramente (location, tipi spazio)
- Usa debouncing per le ricerche in tempo reale
- Implementa paginazione per liste lunghe

### 4. UX/UI
- Mostra feedback immediato per azioni dell'utente
- Implementa validazione client-side per form
- Gestisci gli stati offline/online

---

**📞 Contatti per Supporto**
- Per problemi API: Controlla prima la documentazione Swagger
- Per errori 500: Verifica i log del server
- Per problemi di autenticazione: Controlla la validità del token

---

*Ultimo aggiornamento: Agosto 2025*
