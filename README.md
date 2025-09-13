# CoWorkSpace

Piattaforma di gestione spazi di coworking con sistema di prenotazioni, pagamenti e gestione location.

## 📚 Documentazione

### 🧪 Testing
- **[📖 Guida Unit Test](docs/Testing_Guide.md)** - Documentazione completa test unitari
- **[🚀 Quick Start Testing](tests/README.md)** - Guida rapida per eseguire unit test
- **[📊 Coverage e Metriche](docs/Testing_Coverage_Guide.md)** - Come interpretare e migliorare il coverage
- **[📝 Esempi Pratici](docs/Testing_Examples_Guide.md)** - Template e esempi per scrivere unit test

### 🔧 Backend
- **[🌐 Backend Overview](docs/Backend_Overview_per_Frontend.md)** - Guida API per il frontend
- **[🔄 Sistema Ruoli](ROLE_SYSTEM_REFACTORING.md)** - Documentazione sistema utenti e ruoli
- **[🔒 Reset Password](docs/Password_Reset_Documentation.md)** - Implementazione reset password

### 🏗️ Setup e Deploy
- **[📋 Traccia Progetto](docs/traccia.txt)** - Requisiti e specifiche del progetto

## 🚀 Quick Start

### Prerequisiti
- Node.js (v16+)
- Docker Desktop
- PostgreSQL (opzionale, si può usare Docker)

### Installazione
```bash
# Clona il repository
git clone https://github.com/IlTetta/CoWorkSpace.git
cd CoWorkSpace

# Installa dipendenze
npm install

# Setup database (Docker)
docker-compose up -d

# Avvia il server
npm run dev
```

### Testing
```bash
# Esegui tutti i unit test
npm test

# Test con coverage
npm test -- --coverage

# Test specifico servizio
npm test AuthService
```

## 📁 Struttura Progetto

```
CoWorkSpace/
├── src/
│   ├── backend/           # API Node.js/Express
│   │   ├── controllers/   # Logic HTTP endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── middleware/    # Auth, validation, etc.
│   └── frontend/          # Interface web
├── tests/                 # Test unitari e di integrazione
│   ├── unit/             # Test business logic
│   ├── integration/      # Test API endpoints
│   └── helpers/          # Utilities test
├── docs/                 # Documentazione completa
└── scripts/              # Script utilità e deploy
```

## 🧪 Sistema di Unit Testing

### ✅ Coverage Attuale
- **Unit Tests**: 8 servizi completi (85%+ coverage)
- **Business Logic**: Completamente testata
- **Mock System**: Database, Firebase, Email isolati
- **Performance**: ~10 secondi esecuzione completa

### 🔧 Strumenti Test
- **Framework**: Jest
- **Mock System**: Completo per dipendenze esterne
- **Coverage**: Report integrato con soglie di qualità
- **Focus**: Business logic dei servizi

### 📊 Metriche Qualità
```
Overall Coverage:    85%+ statements
                    80%+ branches  
                    90%+ functions
                    85%+ lines
```

## 🏗️ Sezione Database

### Setup Database Produzione

#### 1. Requisiti:
* **Docker Desktop**: Assicurati di avere Docker Desktop installato sul tuo sistema.

#### 2. Configurazione e Avvio:
Il database viene avviato tramite Docker Compose, che gestirà un container PostgreSQL.

* **File necessari**: 
    *  `docker-compose.yml`
    * `init.sql` (schema database)
    * `seed_data.sql` (dati iniziali)

* **Avvio iniziale**:
    ```bash
    # Naviga alla directory progetto
    cd CoWorkSpace
    
    # Rimuovi container precedenti (se esistenti)
    docker-compose down -v
    
    # Avvia database
    docker-compose up -d
    ```

* **Connessione Database**:
    * **Host:** `localhost`
    * **Porta:** `5432`
    * **Database:** `coworkspace_db`
    * **User:** `coworkspace_user`
    * **Password:** `a_strong_password`

### Setup Database Test
Vedi [documentazione completa](docs/Test-Database-Setup.md) per setup database di test isolato.

## 🔧 Scripts Disponibili

### Development
```bash
npm run dev          # Server con auto-reload
npm start           # Server produzione
```

### Testing
```bash
npm test                 # Tutti i unit test
npm test AuthService     # Test specifico servizio
npm test -- --coverage  # Test con coverage report
npm test -- --watch     # Watch mode per development
```

## 📊 TODO Backend

1. ✅ **Test unitari** - Andrea (Completato - 8 servizi)
2. 🔄 **Notifiche E-mail** - Lore (In corso)
3. 🔄 **Notifiche push** - Lore (Pianificato)
4. 🔄 **Backup e gestione cloud DB** - Andrea (Pianificato)

## 📱 TODO Frontend

1. 🔄 **Adattabilità dispositivi** (Responsive design)
2. 🔄 **Comunicazione backend** (API integration)

## 🤝 Team

- **Backend & Testing**: Andrea
- **Frontend & Notifiche**: Lore
- **Database & DevOps**: Andrea

## 📞 Supporto

- **API Issues**: Controlla [Swagger docs](http://localhost:3000/api-docs)
- **Unit Test Issues**: Vedi [Testing Guide](docs/Testing_Guide.md)
- **Coverage Issues**: Controlla [Coverage Guide](docs/Testing_Coverage_Guide.md)

---

*Ultimo aggiornamento: Settembre 2025*