// Global test setup
// Note: Jest gestisce automaticamente la chiusura delle connessioni con forceExit

// Setup globale per i test
beforeAll(() => {
    console.log('Starting integration tests...');
});

afterAll(() => {
    console.log('Integration tests completed');
});
