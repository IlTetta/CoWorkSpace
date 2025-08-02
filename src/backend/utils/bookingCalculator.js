/**
 * Calcola il prezzo totale di una prenotazione basandosi sulle ore e le tariffe dello spazio.
 * Potrebbe essere esteso per considerare tariffe giornaliere, sconti, ecc.
 * @param {number} totalHours - Numero totale di ore prenotate.
 * @param {number} pricePerHour - Prezzo per ora dello spazio.
 * @param {number} pricePerDay - Prezzo giornaliero dello spazio.
 * @return {number} Il prezzo totale della prenotazione.
 */
exports.calculateBookingPrice = (totalHours, pricePerHour, pricePerDay) => {
    // Preferiamo il prezzo giornaliero se si superano le 8 ore
    const hoursInDay = 8;

    // Validazione degli input
    if (
        typeof totalHours !== 'number' || isNaN(totalHours) || totalHours < 0 ||
        typeof pricePerHour !== 'number' || isNaN(pricePerHour) || pricePerHour < 0 ||
        typeof pricePerDay !== 'number' || isNaN(pricePerDay) || pricePerDay < 0
    ) {
        return 0;
    }

    let totalPrice;

    if (totalHours >= hoursInDay) {
        const fullDays = Math.floor(totalHours / hoursInDay);
        const remainingHours = totalHours % hoursInDay;
        totalPrice = (fullDays * pricePerDay) + (remainingHours * pricePerHour);
} else {
        totalPrice = totalHours * pricePerHour;
    }

    return parseFloat(totalPrice.toFixed(2)); 
}