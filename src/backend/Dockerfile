# Dockerfile backend (src/backend)

FROM node:18-alpine

WORKDIR /usr/src/app

# Copia package.json e package-lock.json dalla root
COPY ../../package*.json ./
# Installa le dipendenze di produzione
RUN npm install --only=production

# Copia tutto il backend
COPY . .

# Espone la porta
EXPOSE 5000

# Avvia il server
CMD ["node", "server.js"]
