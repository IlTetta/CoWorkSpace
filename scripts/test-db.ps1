# Script PowerShell per gestire il database di test con Docker

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "reset", "logs", "status", "test", "test-watch", "shell", "help")]
    [string]$Command = "help"
)

# Funzioni per output colorato
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Funzione di help
function Show-Help {
    @"
Script per gestire il database di test CoWorkSpace

Uso: .\test-db.ps1 [COMANDO]

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
    .\test-db.ps1 start          # Avvia il DB di test
    .\test-db.ps1 test           # Esegui tutti i test di integrazione
    .\test-db.ps1 reset          # Resetta il DB e ricrea le tabelle
    .\test-db.ps1 shell          # Accedi al DB per query manuali

"@
}

# Verifica che docker sia installato
function Test-Docker {
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker non è installato o non è nel PATH"
        exit 1
    }
    
    $composeCommand = $null
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        try {
            docker compose version | Out-Null
            $script:composeCommand = "docker compose"
        } catch {
            if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
                $script:composeCommand = "docker-compose"
            } else {
                Write-Error "Docker Compose non è installato"
                exit 1
            }
        }
    }
}

# Funzione per eseguire docker-compose
function Invoke-DockerCompose {
    param([string[]]$Arguments)
    
    $cmd = "$script:composeCommand -f docker-compose.test.yml $($Arguments -join ' ')"
    Invoke-Expression $cmd
}

# Avvia il database di test
function Start-TestDb {
    Write-Info "Avvio del database di test..."
    Invoke-DockerCompose @("up", "-d", "test-db")
    
    Write-Info "Attendo che il database sia pronto..."
    Start-Sleep -Seconds 5
    
    # Verifica che il database sia healthy
    for ($i = 1; $i -le 30; $i++) {
        $status = Invoke-DockerCompose @("ps", "test-db")
        if ($status -match "healthy") {
            Write-Info "Database di test avviato con successo!"
            Write-Info "Connessione: localhost:5433"
            Write-Info "Database: coworkspace_test_db"
            Write-Info "User: coworkspace_test_user"
            return
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    
    Write-Error "Il database non è diventato healthy in tempo"
    Write-Info "Controllo i log..."
    Invoke-DockerCompose @("logs", "test-db")
    exit 1
}

# Ferma il database di test
function Stop-TestDb {
    Write-Info "Arresto del database di test..."
    Invoke-DockerCompose @("down")
    Write-Info "Database di test fermato"
}

# Resetta il database di test
function Reset-TestDb {
    Write-Warning "Questo resetterà completamente il database di test!"
    $response = Read-Host "Sei sicuro? (y/N)"
    if ($response -match "^[Yy]$") {
        Write-Info "Reset del database di test..."
        Invoke-DockerCompose @("down", "-v")  # Rimuove anche i volumi
        Write-Info "Riavvio del database..."
        Start-TestDb
        Write-Info "Database di test resetteato con successo!"
    } else {
        Write-Info "Reset annullato"
    }
}

# Mostra i log
function Show-Logs {
    Write-Info "Log del database di test:"
    Invoke-DockerCompose @("logs", "-f", "test-db")
}

# Mostra lo status
function Show-Status {
    Write-Info "Status dei servizi di test:"
    Invoke-DockerCompose @("ps")
}

# Esegui i test
function Start-Tests {
    Write-Info "Verifica che il database di test sia avviato..."
    $status = Invoke-DockerCompose @("ps", "test-db")
    if ($status -notmatch "healthy") {
        Write-Info "Avvio del database di test..."
        Start-TestDb
    }
    
    Write-Info "Esecuzione test di integrazione..."
    
    # Crea .env.test se non esiste
    if (!(Test-Path ".env.test")) {
        Write-Info "Creazione file .env.test..."
        Copy-Item ".env.test.example" ".env.test"
    }
    
    # Esegui i test
    npm run test:integration
}

# Esegui i test in watch mode
function Start-TestsWatch {
    Write-Info "Avvio test in modalità watch..."
    $status = Invoke-DockerCompose @("ps", "test-db")
    if ($status -notmatch "healthy") {
        Start-TestDb
    }
    
    if (!(Test-Path ".env.test")) {
        Copy-Item ".env.test.example" ".env.test"
    }
    
    npm run test:integration:watch
}

# Apri shell nel database
function Open-Shell {
    $status = Invoke-DockerCompose @("ps", "test-db")
    if ($status -notmatch "healthy") {
        Write-Error "Il database di test non è in esecuzione"
        Write-Info "Avvialo con: .\test-db.ps1 start"
        exit 1
    }
    
    Write-Info "Apertura shell nel database di test..."
    Invoke-DockerCompose @("exec", "test-db", "psql", "-U", "coworkspace_test_user", "-d", "coworkspace_test_db")
}

# Main
Test-Docker

switch ($Command) {
    "start" { Start-TestDb }
    "stop" { Stop-TestDb }
    "restart" { 
        Stop-TestDb
        Start-TestDb 
    }
    "reset" { Reset-TestDb }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "test" { Start-Tests }
    "test-watch" { Start-TestsWatch }
    "shell" { Open-Shell }
    "help" { Show-Help }
    default {
        Write-Error "Comando non riconosciuto: $Command"
        Show-Help
        exit 1
    }
}