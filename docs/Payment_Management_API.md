# API Gestione Pagamenti Prenotazioni

## Panoramica

Il sistema ora include funzionalità complete per la gestione dei pagamenti delle prenotazioni, con endpoint dedicati per:

- **Importo totale da pagare** per un utente
- **Lista prenotazioni non pagate** con dettagli e urgenza
- **Statistiche pagamenti** complete
- **Endpoint semplificati** per utenti loggati

## Nuove API

### 1. Riepilogo Pagamenti Utente

```javascript
GET /api/bookings/user/:userId/payment-summary
```

**Parametri Query Opzionali:**
- `location_id`: Filtra per location specifica
- `date_from`: Data inizio periodo  
- `date_to`: Data fine periodo
- `status`: Stato prenotazione (pending, confirmed, etc.)

**Risposta:**
```javascript
{
    "success": true,
    "data": {
        "user_id": 123,
        "summary": {
            "total_bookings": 5,
            "total_amount": 850.00,
            "total_hours": 32.5,
            "earliest_booking": "2024-01-20T09:00:00Z",
            "latest_booking": "2024-02-15T14:00:00Z"
        },
        "breakdown_by_location": [
            {
                "location_id": 1,
                "location_name": "Milano Centro",
                "city": "Milano",
                "bookings_count": 3,
                "amount": 600.00,
                "hours": 24.0
            },
            {
                "location_id": 2,
                "location_name": "Roma EUR",
                "city": "Roma", 
                "bookings_count": 2,
                "amount": 250.00,
                "hours": 8.5
            }
        ],
        "has_pending_payments": true
    }
}
```

### 2. Prenotazioni Non Pagate

```javascript
GET /api/bookings/user/:userId/unpaid
```

**Parametri Query Opzionali:**
- `location_id`: Filtra per location
- `date_from` / `date_to`: Periodo
- `status`: Stato prenotazione
- `space_type_id`: Tipo di spazio
- `due_soon=true`: Solo prenotazioni in scadenza (entro 7 giorni)
- `overdue_only=true`: Solo pagamenti in ritardo (>3 giorni dalla creazione)
- `sort_by`: Ordinamento (`amount_desc`, `amount_asc`, `date_asc`, `overdue`)
- `limit`: Numero massimo risultati

**Risposta:**
```javascript
{
    "success": true,
    "data": [
        {
            "booking_id": 456,
            "space_id": 1,
            "space_name": "Sala Riunioni A",
            "space_type_name": "Meeting Room",
            "location_name": "Milano Centro",
            "location_city": "Milano",
            "start_datetime": "2024-01-22T14:00:00Z",
            "end_datetime": "2024-01-22T18:00:00Z",
            "total_hours": 4.0,
            "total_price": 200.00,
            "status": "confirmed",
            "payment_status": "pending",
            "created_at": "2024-01-19T10:30:00Z",
            "days_until_booking": 2,
            "payment_overdue": false,
            "payment_urgency": "warning", // urgent, warning, normal
            "notes": "Riunione importante"
        }
        // ... altre prenotazioni
    ],
    "filters": {
        "sort_by": "date_asc"
    }
}
```

### 3. Statistiche Pagamenti

```javascript
GET /api/bookings/user/:userId/payment-stats
```

**Risposta:**
```javascript
{
    "success": true,
    "data": {
        "user_id": 123,
        "payment_summary": {
            "pending_bookings": 5,
            "paid_bookings": 15,
            "failed_bookings": 1,
            "refunded_bookings": 2,
            "total_bookings": 23
        },
        "amounts": {
            "pending_amount": 850.00,
            "paid_amount": 2340.00,
            "failed_amount": 120.00,
            "refunded_amount": 180.00,
            "avg_booking_amount": 156.50
        },
        "urgency_indicators": {
            "overdue_bookings": 1,      // Pagamenti in ritardo
            "due_soon_bookings": 2,     // Prenotazioni entro 7 giorni
            "needs_attention": true     // Richiede attenzione immediata
        }
    }
}
```

