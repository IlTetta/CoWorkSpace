FROM node:20-alpine

# Working directory
WORKDIR /usr/src/app

# Copia file di config
COPY package*.json ./

# Installa le dipendenze
RUN npm install --only=production

# Copia il codice sorgente
COPY src ./src

# Espone la porta del server
EXPOSE 3000

# Comando di avvio
CMD [ "node", "src/backend/server.js" ]