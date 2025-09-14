# CoWorkSpace

## 📋 Descrizione
Piattaforma completa per la gestione di spazi di coworking con sistema di prenotazioni, pagamenti e gestione location.

## 🚀 Caratteristiche Principali

### 👥 Gestione Utenti e Ruoli
- Amministratori (gestione completa piattaforma)
- Manager (gestione spazi)
- Utenti (prenotazioni e utilizzo servizi)

### 🏢 Gestione Spazi
- Múltiple location
- Diversi tipi di spazi (uffici, sale riunioni, postazioni)
- Gestione disponibilità in tempo reale
- Servizi aggiuntivi configurabili

### 🔐 Sistema di Autenticazione

#### Login
1. Accesso via email/password o OAuth (Google, Facebook)
2. Validazione credenziali tramite Firebase
3. Generazione JWT token
4. Reindirizzamento al dashboard specifico

#### Reset Password
1. Richiesta reset da `reset-password.html`
2. Email con link temporaneo (1 ora validità)
3. Inserimento nuova password
4. Notifica email di conferma
5. Log per sicurezza

### 📅 Sistema Prenotazioni

#### Flusso Booking
1. **Ricerca Spazi**:
   - Filtri (location, data, capienza)
   - Calendario disponibilità
   - Visualizzazione prezzi

2. **Processo Prenotazione**:
   - Selezione data/ora
   - Servizi aggiuntivi
   - Numero partecipanti
   - Verifica disponibilità real-time

3. **Gestione**:
   - Conferma automatica/manuale
   - Notifiche email
   - Politiche cancellazione

### 💳 Pagamenti

#### Metodi Supportati
- Carte credito/debito
- PayPal
- Bonifico bancario
- Wallet interno

#### Processo
1. Scelta metodo
2. Verifica importo
3. Processamento sicuro
4. Fatturazione automatica
5. Notifica conferma

#### Rimborsi
- Automatici secondo policy
- Rimborsi parziali
- Crediti su wallet
- Notifiche stato

## 🛠️ Tecnologie

### Backend
- Node.js/Express
- PostgreSQL
- Firebase Auth
- JWT
- Docker

### Frontend
- HTML5/CSS3
- JavaScript
- Design Responsive

## 📁 Struttura Progetto
```
CoWorkSpace/
├── src/
│   ├── backend/           # API Node.js/Express
│   │   ├── controllers/   # Logica endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Modelli database
│   │   ├── routes/        # Route API
│   │   └── middleware/    # Auth, validazioni
│   └── frontend/          # Interface web
├── tests/                 # Test
│   ├── unit/             # Test unitari
│   ├── integration/      # Test API
│   └── helpers/          # Utility test
├── docs/                 # Documentazione
└── scripts/              # Script utility
```

## 🚀 Setup

### Prerequisiti
- Node.js (v16+)
- Docker Desktop
- PostgreSQL (opzionale, disponibile via Docker)

### Installazione
```bash
# Clone repository
git clone https://github.com/IlTetta/CoWorkSpace.git
cd CoWorkSpace

# Installazione dipendenze
npm install

# Avvio database (Docker)
docker-compose up -d

# Avvio server
npm run dev
```

## 🧪 Testing

### Comandi
```bash
# Tutti i test
npm test

# Test con coverage
npm test -- --coverage

# Test specifico
npm test AuthService

# Modalità watch
npm test -- --watch
```

### Coverage
- **Unit Tests**: 85%+ coverage
- **Business Logic**: Test completi
- **Mock System**: DB, Firebase, Email
- **Performance**: ~10s esecuzione

## 📊 Metriche Qualità
```
Coverage:   85%+ statements
           80%+ branches  
           90%+ functions
           85%+ lines
```

## 🗄️ Database

### Configurazione Produzione
- **Host:** localhost
- **Porta:** 5432
- **Database:** coworkspace_db

### File Necessari
- `docker-compose.yml`
- `init.sql` (schema)
- `seed_data.sql` (dati iniziali)



### Frontend
1. 🔄 Design Responsive
2. 🔄 Integrazione API



## 🆘 Supporto
- **API**: [Swagger docs](http://localhost:3000/api-docs)
- **Testing**: [Guida Test](docs/Testing_Guide.md)
- **Coverage**: [Guida Coverage](docs/Testing_Coverage_Guide.md)

## 🔐 Sicurezza
- SSL/TLS
- Tokenizzazione dati pagamento
- Conformità PCI DSS
- Log operazioni
- Monitoraggio attività

