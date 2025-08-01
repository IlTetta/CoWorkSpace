const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// NOTA: In una vera applicazione, l'integrazione con un gateway di pagamento (es. Stripe)
// comporterebbe l'uso delle loro SDK e la gestione dei webhook.
// Qui vengono simulate le operazioni sul database.

// Middleware per creare un nuovo record di pagamento.
exports.createPayment = catchAsync(async (req, res, next) => {
    // Estrae i dati necessari dal corpo della richiesta.
    const { booking_id, amount, payment_method, transaction_id } = req.body;
    // L'ID utente viene recuperato dall'oggetto `req.user`, che un middleware di autenticazione ha popolato.
    const user_id = req.user.id;

    // --- Validazione dei dati di input ---
    if (!booking_id || !amount || !payment_method) {
        return res.status(400).json({ message: 'Booking ID, importo e metodo di pagamento sono obbligatori.' });
    }

    // --- 1. Verifica prenotazione e autorizzazione ---
    // Esegue un LEFT JOIN per verificare l'esistenza della prenotazione e se ha già un pagamento associato.
    const bookingResult = await pool.query(
        `SELECT b.user_id, b.total_price, p.payment_id FROM bookings b LEFT JOIN payments p ON b.booking_id = p.booking_id WHERE b.booking_id = $1`,
        [booking_id]
    );
    const booking = bookingResult.rows[0];

    // Controlla se la prenotazione esiste.
    if (!booking) {
        return res.status(404).json({ message: 'Prenotazione non trovata.' });
    }
    // Controlla che l'utente che effettua il pagamento sia il proprietario della prenotazione.
    if (booking.user_id !== user_id) {
        return res.status(403).json({ message: 'Non autorizzato a creare un pagamento per questa prenotazione.' });
    }
    // Previene pagamenti duplicati o in conflitto.
    if (booking.payment_id) {
        const existingPaymentStatus = await pool.query('SELECT status FROM payments WHERE payment_id = $1', [booking.payment_id]);
        if (existingPaymentStatus.rows[0].status === 'completed' || existingPaymentStatus.rows[0].status === 'pending') {
            return res.status(409).json({ message: 'Questa prenotazione ha già un pagamento in corso o completato.' });
        }
    }

    // --- 2. Verifica dell'importo ---
    if (parseFloat(amount) !== parseFloat(booking.total_price)) {
        return res.status(400).json({ message: `L'importo del pagamento (${amount}) non corrisponde al prezzo totale della prenotazione (${booking.total_price}).` });
    }

    // --- 3. Transazione di creazione e aggiornamento ---
    // Avvia una transazione per garantire che sia il pagamento che l'aggiornamento della prenotazione
    // avvengano insieme (o nessuno dei due).
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Inserisce il nuovo pagamento con stato 'completed'
        const result = await client.query(
            `INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id)
             VALUES ($1, $2, $3, 'completed', $4) RETURNING *`,
            [booking_id, amount, payment_method, transaction_id || null]
        );
        const newPayment = result.rows[0];

        // Aggiorna lo stato della prenotazione a 'confirmed'.
        await client.query(
            `UPDATE bookings SET status = 'confirmed' WHERE booking_id = $1`,
            [booking_id]
        );

        await client.query('COMMIT'); // Conferma la transazione.
        
        // Risposta di successo con stato 201 (Created).
        res.status(201).json({
            status: 'success',
            message: 'Pagamento registrato e prenotazione confermata.',
            data: {
                payment: newPayment
            }
        });
    } catch (error) {
        await client.query('ROLLBACK'); // Annulla la transazione in caso di errore.
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Questa prenotazione ha già un pagamento associato.' });
        }
        next(error);
    } finally {
        client.release(); // Rilascia la connessione del client al pool.
    }
});

