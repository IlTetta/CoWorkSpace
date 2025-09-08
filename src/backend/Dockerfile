# STEP 1: immagine base
FROM node:18-alpine

# STEP 2: directory di lavoro nel container
WORKDIR /usr/src/app

# STEP 3: copia package.json e package-lock.json dalla root
COPY package*.json ./

# STEP 4: installa le dipendenze di produzione
RUN npm install --only=production

# STEP 5: copia solo i file del backend
COPY src/backend/ . 

# STEP 6: espone la porta
EXPOSE 5000

# STEP 7: avvia il server
CMD ["node", "server.js"]
