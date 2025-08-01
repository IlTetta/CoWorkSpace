const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const { calculateBookingPrice } = require('../utils/bookingCalculator');

// Questa funzione calcola la differenza in ore tra due orari.
function calculateHours(startTime, endTime) {
    // Viene usata una data fissa per calcolare solo la differenza oraria.
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diffMs = end - start;
    // Gestisce il caso in cui l'ora di fine sia il giorno dopo (es. da 22:00 a 02:00).
    if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
    }
    // Converte i millisecondi in ore e arrotonda a 2 cifre decimali.
    return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
}

// Middleware per creare una nuova prenotazione.
exports.createBooking = catchAsync(async (req, res, next) => {
    // Estrae i dati della prenotazione dal corpo della richiesta.
    const { space_id, booking_date, start_time, end_time } = req.body;
    // L'ID dell'utente viene preso dall'oggetto `req.user`,
    // che dovrebbe essere stato popolato da un middleware di autenticazione.
    const user_id = req.user.id;

    // Validazione dei dati di input obbligatori.
    if (!space_id || !booking_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
        });
    }

    // Verifica l'esistenza dello spazio e recupera i suoi prezzi.
    const spaceResult = await pool.query(
        'SELECT price_per_hour, price_per_day FROM spaces WHERE id = $1',
        [space_id]
    );
    if (spaceResult.rows.length === 0) {
        return res.status(404).json({
            message: 'Spazio non trovato.'
        });
    }
    const { price_per_hour, price_per_day } = spaceResult.rows[0];

    // Calcola le ore totali e il prezzo totale usando le funzioni definite.
    const total_hours = calculateHours(start_time, end_time);
    const total_price = calculateBookingPrice(total_hours, price_per_hour, price_per_day);

    // Verifica la disponibilità del blocco orario.
    const availabilityCheck = await pool.query(
        `SELECT * FROM availability
         WHERE space_id = $1
         AND booking_date = $2
         AND start_time <= $3
         AND end_time >= $4
         AND is_available = true`,
        [space_id, booking_date, end_time, start_time]
    );

    if (availabilityCheck.rows.length === 0) {
        return res.status(409).json({
            message: 'Lo spazio non è disponibile l\'orario richiesto.'
        });
    }

    // TODO: La verifica attuale controlla solo se esiste *un* blocco di disponibilità che si sovrappone.
    // Per una logica più robusta, ci si dovrebbe assicurare che l'intero intervallo richiesto sia coperto
    // da blocchi di disponibilità disponibili, senza buchi.

    // Verifica che non ci siano prenotazioni che si sovrappongono.
    // Questo è un controllo per evitare doppie prenotazioni.
    const conflictingBookings = await pool.query(
        `SELECT * FROM bookings
         WHERE space_id = $1
         AND booking_date = $2
         AND start_time < $3
         AND end_time > $4
         AND status IN ('confirmed', 'pending')`,
        [space_id, booking_date, end_time, start_time]
    );

    if (conflictingBookings.rows.length > 0) {
        return res.status(409).json({
            message: 'Esiste già una prenotazione confermata o in sospeso per questo spazio e orario.'
        });
    }

    // Inizia una transazione per garantire l'atomicità: o la prenotazione viene creata e le modifiche applicate, o nulla viene fatto.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Crea la prenotazione nel database. Lo stato iniziale è 'pending'.
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, space_id, booking_date, start_time, end_time, total_hours, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [user_id, space_id, booking_date, start_time, end_time, total_hours, total_price]
        );
        const newBooking = bookingResult.rows[0];

        // Conferma la transazione, salvando le modifiche nel database.
        await client.query('COMMIT');
        
        // Risposta di successo con stato 201 (Created).
        res.status(201).json({
            status: 'success',
            message: 'Prenotazione creata con successo (in attesa di pagamento/conferma).',
            data: {
                booking: newBooking
            }
        });
    } catch (error) {
        // Se qualcosa va storto, annulla tutte le modifiche della transazione.
        await client.query('ROLLBACK');
        // Passa l'errore al middleware di gestione globale.
        next(error);
    } finally {
        // Rilascia il client del pool, rendendolo disponibile per altre richieste.
        client.release();
    }
});

// Middleware per ottenere tutte le prenotazioni, con filtri basati sul ruolo dell'utente.
exports.getAllBookings = catchAsync(async (req, res, next) => {
    // Estrae ID e ruolo dell'utente autenticato.
    const user_id = req.user.id;
    const user_role = req.user.role;
    let query;
    const queryParams = [];

    // Logica di autorizzazione per filtrare le prenotazioni.
    if (user_role === 'user') {
        // Un utente normale può vedere solo le proprie prenotazioni.
        query = `SELECT b.*, s.space_name, l.location_name
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 WHERE b.user_id = $1
                 ORDER BY b.created_at DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'manager') {
        // Un manager vede solo le prenotazioni per le sedi che gestisce.
        query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE l.manager_id = $1
                 ORDER BY b.created_at DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'admin') {
        // Un admin può vedere tutte le prenotazioni del sistema.
        query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 ORDER BY b.created_at DESC`;
    } else {
        // Se il ruolo non è riconosciuto, l'accesso viene negato.
        return res.status(403).json({
            message: 'Non autorizzato a visualizzare le prenotazioni.'
        });
    }

    // Esegue la query costruita in base al ruolo.
    const result = await pool.query(query, queryParams);
    
    // Invia la risposta con le prenotazioni trovate.
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            bookings: result.rows
        }
    });
});

