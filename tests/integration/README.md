# Test di Integrazione CoWorkSpace

Questa directory contiene i test di integrazione end-to-end per l'applicazione CoWorkSpace.

## Setup Database per i Test

I test di integrazione utilizzano un database PostgreSQL reale (separato da quello di sviluppo).

### 1. Crea Database di Test

```sql
-- Connettiti a PostgreSQL come amministratore
CREATE DATABASE coworkspace_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE coworkspace_test TO test_user;
```

### 2. Configura Variabili d'Ambiente

Copia il file `.env.test.example` in `.env.test` e modifica i valori:

```bash
cp .env.test.example .env.test
```

Modifica `.env.test`:
```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password
TEST_DB_NAME=coworkspace_test
```

### 3. Inizializza Schema Database

Esegui lo script SQL per creare le tabelle nel database di test:

```bash
psql -h localhost -U test_user -d coworkspace_test -f init.sql
```

## Esecuzione Test

### Tutti i test di integrazione
```bash
npm run test:integration
```

### Test specifico per registrazione
```bash
npm run test:register
```

### Test con watch mode
```bash
npm run test:integration:watch
```

## Struttura Test

Ogni test di integrazione segue questo pattern:

1. **beforeAll**: Inizializza connessione database
2. **afterEach**: Pulisce i dati creati dal test
3. **afterAll**: Chiude connessione database

I test sono **indipendenti** e non dipendono dall'ordine di esecuzione.

## Test Disponibili

- `register.test.js` - Test endpoint `/api/users/register`
- (Altri test da aggiungere...)

## Note Importanti

- I test utilizzano il **database reale**, non mock
- Ogni test pulisce automaticamente i dati che crea
- I test sono isolati e possono girare in qualsiasi ordine
- Le email sono mockate per evitare invii reali durante i test