# Funzionalità Reset Password - Documentazione

## 📋 Panoramica

Questa documentazione descrive la nuova funzionalità di reset password implementata nel sistema CoWorkSpace. La funzionalità permette agli utenti di:

1. **Reset Password da "Password Dimenticata"**: L'utente riceve una password temporanea via email
2. **Cambio Password dal Profilo**: L'utente può iniziare il processo di cambio password dal suo profilo

## 🗃️ Modifiche al Database

### Nuovi Campi nella Tabella `users`

```sql
-- Campo booleano per indicare se l'utente deve resettare la password
is_password_reset_required BOOLEAN DEFAULT FALSE

-- Hash della password temporanea
temp_password_hash VARCHAR(255)

-- Timestamp di scadenza della password temporanea (24 ore)
temp_password_expires_at TIMESTAMP
```

### Migrazione

Per applicare le modifiche al database:

```bash
node src/run_password_reset_migration.js
```

## 🔗 Nuovi Endpoint API

### 1. Richiesta Reset Password (Password Dimenticata)

**POST** `/api/users/request-password-reset`

```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Se l'email è registrata, riceverai le istruzioni per il reset"
}
```

### 2. Inizia Cambio Password dal Profilo

**POST** `/api/users/initiate-password-change`

*Richiede autenticazione*

**Response:**
```json
{
  "status": "success",
  "message": "Richiesta cambio password impostata. Verrai reindirizzato al cambio password",
  "data": {
    "user": { ... },
    "requiresPasswordReset": true
  }
}
```

### 3. Cambio Password (Aggiornato)

**PUT** `/api/users/change-password`

*Richiede autenticazione*

```json
{
  "currentPassword": "password_attuale_o_temporanea",
  "newPassword": "nuova_password"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password modificata con successo"
}
```

### 4. Login (Aggiornato)

**POST** `/api/users/login`

```json
{
  "email": "user@example.com",
  "password": "password_o_temporanea"
}
```

**Response (se richiede reset):**
```json
{
  "status": "success",
  "message": "Login avvenuto con successo",
  "data": {
    "token": "jwt_token",
    "user": { ... },
    "requiresPasswordReset": true
  }
}
```

## 🔄 Flusso Funzionalità

### Scenario 1: Password Dimenticata

1. **User**: Clicca "Password dimenticata" nel login
2. **Frontend**: Chiama `POST /api/users/request-password-reset`
3. **Backend**: 
   - Genera password temporanea (12 caratteri)
   - Salva hash nel campo `temp_password_hash`
   - Imposta `is_password_reset_required = true`
   - Imposta scadenza a 24 ore
   - Invia email con password temporanea
4. **User**: Riceve email con password temporanea
5. **User**: Fa login con password temporanea
6. **Frontend**: Riceve `requiresPasswordReset: true` e reindirizza al cambio password
7. **User**: Inserisce password temporanea e nuova password
8. **Backend**: Aggiorna password e resetta tutti i flag

### Scenario 2: Cambio Password dal Profilo

1. **User**: Nel profilo clicca "Cambia Password"
2. **Frontend**: Chiama `POST /api/users/initiate-password-change`
3. **Backend**: Imposta `is_password_reset_required = true`
4. **Frontend**: Reindirizza al cambio password
5. **User**: Inserisce password attuale e nuova password
6. **Backend**: Aggiorna password e resetta il flag

## 📧 Template Email

Il template `password_reset.html` è stato aggiornato per includere:
- Password temporanea visibile
- Istruzioni chiare sul processo
- Avviso di scadenza (24 ore)
- Link di accesso diretto

## 🔒 Sicurezza

- **Password temporanee**: Scadono dopo 24 ore
- **Generazione sicura**: Usa `crypto.randomBytes()` + suffisso per requisiti password
- **Rate limiting**: Applicato agli endpoint di reset
- **Hashing**: Password temporanee sono hashate con bcrypt
- **Validazione**: Mantiene tutti i controlli di validazione esistenti

## 🧪 Testing

### Test Manuale

1. **Test Password Dimenticata**:
   ```bash
   curl -X POST http://localhost:3000/api/users/request-password-reset \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Test Login con Password Temporanea**:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "temp_password_from_email"}'
   ```

3. **Test Cambio Password**:
   ```bash
   curl -X PUT http://localhost:3000/api/users/change-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"currentPassword": "temp_password", "newPassword": "NewSecurePass123!"}'
   ```

## 🚀 Frontend Integration

### Modifiche Richieste nel Frontend

1. **Pagina Login**: 
   - Aggiungere pulsante "Password dimenticata"
   - Gestire response con `requiresPasswordReset: true`

2. **Modale Reset Password**:
   - Form con campo email
   - Chiamata API `request-password-reset`

3. **Pagina Cambio Password**:
   - Rilevare se utente è in modalità reset
   - Adattare labels ("Password temporanea" vs "Password attuale")
   - Gestire redirect dopo cambio password

4. **Profilo Utente**:
   - Aggiungere pulsante "Cambia Password"
   - Chiamata API `initiate-password-change`

### Esempi di Codice Frontend

```javascript
// Check login response
const loginResponse = await api.post('/users/login', { email, password });
if (loginResponse.data.requiresPasswordReset) {
  // Redirect to password change page
  router.push('/change-password');
}

// Request password reset
const resetResponse = await api.post('/users/request-password-reset', { email });
// Show success message

// Initiate password change from profile
const initiateResponse = await api.post('/users/initiate-password-change');
if (initiateResponse.data.requiresPasswordReset) {
  router.push('/change-password');
}
```

## 📝 Note per gli Sviluppatori

- I metodi esistenti rimangono funzionanti per compatibilità
- Le password temporanee sono generate automaticamente
- Il sistema pulisce automaticamente i dati temporanei dopo il reset
- Tutti gli errori sono gestiti con messaggi user-friendly
- La funzionalità è completamente retrocompatibile