// Middleware per ottenere tutti i pagamenti, con filtri basati sul ruolo utente.
exports.getAllPayments = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const user_role = req.user.role;
    let query;
    const queryParams = [];

    // --- Logica di autorizzazione basata sul ruolo ---
    if (user_role === 'user') {
        // Un utente può vedere solo i propri pagamenti.
        query = `SELECT p.*, b.booking_id, s.space_name, l.location_name
                 FROM payments p
                 JOIN bookings b ON p.booking_id = b.booking_id
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 WHERE b.user_id = $1
                 ORDER BY p.payment_date DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'manager') {
        // Un manager vede i pagamenti solo per le sedi che gestisce.
        query = `SELECT p.*, b.booking_id, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM payments p
                 JOIN bookings b ON p.booking_id = b.booking_id
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE l.manager_id = $1
                 ORDER BY p.payment_date DESC`;
        queryParams.push(user_id);
    } else if (user_role === 'admin') {
        // Un admin vede tutti i pagamenti del sistema.
        query = `SELECT p.*, b.booking_id, s.space_name, l.location_name, u.name as user_name, u.surname as user_surname
                 FROM payments p
                 JOIN bookings b ON p.booking_id = b.booking_id
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 JOIN users u ON b.user_id = u.user_id
                 ORDER BY p.payment_date DESC`;
    } else {
        return res.status(403).json({ message: 'Non autorizzato a visualizzare i pagamenti.' });
    }

    const result = await pool.query(query, queryParams);
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: {
            payments: result.rows
        }
    });
});

// Middleware per ottenere i dettagli di un singolo pagamento.
exports.getPaymentById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Recupera i dati del pagamento e le informazioni di autorizzazione associate.
    let query = `SELECT p.*, b.booking_id, b.user_id as booking_user_id, s.location_id, l.manager_id
                 FROM payments p
                 JOIN bookings b ON p.booking_id = b.booking_id
                 JOIN spaces s ON b.space_id = s.space_id
                 JOIN locations l ON s.location_id = l.location_id
                 WHERE p.payment_id = $1`;
    const queryParams = [id];

    const result = await pool.query(query, queryParams);
    const payment = result.rows[0];

    if (!payment) {
        return res.status(404).json({ message: 'Pagamento non trovato.' });
    }

    // --- Logica di autorizzazione per la visualizzazione ---
    if (payment.booking_user_id !== user_id && user_role !== 'admin') {
        if (user_role === 'manager') {
            // Un manager può vedere il pagamento solo se è associato a una sua sede.
            if (payment.manager_id !== user_id) {
                 return res.status(403).json({ message: 'Non autorizzato a visualizzare questo pagamento (non sei il manager della sede).' });
            }
        } else {
            return res.status(403).json({ message: 'Non autorizzato a visualizzare questo pagamento.' });
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            payment
        }
    });
});

// Middleware per aggiornare lo stato di un pagamento (spesso usato da un manager/admin).
exports.updatePaymentStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // --- Validazione dello stato di input ---
    if (!status) {
        return res.status(400).json({ message: 'Lo stato è obbligatorio.' });
    }
    const validStatuses = ['completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Stato non valido. Sono ammessi: ${validStatuses.join(', ')}` });
    }

    // Verifica l'esistenza del pagamento e l'autorizzazione dell'utente.
    const currentPaymentResult = await pool.query(
        `SELECT p.booking_id, p.status AS current_status, b.user_id as booking_user_id, s.location_id, l.manager_id
         FROM payments p
         JOIN bookings b ON p.booking_id = b.booking_id
         JOIN spaces s ON b.space_id = s.space_id
         JOIN locations l ON s.location_id = l.location_id
         WHERE p.payment_id = $1`,
        [id]
    );
    const payment = currentPaymentResult.rows[0];

    if (!payment) {
        return res.status(404).json({ message: 'Pagamento non trovato.' });
    }

    // --- Autorizzazione alla modifica ---
    if (user_role === 'manager') {
        if (payment.manager_id !== user_id) {
            return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questo pagamento (non sei il manager della sede).' });
        }
    } else if (user_role !== 'admin') {
        return res.status(403).json({ message: 'Non autorizzato a modificare lo stato di questo pagamento.' });
    }

    // Avvia una transazione per l'aggiornamento.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Aggiorna lo stato del pagamento.
        const result = await client.query(
            `UPDATE payments SET status = $1 WHERE payment_id = $2 RETURNING *`,
            [status, id]
        );
        const updatedPayment = result.rows[0];

        // --- Logica di business: aggiorna lo stato della prenotazione ---
        if (status === 'completed') {
            await client.query(`UPDATE bookings SET status = 'confirmed' WHERE booking_id = $1`, [payment.booking_id]);
        } else if (status === 'failed' || status === 'refunded') {
            await client.query(`UPDATE bookings SET status = 'cancelled' WHERE booking_id = $1`, [payment.booking_id]);
        }
        
        await client.query('COMMIT');

        res.status(200).json({
            status: 'success',
            message: 'Stato pagamento aggiornato.',
            data: {
                payment: updatedPayment
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});