### 4. Endpoint Semplificato per Utente Loggato

```javascript
GET /api/bookings/my-payments?type=summary
GET /api/bookings/my-payments?type=unpaid
GET /api/bookings/my-payments?type=stats
```

**Vantaggi:**
- Non serve specificare l'ID utente (usa quello loggato)
- Parametro `type` per scegliere il tipo di informazioni
- Stesso formato delle API complete

## Logica di Urgenza Pagamenti

### Classificazione Automatica:

- **🔴 URGENT** (payment_urgency: "urgent"):
  - Pagamento già in ritardo (>3 giorni dalla creazione)
  - Prenotazione inizia entro 24 ore
  
- **🟡 WARNING** (payment_urgency: "warning"):
  - Prenotazione inizia entro 3 giorni
  
- **🟢 NORMAL** (payment_urgency: "normal"):
  - Prenotazione con tempo sufficiente

### Indicatori Automatici:

- `payment_overdue`: true se creata >3 giorni fa
- `days_until_booking`: giorni rimanenti alla prenotazione
- `needs_attention`: true se ci sono pagamenti urgenti

## Autorizzazioni

### Utenti Normali:
- ✅ Possono vedere solo i **propri** pagamenti
- ✅ Endpoint `/my-payments` sempre accessibile

### Manager/Admin:
- ✅ Possono vedere pagamenti di **qualsiasi utente**
- ✅ Utile per supporto clienti e gestione

## Esempi di Utilizzo

### Frontend: Dashboard Utente
```javascript
// Ottieni riepilogo rapido
const response = await fetch('/api/bookings/my-payments?type=summary');
const { total_amount, has_pending_payments } = response.data.summary;

if (has_pending_payments) {
    showPaymentAlert(`Hai ${total_amount}€ di pagamenti in sospeso`);
}
```

### Frontend: Lista Pagamenti Urgenti
```javascript
// Ottieni solo pagamenti urgenti
const response = await fetch('/api/bookings/my-payments?type=unpaid&overdue_only=true&sort_by=overdue');

response.data.forEach(booking => {
    if (booking.payment_urgency === 'urgent') {
        showUrgentPaymentNotification(booking);
    }
});
```

### Admin: Monitoraggio Pagamenti
```javascript
// Statistiche utente per supporto
const userId = 123;
const stats = await fetch(`/api/bookings/user/${userId}/payment-stats`);

if (stats.data.urgency_indicators.needs_attention) {
    flagUserForFollowUp(userId);
}
```

### Mobile App: Notifiche Push
```javascript
// Controllo pagamenti in scadenza
const unpaid = await fetch('/api/bookings/my-payments?type=unpaid&due_soon=true');

unpaid.data.forEach(booking => {
    if (booking.days_until_booking <= 1) {
        scheduleUrgentNotification(booking);
    }
});
```

## Filtri Avanzati Disponibili

### Per Data:
```javascript
// Pagamenti per il prossimo mese
GET /api/bookings/my-payments?type=unpaid&date_from=2024-02-01&date_to=2024-02-29

// Solo prenotazioni imminenti
GET /api/bookings/my-payments?type=unpaid&due_soon=true
```

### Per Location:
```javascript
// Solo Milano
GET /api/bookings/user/123/unpaid?location_id=1

// Multiple location
GET /api/bookings/user/123/unpaid?location_id=1,2,3
```

### Per Urgenza:
```javascript
// Solo pagamenti in ritardo
GET /api/bookings/my-payments?type=unpaid&overdue_only=true&sort_by=overdue

// Ordinati per importo
GET /api/bookings/my-payments?type=unpaid&sort_by=amount_desc
```

## Stati Payment Status

- **pending**: In attesa di pagamento ⏳
- **completed**: Pagato ✅  
- **failed**: Pagamento fallito ❌
- **refunded**: Rimborsato 💰

Le nuove API si concentrano principalmente su `payment_status = 'pending'` per identificare cosa deve essere ancora pagato.
