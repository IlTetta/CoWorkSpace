# Stage 1: Costruzione (builder)
FROM node:20-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /usr/src/app

# Copia solo i file di configurazione per sfruttare la cache
COPY package*.json ./

# Installa tutte le dipendenze, inclusi i devDependencies
RUN npm install

# Copia il file di servizio di Firebase
COPY firebase-service-account.json ./src/

# Copia tutto il codice sorgente
COPY . .

# Esegui il processo di build del tuo frontend, se necessario
# Ad esempio: RUN npm run build

# Stage 2: Esecuzione (production)
FROM node:20-alpine

# Imposta la directory di lavoro
WORKDIR /usr/src/app

# Copia solo i file di configurazione
COPY package*.json ./

# Installa solo le dipendenze di produzione
# Questo passo è cruciale per mantenere l'immagine finale leggera
RUN npm install --only=production

# Copia il file di servizio di Firebase
COPY --from=builder /usr/src/app/src/firebase-service-account.json ./src/

# Copia il resto del codice sorgente dall'immagine di costruzione
COPY --from=builder /usr/src/app/src ./src

# Espone la porta dell'applicazione
EXPOSE 3000

# Avvia l'applicazione in modalità produzione
CMD ["node", "src/backend/server.js"]