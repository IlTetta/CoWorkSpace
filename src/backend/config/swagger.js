const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoWorkSpace API',
      version: '1.0.0',
      description: 'API per la gestione di spazi coworking - Sistema completo per prenotazioni, gestione utenti e pagamenti',
      contact: {
        name: 'CoWorkSpace Team',
        email: 'info@coworkspace.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.coworkspace.com/api',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT per autenticazione'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password_hash', 'name', 'surname', 'role'],
          properties: {
            user_id: {
              type: 'integer',
              description: 'ID unico dell\'utente (chiave primaria)',
              example: 1
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Nome dell\'utente',
              example: 'Mario'
            },
            surname: {
              type: 'string',
              maxLength: 100,
              description: 'Cognome dell\'utente',
              example: 'Rossi'
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              description: 'Email dell\'utente (deve essere unica)',
              example: 'mario.rossi@email.com'
            },
            password_hash: {
              type: 'string',
              maxLength: 255,
              description: 'Hash della password dell\'utente',
              writeOnly: true
            },
            role: {
              type: 'string',
              enum: ['user', 'manager', 'admin'],
              description: 'Ruolo dell\'utente',
              example: 'user'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data di creazione dell\'account',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        Location: {
          type: 'object',
          required: ['location_name', 'address', 'city'],
          properties: {
            location_id: {
              type: 'integer',
              description: 'ID unico della location (chiave primaria)',
              example: 1
            },
            location_name: {
              type: 'string',
              maxLength: 255,
              description: 'Nome della location',
              example: 'CoWork Milano Centro'
            },
            address: {
              type: 'string',
              maxLength: 255,
              description: 'Indirizzo completo',
              example: 'Via Brera 10, Milano'
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'Città',
              example: 'Milano'
            },
            description: {
              type: 'string',
              description: 'Descrizione della location',
              example: 'Moderno spazio coworking nel cuore di Milano'
            },
            manager_id: {
              type: 'integer',
              description: 'ID del manager responsabile della location',
              example: 2,
              nullable: true
            }
          }
        },
        SpaceType: {
          type: 'object',
          required: ['type_name'],
          properties: {
            space_type_id: {
              type: 'integer',
              description: 'ID unico del tipo di spazio (chiave primaria)',
              example: 1
            },
            type_name: {
              type: 'string',
              maxLength: 100,
              description: 'Nome del tipo di spazio (deve essere unico)',
              example: 'Stanza privata'
            },
            description: {
              type: 'string',
              description: 'Descrizione del tipo di spazio',
              example: 'Ufficio privato con scrivania e sedia ergonomica'
            }
          }
        },
        Space: {
          type: 'object',
          required: ['location_id', 'space_type_id', 'space_name', 'capacity', 'price_per_hour', 'price_per_day'],
          properties: {
            space_id: {
              type: 'integer',
              description: 'ID unico dello spazio (chiave primaria)',
              example: 1
            },
            location_id: {
              type: 'integer',
              description: 'ID della location di appartenenza',
              example: 1
            },
            space_type_id: {
              type: 'integer',
              description: 'ID del tipo di spazio',
              example: 1
            },
            space_name: {
              type: 'string',
              maxLength: 255,
              description: 'Nome dello spazio',
              example: 'Stanza 101'
            },
            description: {
              type: 'string',
              description: 'Descrizione dello spazio',
              example: 'Ufficio privato con vista sul cortile'
            },
            capacity: {
              type: 'integer',
              description: 'Capacità massima di persone',
              example: 4
            },
            price_per_hour: {
              type: 'number',
              format: 'decimal',
              description: 'Prezzo orario in euro',
              example: 15.50
            },
            price_per_day: {
              type: 'number',
              format: 'decimal',
              description: 'Prezzo giornaliero in euro',
              example: 120.00
            }
          }
        },
        Booking: {
          type: 'object',
          required: ['user_id', 'space_id', 'booking_date', 'start_time', 'end_time', 'total_hours', 'total_price'],
          properties: {
            booking_id: {
              type: 'integer',
              description: 'ID unico della prenotazione (chiave primaria)',
              example: 1
            },
            user_id: {
              type: 'integer',
              description: 'ID dell\'utente che ha effettuato la prenotazione',
              example: 1
            },
            space_id: {
              type: 'integer',
              description: 'ID dello spazio prenotato',
              example: 1
            },
            booking_date: {
              type: 'string',
              format: 'date',
              description: 'Data della prenotazione',
              example: '2024-01-20'
            },
            start_time: {
              type: 'string',
              format: 'time',
              description: 'Ora di inizio della prenotazione',
              example: '09:00:00'
            },
            end_time: {
              type: 'string',
              format: 'time',
              description: 'Ora di fine della prenotazione',
              example: '17:00:00'
            },
            total_hours: {
              type: 'number',
              format: 'decimal',
              description: 'Numero totale di ore prenotate',
              example: 8.00
            },
            total_price: {
              type: 'number',
              format: 'decimal',
              description: 'Prezzo totale della prenotazione',
              example: 124.00
            },
            status: {
              type: 'string',
              enum: ['confirmed', 'pending', 'cancelled', 'completed'],
              description: 'Stato della prenotazione',
              example: 'pending'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di creazione della prenotazione',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        Availability: {
          type: 'object',
          required: ['space_id', 'availability_date', 'start_time', 'end_time'],
          properties: {
            availability_id: {
              type: 'integer',
              description: 'ID unico della disponibilità (chiave primaria)',
              example: 1
            },
            space_id: {
              type: 'integer',
              description: 'ID dello spazio',
              example: 1
            },
            availability_date: {
              type: 'string',
              format: 'date',
              description: 'Data di disponibilità',
              example: '2024-01-20'
            },
            start_time: {
              type: 'string',
              format: 'time',
              description: 'Ora di inizio disponibilità',
              example: '09:00:00'
            },
            end_time: {
              type: 'string',
              format: 'time',
              description: 'Ora di fine disponibilità',
              example: '18:00:00'
            },
            is_available: {
              type: 'boolean',
              description: 'Se lo spazio è disponibile in questo slot',
              example: true
            }
          }
        },
        Payment: {
          type: 'object',
          required: ['booking_id', 'amount', 'payment_method'],
          properties: {
            payment_id: {
              type: 'integer',
              description: 'ID unico del pagamento (chiave primaria)',
              example: 1
            },
            booking_id: {
              type: 'integer',
              description: 'ID della prenotazione associata (deve essere unico)',
              example: 1
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Importo del pagamento',
              example: 124.00
            },
            payment_date: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora del pagamento',
              example: '2024-01-15T10:30:00Z'
            },
            payment_method: {
              type: 'string',
              enum: ['credit_card', 'paypal', 'bank_transfer', 'cash'],
              description: 'Metodo di pagamento utilizzato',
              example: 'credit_card'
            },
            status: {
              type: 'string',
              enum: ['completed', 'failed', 'refunded'],
              description: 'Stato del pagamento',
              example: 'completed'
            },
            transaction_id: {
              type: 'string',
              maxLength: 100,
              description: 'ID della transazione del gateway di pagamento',
              example: 'txn_1234567890',
              nullable: true
            }
          }
        },
        AdditionalService: {
          type: 'object',
          required: ['service_name', 'price'],
          properties: {
            service_id: {
              type: 'integer',
              description: 'ID unico del servizio aggiuntivo (chiave primaria)',
              example: 1
            },
            service_name: {
              type: 'string',
              maxLength: 100,
              description: 'Nome del servizio aggiuntivo',
              example: 'Catering colazione'
            },
            description: {
              type: 'string',
              description: 'Descrizione del servizio',
              example: 'Colazione continentale con caffè e cornetti'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Prezzo del servizio',
              example: 12.50
            },
            is_active: {
              type: 'boolean',
              description: 'Se il servizio è attualmente disponibile',
              example: true
            }
          }
        },
        Notification: {
          type: 'object',
          required: ['user_id', 'type', 'channel', 'recipient'],
          properties: {
            notification_id: {
              type: 'integer',
              format: 'int64',
              description: 'ID unico della notifica (chiave primaria)',
              example: 1
            },
            user_id: {
              type: 'integer',
              description: 'ID dell\'utente destinatario',
              example: 1
            },
            type: {
              type: 'string',
              enum: ['email', 'push', 'sms'],
              description: 'Tipo di notifica',
              example: 'email'
            },
            channel: {
              type: 'string',
              enum: ['booking_confirmation', 'booking_cancellation', 'payment_success', 'payment_failed', 'payment_refund', 'booking_reminder', 'user_registration'],
              description: 'Canale/categoria della notifica',
              example: 'booking_confirmation'
            },
            recipient: {
              type: 'string',
              maxLength: 255,
              description: 'Destinatario della notifica (email, numero telefono, etc.)',
              example: 'mario.rossi@email.com'
            },
            subject: {
              type: 'string',
              maxLength: 255,
              description: 'Oggetto della notifica',
              example: 'Conferma prenotazione'
            },
            content: {
              type: 'string',
              description: 'Contenuto della notifica',
              example: 'La tua prenotazione è stata confermata'
            },
            template_name: {
              type: 'string',
              maxLength: 100,
              description: 'Nome del template utilizzato',
              example: 'booking_confirmation.html'
            },
            template_data: {
              type: 'object',
              description: 'Dati da sostituire nel template (formato JSONB)',
              example: { "userName": "Mario", "spaceName": "Stanza 101" }
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
              description: 'Stato della notifica',
              example: 'sent'
            },
            metadata: {
              type: 'object',
              description: 'Metadati aggiuntivi (formato JSONB)',
              example: { "provider": "sendgrid", "messageId": "abc123" }
            },
            booking_id: {
              type: 'integer',
              description: 'ID della prenotazione associata (opzionale)',
              example: 1,
              nullable: true
            },
            payment_id: {
              type: 'integer',
              description: 'ID del pagamento associato (opzionale)',
              example: 1,
              nullable: true
            },
            sent_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di invio',
              example: '2024-01-15T10:30:00Z',
              nullable: true
            },
            delivered_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di consegna',
              example: '2024-01-15T10:31:00Z',
              nullable: true
            },
            read_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di lettura',
              example: '2024-01-15T10:32:00Z',
              nullable: true
            },
            error_message: {
              type: 'string',
              description: 'Messaggio di errore in caso di fallimento',
              example: 'Invalid email address',
              nullable: true
            },
            retry_count: {
              type: 'integer',
              description: 'Numero di tentativi di invio',
              example: 0
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di creazione',
              example: '2024-01-15T10:30:00Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di ultimo aggiornamento',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Errore durante l\'operazione'
            },
            error: {
              type: 'string',
              example: 'Dettagli tecnici dell\'errore'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operazione completata con successo'
            },
            data: {
              type: 'object',
              description: 'Dati di risposta'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/backend/routes/*.js',
    './src/backend/controllers/*.js'
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerJsdoc
};
