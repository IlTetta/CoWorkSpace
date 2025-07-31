const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const { calculateBookingPrice } = require('../utils/bookingCalculator');

// (Necessaria?)
function calculateHours(startTime, endTime) {
    const start = new Date('2000-01-01T{startTime}');
    const end = new Date('2000-01-01T{endTime}');
    let diffMs = end - start;
    if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
    }
    return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
}

// Crea una nuova prenotazione
exports.createBooking = catchAsync(async (req, res, next) => {
    const { space_id, booking_date, start_time, end_time } = req.body;
    const user_id = req.user.id;

    if (!space_id || !booking_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
        });
    }

    // Verifica che lo spazio esista e ottiene i prezzi
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

    // Calcola le ore totali e il prezzo totale
    const total_hours = calculateHours(start_time, end_time);
    const total_price = calculateBookingPrice(total_hours, price_per_hour, price_per_day);

    // Verifica la disponibilità
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

    // TODO: verifica più precisa. Per ora, se un blocco si sovrappone, l'intervallo è disponibile

    // Verifica che non ci siano prenotazioni già confermate che si sovrappongono (confermate o pending)
    const conglictingBookings = await pool.query(
        `SELECT * FROM bookings
         WHERE space_id = $1
         AND booking_date = $2
         AND start_time < $3
         AND end_time > $4
         AND status IN ('confirmed', 'pending')`,
        [space_id, booking_date, end_time, start_time]
    );

    if (conglictingBookings.rows.length > 0) {
        return res.status(409).json({
            message: 'Esiste già una prenotazione confermata o in sospeso per questo spazio e orario.'
        });
    }

    const client = await pool.connect(); // Inizia una transazione per atomicità
    try {
        await client.query('BEGIN');

        // Crea la prenotazione
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, space_id, booking_date, start_time, end_time, total_hours, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [user_id, space_id, booking_date, start_time, end_time, total_hours, total_price]
        );
        const newBooking = bookingResult.rows[0];

        // Opzionale: Marcare i blocchi di disponibilità come non disponibili o parzialmente disponibili
        // A seconda della granularità della disponibilità, questo potrebbe essere più complesso.
        // Per semplicità qui, assumiamo che la disponibilità sia verificata e poi la prenotazione blocchi.
        // Se la disponibilità fosse a livello di singola ora e la prenotazione su più ore, servirebbe logica aggiuntiva.

        await client.query('COMMIT');
        res.status(201).json({
            status: 'success',
            message: 'Prenotazione creata con successo (in attesa di pagamento/conferma).',
            data: {
                booking: newBooking
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// Ottieni tutte le prenotazioni (filtrate per utente/manager)
exports.getAllBookings = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const user_role = req.user.role;
    let query;
    const queryParams = [];

    if (user_role === 'user') {
        query = `SELECT b.*, s.space_name, l.location_name
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 WHERE b.user_id = $1
                 ORDER BY b.created_at DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'manager') {
        // Un manager vede le prenotazioni solo per le sue sedi
        query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE l.manager_id = $1
                 ORDER BY b.created_at DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'admin') {
        // Un admin vede tutte le prenotazioni
        query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 ORDER BY b.created_at DESC`;
    } else {
        return res.status(403).json({
            message: 'Non autorizzato a visualizzare le prenotazioni.'
        });
    }

    const result = await pool.query(query, queryParams);
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            bookings: result.rows
        }
    });
});

// Ottieni una singola prenotazione per ID
exports.getBookingById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    let query = `SELECT b.*, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM bookings b
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE b.booking_id = $1`;
    const queryParams = [id];

    const result = await pool.query(query, queryParams);
    const booking = result.rows[0];

    if (!booking) {
        return res.status(404).json({
            message: 'Prenotazione non trovata.'
        });
    }

    // Autorizzazione: solo il proprietario della prenotazione, un manager della sede o un admin possono vederla
    if (booking.user_id !== user_id && user_role !== 'admin') {
        if (user_role === 'manager') {
            const managerLocationCheck = await pool.query('SELECT 1 FROM locations WHERE location_id = $1 AND manager_id = $2', [booking.location_id, user_id]);
            if (managerLocationCheck.rows.length === 0) {
                 return res.status(403).json({ message: 'Non autorizzato a visualizzare questa prenotazione.' });
            }
        } else {
            return res.status(403).json({ message: 'Non autorizzato a visualizzare questa prenotazione.' });
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            booking
        }
    });
});

// Aggiorna lo stato di una prenotazione
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body; // Nuovo stato: 'confirmed', 'pending', 'cancelled', 'completed'
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (!status) {
        return res.status(400).json({
            message: 'Lo stato è obbligatorio.'
        });
    }
    const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Stato non valido. Sono ammessi: ${validStatuses.join(', ')}` });
    }

    // Verifica l'esistenza e l'autorizzazione della prenotazione
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

    // Autorizzazione per modificare lo stato: solo manager o admin
    if (user_role === 'manager') {
        if (booking.manager_id !== user_id) {
            return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questa prenotazione (non sei il manager della sede).' });
        }
    } else if (user_role !== 'admin') {
        return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questa prenotazione.' });
    }

    // Prevenire cambi di stato illogici (es. da cancellato a confermato)
    if (booking.current_status === 'completed' || booking.current_status === 'cancelled') {
        return res.status(400).json({ message: `Non è possibile cambiare lo stato di una prenotazione già ${booking.current_status}.` });
    }

    const result = await pool.query(
        `UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *`,
        [status, id]
    );

    res.status(200).json({
        status: 'success',
        message: 'Stato prenotazione aggiornato.',
        data: {
            booking: result.rows[0]
        }
    });
});

// Elimina una prenotazione
exports.deleteBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Recupera la prenotazione per verificare i permessi
    const bookingResult = await pool.query('SELECT user_id, status FROM bookings WHERE booking_id = $1', [id]);
    const booking = bookingResult.rows[0];

    if (!booking) {
        return res.status(404).json({ message: 'Prenotazione non trovata.' });
    }

    // Autorizzazione per l'eliminazione:
    // 1. Admin può eliminare qualsiasi prenotazione.
    // 2. L'utente proprietario può eliminare solo se lo stato non è 'confirmed' o 'completed'.
    if (user_role !== 'admin') {
        if (booking.user_id !== user_id) {
            return res.status(403).json({ message: 'Non autorizzato a eliminare questa prenotazione (non sei il proprietario).' });
        }
        if (booking.status === 'confirmed' || booking.status === 'completed') {
            return res.status(400).json({ message: 'Non è possibile eliminare una prenotazione già confermata o completata. Contattare l\'assistenza.' });
        }
    }

    const result = await pool.query('DELETE FROM bookings WHERE booking_id = $1 RETURNING *', [id]);

    res.status(204).json({
        status: 'success',
        data: null
    });
});
