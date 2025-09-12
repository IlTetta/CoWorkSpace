#!/bin/bash

# Script per gestire il database di test con Docker

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Funzione di help
show_help() {
    cat << EOF
Script per gestire il database di test CoWorkSpace

Uso: $0 [COMANDO]

COMANDI:
    start       Avvia il database di test
    stop        Ferma il database di test
    restart     Riavvia il database di test
    reset       Resetta il database di test (rimuove tutti i dati)
    logs        Mostra i log del database di test
    status      Mostra lo stato del database di test
    test        Avvia i test di integrazione
    test-watch  Avvia i test in modalità watch
    shell       Apre una shell nel database di test
    help        Mostra questo messaggio

ESEMPI:
    $0 start          # Avvia il DB di test
    $0 test           # Esegui tutti i test di integrazione
    $0 reset          # Resetta il DB e ricrea le tabelle
    $0 shell          # Accedi al DB per query manuali

EOF
}

# Verifica che docker-compose sia installato
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker non è installato o non è nel PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose non è installato"
        exit 1
    fi
}

# Funzione per eseguire docker-compose
run_compose() {
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f docker-compose.test.yml "$@"
    else
        docker-compose -f docker-compose.test.yml "$@"
    fi
}

# Avvia il database di test
start_test_db() {
    print_info "Avvio del database di test..."
    run_compose up -d test-db
    
    print_info "Attendo che il database sia pronto..."
    sleep 5
    
    # Verifica che il database sia healthy
    for i in {1..30}; do
        if run_compose ps test-db | grep -q "healthy"; then
            print_info "Database di test avviato con successo!"
            print_info "Connessione: localhost:5433"
            print_info "Database: coworkspace_test_db"
            print_info "User: coworkspace_test_user"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "Il database non è diventato healthy in tempo"
    print_info "Controllo i log..."
    run_compose logs test-db
    exit 1
}

# Ferma il database di test
stop_test_db() {
    print_info "Arresto del database di test..."
    run_compose down
    print_info "Database di test fermato"
}

# Resetta il database di test
reset_test_db() {
    print_warning "Questo resetterà completamente il database di test!"
    read -p "Sei sicuro? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Reset del database di test..."
        run_compose down -v  # Rimuove anche i volumi
        print_info "Riavvio del database..."
        start_test_db
        print_info "Database di test resetteato con successo!"
    else
        print_info "Reset annullato"
    fi
}

# Mostra i log
show_logs() {
    print_info "Log del database di test:"
    run_compose logs -f test-db
}

# Mostra lo status
show_status() {
    print_info "Status dei servizi di test:"
    run_compose ps
}

# Esegui i test
run_tests() {
    print_info "Verifica che il database di test sia avviato..."
    if ! run_compose ps test-db | grep -q "healthy"; then
        print_info "Avvio del database di test..."
        start_test_db
    fi
    
    print_info "Esecuzione test di integrazione..."
    
    # Crea .env.test se non esiste
    if [ ! -f .env.test ]; then
        print_info "Creazione file .env.test..."
        cp .env.test.example .env.test
    fi
    
    # Esegui i test
    npm run test:integration
}

# Esegui i test in watch mode
run_tests_watch() {
    print_info "Avvio test in modalità watch..."
    if ! run_compose ps test-db | grep -q "healthy"; then
        start_test_db
    fi
    
    if [ ! -f .env.test ]; then
        cp .env.test.example .env.test
    fi
    
    npm run test:integration:watch
}

# Apri shell nel database
open_shell() {
    if ! run_compose ps test-db | grep -q "healthy"; then
        print_error "Il database di test non è in esecuzione"
        print_info "Avvialo con: $0 start"
        exit 1
    fi
    
    print_info "Apertura shell nel database di test..."
    run_compose exec test-db psql -U coworkspace_test_user -d coworkspace_test_db
}

# Main
check_docker

case "${1:-help}" in
    start)
        start_test_db
        ;;
    stop)
        stop_test_db
        ;;
    restart)
        stop_test_db
        start_test_db
        ;;
    reset)
        reset_test_db
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    test)
        run_tests
        ;;
    test-watch)
        run_tests_watch
        ;;
    shell)
        open_shell
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Comando non riconosciuto: $1"
        echo
        show_help
        exit 1
        ;;
esac