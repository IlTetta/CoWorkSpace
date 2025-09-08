# CoWorkSpace

## Sezione Database

Questa sezione fornisce le istruzioni per configurare e gestire il database PostgreSQL utilizzato dal progetto **CoWorkSpace**.

### 1. Requisiti:
* **Docker Desktop**: Assicurati di avere Docker Desktop installato sul tuo sistema.

### 2. Configurazione e Avvio del Database:
Il database viene avviato tramite Docker Compose, che gestirà un container PostgreSQL.
* **File necessari**: Assicurati che i seguenti file siano presenti nella directory radice del progetto:
    *  <code>docker-compose.yml</code>
    * <code>init.sql</code> (contiene lo schema del database)
    * <code>seed.sql</code> (contiene dei dati di esempio iniziali)
* **Avvio iniziale (creazione dello schem e popolamento):**<br>
Per avviare il database per la prima volte, creare lo schema e popolarlo con i dati iniziali, segui questi passaggi:
    1. **Naviga alla directory radice del progetto** nel tuo terminale:<br>
    <code>cd path/to/root/project </code>
    2. **Ferma e rimuovi eventuali container Docker preesistenti** (questo è cruciale per garantire una configurazione pulita ad ogni avvio, specialmente dopo modifiche allo schema):<br>
    <code>docker-compose down -v</code>
    3. **Avvia il container del database:**<br>
    <code> docker-compose up -d</code><br>
    Questo comando avvierà il container PostgreSQL in background. Il file <code>init.sql</code> verrà automaticamente eseguito all'avvio del container per creare lo schema del database.
    Successivamente, potrai eseguire <code>seed.sql</code> per popolare i dati.
* **Avvio successivo (se il database è già configurato):**
Se il database è già stato inizializzato e vuoi semplicemente avviarlo, puoi usare:<br>
<code>docker-compose up -d</code>

* **Arresto del database:**
Per arrestare il container del database:<br>
<code>docker-compose down</code>

### 3. Connessione al Database (es. con DBeaver):
Puoi connetteri al database utilizzando un client SQL come DBeaver per ispezionare lo schema e i dati.
* **Dettagli connessione**:
    * **Host:** <code>localhost</code>
    * **Porta:** <code>5432</code> (controllare che non sia già usata da qualche altro servizio)
    * **Nome Database:** <code>coworkspace_db</code>
    * **Utente:** <code>coworkspace_user</code>
    * **Password:**<code>a_strong_password</code> (deve essere la stessa che è configurata nel <code>docker-compose.yml</code>)
* **Popolamento dati iniziali (<code>seed.sql</code>):**
Dopo il primo avvio, se il database è vuoto, puoi eseguire il file <code>seed.sql</code> per inserire dati di esempio.
    1. Connettiti al database tramite DBeaver.
    2. Apri il file <code>seed.sql</code> nel tuo client SQL.
    3. Esegui lo script SQL.

## Sezione Testing

Questa sezione fornisce le istruzioni per eseguire e comprendere i test del progetto **CoWorkSpace**.

### 1. Tipi di Test:
Il progetto include due tipi principali di test:
* **Unit Tests**: Testano singole funzioni, modelli e servizi in isolamento
* **Integration Tests**: Testano i flussi completi dell'API end-to-end

### 2. Setup Test Environment:
I test sono configurati per funzionare automaticamente con:
* **Database**: Utilizza lo stesso database PostgreSQL di sviluppo
* **Autenticazione**: JWT tokens generati dinamicamente per i test
* **Cleanup**: I dati di test vengono automaticamente puliti dopo ogni test

### 3. Comandi per Eseguire i Test:

#### Esegui tutti i test:
```bash
npm test
```

#### Esegui solo i test di integrazione:
```bash
npm test -- tests/integration/
```

#### Esegui solo i test unitari:
```bash
npm test -- tests/unit/
```

#### Esegui test specifici:
```bash
# Test di autenticazione
npm test -- --testPathPattern=auth.integration.test.js

# Test di booking
npm test -- --testPathPattern=booking.integration.test.js
```

### 4. Struttura dei Test:

#### Test di Integrazione - Autenticazione (4 test):
- ✅ Registrazione nuovo utente
- ✅ Validazione email invalida
- ✅ Login con credenziali valide
- ✅ Accesso al profilo con token JWT

#### Test di Integrazione - Sistema Booking (12 test):
- ✅ Verifica disponibilità spazi (pubblico)
- ✅ Calcolo prezzi prenotazioni (pubblico)
- ✅ Creazione prenotazioni (autenticato)
- ✅ Recupero prenotazioni utente (autenticato)
- ✅ Validazione dati di input
- ✅ Gestione sovrapposizioni e limiti temporali
- ✅ Controllo autorizzazioni

### 5. Coverage Test:
I test coprono i seguenti aspetti:
* **API Endpoints**: Tutti gli endpoint principali di auth e booking
* **Business Logic**: Validazioni, autorizzazioni, regole di business
* **Error Handling**: Gestione realistica degli errori
* **Data Validation**: Controllo input e output
* **Security**: Autenticazione JWT e controlli permessi

### 6. Test Output:
Un esecuzione completa dovrebbe mostrare:
```
Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        ~30s
```

### 7. Debugging Test:
Se i test falliscono:
1. Verifica che il database sia avviato (`docker-compose up -d`)
2. Controlla che le variabili d'ambiente siano configurate (`.env`)
3. Verifica i log dettagliati nell'output dei test

### 8. Requisiti per i Test:
* **Node.js** versione compatibile
* **PostgreSQL** database attivo
* **Dipendenze** installate (`npm install`)
* **File .env** configurato correttamente