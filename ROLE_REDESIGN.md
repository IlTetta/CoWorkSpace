# 🎯 RIPROGETTAZIONE RUOLI COWORKSPACE

## Problema Identificato
Il sistema attuale ha una confusione sui ruoli, particolarmente per i **Manager** che sono limitati alle proprie location ma non hanno abbastanza privilegi per gestirle efficacemente.

## Nuova Definizione dei Ruoli

### 👤 **USER (Utente Standard)**
**Responsabilità:** Cliente che utilizza gli spazi
- ✅ Navigare spazi pubblicamente (senza auth)
- ✅ Registrarsi autonomamente  
- ✅ Prenotare spazi per se stesso
- ✅ Pagare le proprie prenotazioni
- ✅ Gestire il proprio profilo
- ❌ NON può vedere prenotazioni di altri
- ❌ NON può gestire spazi o location

### 🏢 **MANAGER (Gestore Sede)** 
**Responsabilità:** Responsabile operativo di una o più sedi
- ✅ **Gestione Spazi**: CRUD completo su spazi delle proprie location
- ✅ **Gestione Orari**: Impostare disponibilità, orari apertura, giorni festivi
- ✅ **Gestione Prenotazioni**: Vedere/modificare TUTTE le prenotazioni delle proprie sedi
- ✅ **Assistenza Clienti**: Prenotare per conto di clienti, gestire problemi
- ✅ **Gestione Pagamenti**: Vedere/aggiornare tutti i pagamenti delle proprie sedi
- ✅ **Reports**: Dashboard completa delle proprie location
- ❌ NON può gestire utenti o location di altri manager
- ❌ NON può creare/eliminare location

### ⚙️ **ADMIN (Amministratore Sistema)**
**Responsabilità:** Controllo completo del sistema
- ✅ **Gestione Utenti**: CRUD su tutti gli utenti, assegnare ruoli
- ✅ **Gestione Location**: CRUD su tutte le location, assegnare manager
- ✅ **Supervisione**: Accesso completo a tutti i dati
- ✅ **Configurazioni**: Impostazioni sistema, integrazioni
- ✅ **Support**: Supporto di livello superiore
- ✅ **Override**: Può fare tutto quello che fa un manager, ma su tutte le location

## Modifiche Richieste nel Codice

### 1. Permissions Manager (Da Espandere)
**File da modificare:** `src/backend/services/*Service.js`

```javascript
// ATTUALE (troppo restrittivo)
if (currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
    throw AppError.forbidden('Non hai accesso a questa location');
}

// NUOVO (manager dovrebbe vedere TUTTO della sua location)
static async canManageLocationResources(resource, currentUser) {
    if (currentUser.role === 'admin') return true;
    
    if (currentUser.role === 'manager') {
        const location = await this.getResourceLocation(resource);
        return location.manager_id === currentUser.user_id;
    }
    
    return false;
}
```

### 2. Nuovi Endpoints Manager
**File da creare/modificare:** `src/backend/controllers/*Controller.js`

```javascript
// Manager dovrebbe poter vedere TUTTE le prenotazioni delle sue sedi
exports.getLocationBookings = catchAsync(async (req, res) => {
    const locationId = req.params.locationId;
    
    // Verifica che il manager gestisca questa location
    if (!await LocationService.canManageLocation(locationId, req.user)) {
        throw AppError.forbidden('Non gestisci questa location');
    }
    
    const bookings = await BookingService.getLocationBookings(locationId);
    return ApiResponse.list(res, bookings);
});
```

### 3. Dashboard Manager Potenziata
**Nuove funzionalità richieste:**
- Calendario prenotazioni per location
- Statistiche occupazione in tempo reale
- Gestione clienti frequenti
- Tools di marketing (promozioni, sconti)

### 4. Admin Tools
**Funzionalità riservate solo agli admin:**
- User management completo
- Location management
- System settings
- Cross-location reports
- Data export/import

## API Changes Summary

| Endpoint | Attuale | Nuovo | Motivo |
|----------|---------|-------|--------|
| `GET /bookings` | Manager vede solo le sue prenotazioni | Manager vede TUTTE le prenotazioni delle sue location | Manager deve gestire operativamente la sede |
| `POST /bookings` | Manager limitato | Manager può prenotare per clienti | Assistenza clienti |
| `PATCH /payments/:id` | Solo propri pagamenti | Tutti i pagamenti delle proprie location | Gestione operativa |
| `GET /spaces/statistics` | Limitato | Statistiche complete location | Decision making |
| `POST /users` | Nessuno | Solo Admin | Controllo accessi |

## Benefici della Riprogettazione

1. **Chiarezza dei Ruoli**: Ogni ruolo ha responsabilità ben definite
2. **Efficienza Operativa**: Manager possono gestire efficacemente le sedi
3. **Scalabilità**: Admin possono supervisionare senza micromanagement
4. **Sicurezza**: Controlli appropriati per ogni livello
5. **User Experience**: Clienti hanno un'esperienza fluida

## Priority Implementation

### 🔥 Alta Priorità
- [ ] Espandere permissions Manager per gestione completa location
- [ ] Dashboard manager con statistiche real-time
- [ ] Tools admin per user management

### 🟡 Media Priorità  
- [ ] Sistema notifiche per manager
- [ ] Tools marketing per manager
- [ ] Advanced reporting per admin

### 🟢 Bassa Priorità
- [ ] Mobile-specific manager features
- [ ] Advanced analytics
- [ ] Integration tools

## Testing Requirements

Ogni modifica deve includere:
- [ ] Unit tests per nuove permissions
- [ ] Integration tests per nuovi endpoints  
- [ ] E2E tests per flussi completi
- [ ] Security tests per privilege escalation

---
**Obiettivo:** Rendere i Manager efficaci nella gestione operativa delle sedi, mantenendo gli Admin focalizzati sulla supervisione e configurazione del sistema.
