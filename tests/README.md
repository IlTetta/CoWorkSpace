# 🧪 CoWorkSpace Unit Tests

Guida rapida per eseguire e comprendere i **test unitari** del progetto.

## 🚀 Quick Start

```bash
# Esegui tutti i test unitari
npm test

# Test con coverage
npm test -- --coverage

# Test in watch mode
npm test -- --watch
```

## 📁 Struttura Test

```
tests/
├── unit/                    # Test unitari (8 servizi)
│   ├── AuthService.test.js          # Autenticazione e JWT
│   ├── BookingService.test.js       # Business logic prenotazioni
│   ├── PaymentService.test.js       # Gestione pagamenti
│   ├── LocationService.test.js      # CRUD location
│   ├── SpaceService.test.js         # CRUD spazi
│   ├── NotificationService.test.js  # Sistema notifiche
│   ├── AvailabilityService.test.js  # Gestione disponibilità
│   └── SpaceTypeService.test.js     # Tipi di spazio
├── helpers/                 # Utilities per test
│   └── testHelpers.js              # Helper condivisi
└── setup.js                # Configurazione globale
```

## ⚡ Comandi Rapidi

### Test Execution
```bash
npm test                    # Tutti i test unitari
npm test AuthService       # Test specifico servizio
npm test -- --watch        # Watch mode
npm test -- --coverage     # Con coverage report
npm test -- --verbose      # Output dettagliato
```

## 🎯 Test Esistenti

### ✅ Unit Tests (8 servizi completi)
- **AuthService**: JWT, login, logout, validazione ruoli
- **BookingService**: Prenotazioni, disponibilità, calcolo prezzi
- **PaymentService**: Pagamenti, statistiche, autorizzazioni
- **LocationService**: CRUD location, validazioni
- **SpaceService**: CRUD spazi, associazioni
- **NotificationService**: Email, template, errori SMTP
- **AvailabilityService**: Gestione disponibilità spazi
- **SpaceTypeService**: Tipi di spazio, configurazioni

### 🔧 Caratteristiche Test
- **Mock completi**: Database, Firebase, Email
- **Isolamento**: Ogni test indipendente
- **Coverage**: > 85% per tutti i servizi
- **Performance**: ~10 secondi esecuzione completa

## � Troubleshooting

### Mock Issues
I mock sono configurati in `setup.js`. Se hai problemi:
1. Controlla che le dipendenze siano mockate correttamente
2. Verifica `jest.clearAllMocks()` nei test
3. Controlla la configurazione delle variabili d'ambiente

### Test Timeout
```bash
# Test con timeout maggiore
npm test -- --testTimeout=60000

# Debug specifico
npm test AuthService -- --verbose
```

### Coverage Issues
```bash
# Verifica copertura specifica
npm test BookingService -- --coverage

# Report completo
npm test -- --coverage --verbose
```

## 📊 Coverage Target

- **Unit Tests**: > 90% per tutti i servizi
- **Overall Coverage**: > 85%

### Current Status
- ✅ **Unit Tests**: 8/8 servizi completi
- ✅ **Business Logic**: Completamente testata
- 🔄 **Missing**: Model tests, Utils tests (opzionali)

## 📝 Come Aggiungere Nuovi Test

### 1. Unit Test per nuovo Service
```bash
# Crea file
touch tests/unit/NuovoService.test.js

# Template base disponibile in Testing_Guide.md
```

### 2. Helper per setup comune
```javascript
// Usa mock semplici
const mockUser = { user_id: 1, role: 'user' };
const mockData = { id: 1, name: 'Test' };
```

## 🎯 Best Practices

1. **Isolation**: Ogni test indipendente
2. **Cleanup**: Sempre pulire dati dopo test
3. **Realistic Data**: Usa dati realistici
4. **Clear Names**: Nomi test descrittivi in italiano
5. **AAA Pattern**: Arrange, Act, Assert

## 📚 Documentazione Completa

Per documentazione dettagliata vedi:
- 📖 [`docs/Testing_Guide.md`](../docs/Testing_Guide.md) - Guida completa unit test
- 📖 [`docs/Testing_Coverage_Guide.md`](../docs/Testing_Coverage_Guide.md) - Coverage e metriche
- 📖 [`docs/Testing_Examples_Guide.md`](../docs/Testing_Examples_Guide.md) - Esempi pratici
- 📖 [`jest.config.json`](../jest.config.json) - Configurazione Jest

## 🚀 Prossimi Passi

### Test Opzionali da Aggiungere
- [ ] Model tests (Sequelize)
- [ ] Utils tests (funzioni utilità)
- [ ] Validation tests (middleware)

### Miglioramenti Coverage
- [ ] Edge cases aggiuntivi
- [ ] Error path completi
- [ ] Branch coverage > 90%

---

**🔧 Quick Fix Commands**
```bash
# Test completi con coverage
npm test -- --coverage

# Test specifico con debug
npm test AuthService -- --verbose

# Reset mock tra test
# (automatico con beforeEach in ogni test)
```

*Happy Unit Testing! 🎉*