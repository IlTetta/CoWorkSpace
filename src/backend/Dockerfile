# Dockerfile backend (src/backend)

# STEP 1: immagine base
FROM node:18-alpine

# STEP 2: directory di lavoro nel container
WORKDIR /usr/src/app

# STEP 3: copia package.json e package-lock.json
COPY package*.json ./

# STEP 4: installa le dipendenze di produzione
RUN npm install --only=production

# STEP 5: copia tutto il backend
COPY . .

# STEP 6: espone la porta (App Runner userà process.env.PORT)
EXPOSE 5000

# STEP 7: avvia il server
CMD ["node", "server.js"]