// Middleware per ottenere i dettagli di una singola prenotazione, con controlli di accesso.
exports.getBookingById = catchAsync(async (req, res, next) => {
    // Estrae l'ID dai parametri della URL e i dati dell'utente autenticato.
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Query per recuperare tutti i dettagli della prenotazione.
    let query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE b.booking_id = $1`;
    const queryParams = [id];

    const result = await pool.query(query, queryParams);
    const booking = result.rows[0];

    // Controlla se la prenotazione esiste.
    if (!booking) {
        return res.status(404).json({
            message: 'Prenotazione non trovata.'
        });
    }

    // Logica di autorizzazione.
    // Solo il proprietario, un admin o un manager della sede possono visualizzare la prenotazione.
    if (booking.user_id !== user_id && user_role !== 'admin') {
        if (user_role === 'manager') {
            // Se è un manager, verifica che gestisca la sede a cui appartiene la prenotazione.
            const managerLocationCheck = await pool.query('SELECT 1 FROM locations WHERE location_id = $1 AND manager_id = $2', [booking.location_id, user_id]);
            if (managerLocationCheck.rows.length === 0) {
                 return res.status(403).json({ message: 'Non autorizzato a visualizzare questa prenotazione.' });
            }
        } else {
            return res.status(403).json({ message: 'Non autorizzato a visualizzare questa prenotazione.' });
        }
    }

    // Risposta di successo.
    res.status(200).json({
        status: 'success',
        data: {
            booking
        }
    });
});

// Middleware per aggiornare lo stato di una prenotazione.
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Validazione dello stato fornito.
    if (!status) {
        return res.status(400).json({
            message: 'Lo stato è obbligatorio.'
        });
    }
    const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Stato non valido. Sono ammessi: ${validStatuses.join(', ')}` });
    }

    // Recupera la prenotazione e i dati di autorizzazione.
    const currentBookingResult = await pool.query(
        `SELECT b.user_id, b.status AS current_status, s.location_id, l.manager_id
         FROM bookings b
         JOIN spaces s ON b.space_id = s.space_id
         JOIN locations l ON s.location_id = l.location_id
         WHERE b.booking_id = $1`,
        [id]
    );
    const booking = currentBookingResult.rows[0];

    if (!booking) {
        return res.status(404).json({ message: 'Prenotazione non trovata.' });
    }

    // Logica di autorizzazione per la modifica dello stato.
    if (user_role === 'manager') {
        // Un manager può modificare lo stato solo se gestisce la sede.
        if (booking.manager_id !== user_id) {
            return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questa prenotazione (non sei il manager della sede).' });
        }
    } else if (user_role !== 'admin') {
        // Solo manager e admin sono autorizzati a modificare lo stato.
        return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questa prenotazione.' });
    }

    // Previene modifiche di stato illogiche.
    if (booking.current_status === 'completed' || booking.current_status === 'cancelled') {
        return res.status(400).json({ message: `Non è possibile cambiare lo stato di una prenotazione già ${booking.current_status}.` });
    }

    // Esegue l'aggiornamento dello stato nel database.
    const result = await pool.query(
        `UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *`,
        [status, id]
    );

    // Risposta di successo.
    res.status(200).json({
        status: 'success',
        message: 'Stato prenotazione aggiornato.',
        data: {
            booking: result.rows[0]
        }
    });
});

// Middleware per eliminare una prenotazione.
exports.deleteBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Recupera i dati della prenotazione per i controlli di autorizzazione.
    const bookingResult = await pool.query('SELECT user_id, status FROM bookings WHERE booking_id = $1', [id]);
    const booking = bookingResult.rows[0];

    if (!booking) {
        return res.status(404).json({ message: 'Prenotazione non trovata.' });
    }

    // Logica di autorizzazione per l'eliminazione.
    if (user_role !== 'admin') {
        // Se non è un admin, deve essere il proprietario della prenotazione.
        if (booking.user_id !== user_id) {
            return res.status(403).json({ message: 'Non autorizzato a eliminare questa prenotazione (non sei il proprietario).' });
        }
        // Il proprietario può eliminare solo se la prenotazione non è ancora confermata o completata.
        if (booking.status === 'confirmed' || booking.status === 'completed') {
            return res.status(400).json({ message: 'Non è possibile eliminare una prenotazione già confermata o completata. Contattare l\'assistenza.' });
        }
    }

    // Esegue la query DELETE.
    const result = await pool.query('DELETE FROM bookings WHERE booking_id = $1 RETURNING *', [id]);

    // Risposta di successo con stato 204 (No Content).
    res.status(204).json({
        status: 'success',
        data: null
    });
});
