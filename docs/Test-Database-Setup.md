# 🐳 Setup Docker per Database di Test

Questa guida ti spiega come configurare e utilizzare un database PostgreSQL separato per i test di integrazione usando Docker.

## 📋 Prerequisiti

- Docker e Docker Compose installati
- Node.js e npm installati
- Il progetto CoWorkSpace clonato

## 🚀 Setup Rapido

### 1. Crea il file di configurazione test

```powershell
# Copia il file di configurazione di esempio
copy .env.test.example .env.test
```

Il file `.env.test` è già configurato per Docker, non devi modificare nulla!

### 2. Avvia il database di test

```powershell
# Opzione 1: Usa lo script PowerShell (raccomandato)
.\scripts\test-db.ps1 start

# Opzione 2: Usa npm script
npm run test:db:start

# Opzione 3: Usa docker-compose direttamente
docker-compose -f docker-compose.test.yml up -d test-db
```

### 3. Esegui i test

```powershell
# Esegui tutti i test di integrazione
npm run test:integration

# Oppure usa lo script che gestisce tutto automaticamente
npm run test:full

# Esegui solo il test di registrazione
npm run test:register
```

## 🛠️ Comandi Disponibili

### Script PowerShell (raccomandato)

```powershell
.\scripts\test-db.ps1 start      # Avvia il database di test
.\scripts\test-db.ps1 stop       # Ferma il database di test
.\scripts\test-db.ps1 restart    # Riavvia il database di test
.\scripts\test-db.ps1 reset      # Resetta completamente il database
.\scripts\test-db.ps1 logs       # Mostra i log del database
.\scripts\test-db.ps1 status     # Mostra lo stato dei servizi
.\scripts\test-db.ps1 test       # Avvia i test (gestisce tutto automaticamente)
.\scripts\test-db.ps1 shell      # Apri una shell nel database
```

### NPM Scripts

```powershell
npm run test:db:start           # Avvia database di test
npm run test:db:stop            # Ferma database di test
npm run test:db:reset           # Resetta database di test
npm run test:db:logs            # Mostra log database
npm run test:db:status          # Stato servizi
npm run test:full               # Esegui test completi

npm run test:integration        # Solo test (database deve essere già avviato)
npm run test:register           # Solo test registrazione
```

## 🗄️ Dettagli Database di Test

- **Host**: `localhost`
- **Porta**: `5433` (diversa dalla produzione per evitare conflitti)
- **Database**: `coworkspace_test_db`
- **Username**: `coworkspace_test_user`
- **Password**: `test_password_secure`

## 🔄 Workflow Tipico

### Primo Setup
```powershell
# 1. Setup iniziale
copy .env.test.example .env.test
.\scripts\test-db.ps1 start

# 2. Esegui test
npm run test:integration
```

### Uso Quotidiano
```powershell
# Avvia database se non è già attivo
.\scripts\test-db.ps1 status
.\scripts\test-db.ps1 start      # Se necessario

# Esegui test
npm run test:register            # Test specifico
npm run test:integration         # Tutti i test

# Resetta database se hai problemi
.\scripts\test-db.ps1 reset
```

### Debug
```powershell
# Controlla log del database
.\scripts\test-db.ps1 logs

# Accedi al database per query manuali
.\scripts\test-db.ps1 shell
```

## 🔧 Configurazione Avanzata

### Variabili d'Ambiente (.env.test)

Il file è già configurato per Docker, ma puoi personalizzare:

```env
# Per connessione locale (se non usi Docker)
TEST_DB_HOST=localhost
TEST_DB_PORT=5433

# Debug avanzato
TEST_VERBOSE=true

# Disabilita email nei test
EMAIL_USER=""
EMAIL_PASS=""
```

### Personalizzazione Docker

Modifica `docker-compose.test.yml` per:
- Cambiare porta del database
- Modificare credenziali
- Aggiungere configurazioni PostgreSQL

## 🐛 Troubleshooting

### Database non si avvia
```powershell
# Controlla i log
.\scripts\test-db.ps1 logs

# Verifica che la porta 5433 sia libera
netstat -an | findstr 5433

# Resetta tutto
.\scripts\test-db.ps1 reset
```

### Test falliscono
```powershell
# Verifica connessione database
.\scripts\test-db.ps1 status

# Controlla configurazione
type .env.test

# Resetta database
.\scripts\test-db.ps1 reset
```

### Conflitti con database produzione
Il database di test usa:
- Porta diversa (5433 vs 5432)
- Nome database diverso
- Container separato

Non ci dovrebbero essere conflitti!

## ✅ Vantaggi di questa Configurazione

1. **🔒 Isolamento**: Database test completamente separato dalla produzione
2. **🚀 Velocità**: Database in memoria (tmpfs) per test più veloci
3. **🧹 Pulizia**: Ogni test pulisce automaticamente i propri dati
4. **🔄 Riproducibilità**: Stesso ambiente per tutti gli sviluppatori
5. **🐳 Portatile**: Funziona su qualsiasi sistema con Docker

## 🎯 Prossimi Passi

Ora puoi:
1. ✅ Eseguire i test di registrazione: `npm run test:register`
2. 🚀 Creare nuovi test per altri endpoint (login, booking, etc.)
3. 📊 Aggiungere report di coverage: `npm run test:coverage`

Happy Testing! 🎉