// Test script per verificare il flusso di creazione spazi e il calcolo del prezzo giornaliero
require('dotenv').config();
const Space = require('./src/backend/models/Space');
const db = require('./src/backend/config/db');

async function testSpaceCreation() {
    console.log('=== TEST CREAZIONE SPAZIO ===\n');

    // Dati di test per creare uno spazio
    const testSpaceData = {
        location_id: 1, // Assicurati che esista una location con ID 1
        space_type_id: 1, // Assicurati che esista un space_type con ID 1
        space_name: 'Test Space - Controllo Prezzo',
        description: 'Spazio di test per verificare il calcolo del prezzo giornaliero',
        capacity: 10,
        price_per_hour: 15.00, // 15€ all'ora
        opening_time: '09:00:00',
        closing_time: '18:00:00'
        // NON specificare price_per_day per testare il calcolo automatico
    };

    console.log('1. DATI DI INPUT:');
    console.log(JSON.stringify(testSpaceData, null, 2));
    
    // Calcolo manuale del prezzo atteso
    const expectedDailyPrice = testSpaceData.price_per_hour * 9; // 9 ore (18-9)
    console.log(`\n2. PREZZO GIORNALIERO ATTESO:`);
    console.log(`   ${testSpaceData.price_per_hour}€/h × 9h = ${expectedDailyPrice}€`);

    try {
        console.log('\n3. CREAZIONE SPAZIO...');
        
        // Crea lo spazio
        const createdSpace = await Space.create(testSpaceData);
        
        console.log('\n4. SPAZIO CREATO:');
        console.log('   ID:', createdSpace.space_id);
        console.log('   Nome:', createdSpace.space_name);
        console.log('   Prezzo orario:', createdSpace.price_per_hour);
        console.log('   Prezzo giornaliero:', createdSpace.price_per_day);
        
        // Verifica il calcolo
        console.log('\n5. VERIFICA:');
        console.log('   Prezzo atteso:', expectedDailyPrice);
        console.log('   Prezzo salvato:', parseFloat(createdSpace.price_per_day));
        
        const isCorrect = parseFloat(createdSpace.price_per_day) === expectedDailyPrice;
        console.log('   Calcolo corretto:', isCorrect ? '✅ SÌ' : '❌ NO');
        
        if (!isCorrect) {
            const difference = parseFloat(createdSpace.price_per_day) - expectedDailyPrice;
            console.log('   Differenza:', difference);
            console.log('   Moltiplicatore:', parseFloat(createdSpace.price_per_day) / expectedDailyPrice);
        }

        // Leggi direttamente dal database per confronto
        console.log('\n6. VERIFICA DATABASE:');
        const dbResult = await db.query('SELECT * FROM spaces WHERE space_id = $1', [createdSpace.space_id]);
        const dbSpace = dbResult.rows[0];
        
        console.log('   Prezzo nel DB:', dbSpace.price_per_day);
        console.log('   Tipo dato DB:', typeof dbSpace.price_per_day);
        
        // Pulizia: elimina lo spazio di test
        console.log('\n7. PULIZIA...');
        await Space.delete(createdSpace.space_id);
        console.log('   Spazio di test eliminato');

        return {
            success: true,
            expected: expectedDailyPrice,
            actual: parseFloat(createdSpace.price_per_day),
            correct: isCorrect
        };

    } catch (error) {
        console.error('\n❌ ERRORE:', error.message);
        console.error('Stack:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testCalculateDailyPriceFunction() {
    console.log('\n=== TEST FUNZIONE calculateDailyPrice ===\n');
    
    const testCases = [
        { price: 10, opening: '09:00:00', closing: '18:00:00', expected: 90 },
        { price: 15, opening: '08:00:00', closing: '20:00:00', expected: 180 },
        { price: 20, opening: '10:00:00', closing: '16:00:00', expected: 120 },
        { price: 25, opening: '09:30:00', closing: '17:30:00', expected: 200 }
    ];

    console.log('Test della funzione calculateDailyPrice:');
    
    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        try {
            const result = Space.calculateDailyPrice(test.price, test.opening, test.closing);
            const isCorrect = result === test.expected;
            
            console.log(`\nTest ${i + 1}:`);
            console.log(`  Input: ${test.price}€/h, ${test.opening}-${test.closing}`);
            console.log(`  Atteso: ${test.expected}€`);
            console.log(`  Risultato: ${result}€`);
            console.log(`  Status: ${isCorrect ? '✅' : '❌'}`);
            
        } catch (error) {
            console.log(`\nTest ${i + 1}: ❌ ERRORE - ${error.message}`);
        }
    }
}

async function checkDatabaseSchema() {
    console.log('\n=== VERIFICA SCHEMA DATABASE ===\n');
    
    try {
        // Verifica la struttura della tabella spaces
        const schemaQuery = `
            SELECT column_name, data_type, numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_name = 'spaces' 
            AND column_name IN ('price_per_hour', 'price_per_day')
            ORDER BY column_name;
        `;
        
        const schemaResult = await db.query(schemaQuery);
        
        console.log('Schema colonne prezzo:');
        schemaResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}(${row.numeric_precision},${row.numeric_scale})`);
        });

        // Verifica se ci sono trigger sulla tabella
        const triggerQuery = `
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'spaces';
        `;
        
        const triggerResult = await db.query(triggerQuery);
        
        if (triggerResult.rows.length > 0) {
            console.log('\nTrigger trovati:');
            triggerResult.rows.forEach(row => {
                console.log(`  ${row.trigger_name}: ${row.event_manipulation}`);
                console.log(`    ${row.action_statement}`);
            });
        } else {
            console.log('\nNessun trigger trovato sulla tabella spaces');
        }

    } catch (error) {
        console.error('Errore nella verifica schema:', error.message);
    }
}

async function main() {
    console.log('🔍 DIAGNOSTIC TOOL - Space Creation & Pricing\n');
    
    try {
        // Test 1: Funzione calculateDailyPrice
        await testCalculateDailyPriceFunction();
        
        // Test 2: Schema database
        await checkDatabaseSchema();
        
        // Test 3: Creazione spazio completa
        const result = await testSpaceCreation();
        
        console.log('\n=== RISULTATO FINALE ===');
        if (result.success) {
            if (result.correct) {
                console.log('✅ TUTTO OK: Il calcolo del prezzo giornaliero funziona correttamente');
            } else {
                console.log('❌ PROBLEMA TROVATO: Il prezzo giornaliero non è calcolato correttamente');
                console.log(`   Atteso: ${result.expected}€`);
                console.log(`   Ottenuto: ${result.actual}€`);
                console.log(`   Rapporto: ${result.actual / result.expected}x`);
            }
        } else {
            console.log('❌ ERRORE DURANTE IL TEST:', result.error);
        }
        
    } catch (error) {
        console.error('❌ ERRORE GENERALE:', error.message);
    } finally {
        // Chiudi la connessione al database
        try {
            if (db.pool) {
                await db.pool.end();
            } else if (db.end) {
                await db.end();
            }
        } catch (err) {
            console.log('Connessione DB già chiusa');
        }
        console.log('\n🏁 Test completato');
    }
}

// Esegui il test se lo script viene chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = { testSpaceCreation, testCalculateDailyPriceFunction, checkDatabaseSchema };