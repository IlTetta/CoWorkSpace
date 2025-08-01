const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const cathAsync = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Verifica che l'utente sia chi dice di essere, decodificando il token JWT.
exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // 1) Controlla se il token è presente nell'header 'Authorization'.
    // Si aspetta un formato 'Bearer <token>'.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Se non trova il token, l'utente non è loggato.
    if (!token) {
        return res.status(401).json({ message: 'Non sei loggato!' });
    }

    try {
        // 2) Verifica il token.
        // `jwt.verify` decodifica il token usando la chiave segreta. Se il token non è valido o è scaduto,
        // genera un errore che verrà catturato dal blocco `catch`.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3) Controlla se l'utente esiste ancora nel database.
        // Utilizza l'ID utente decodificato per recuperare i dati più recenti.
        const result = await pool.query(
            'SELECT user_id, email, role FROM users WHERE user_id = $1',
            [decoded.id]
        );
        // Salva i dati dell'utente sull'oggetto `req` per renderli disponibili
        // a tutti i middleware successivi.
        req.user = result.rows[0];

        // Se l'utente non viene trovato nel database, il token è obsoleto.
        if (!req.user){
            return res.status(401).json({ message: 'L\'utente non esiste!' });
        }
        
        // 4) Se tutto va bene, passa il controllo al prossimo middleware.
        next();
    } catch (error){
        // Gestisce gli errori di verifica del token.
        return res.status(401).json({ message: 'Token non valido o scaduto!' });
    }
});

// Middleware per controllare se l'utente ha uno dei ruoli specificati.
// Accetta una lista di ruoli come argomento (es. `authorize('admin', 'manager')`).
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Controlla se il ruolo dell'utente (`req.user.role`) è incluso nell'array di ruoli permessi.
        // L'oggetto `req.user` è stato popolato dal middleware `protect` precedente.
        if (!roles.includes(req.user.role)) {
            // Se il ruolo non è valido, nega l'accesso con un errore 403 (Forbidden).
            return res.status(403).json({ message: 'Accesso negato!' });
        }
        // Se l'utente ha uno dei ruoli richiesti, passa il controllo al prossimo middleware.
        next();
    };
};