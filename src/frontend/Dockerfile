# Dockerfile frontend (src/frontend)

# STEP 1: immagine base Nginx leggera
FROM nginx:alpine

# STEP 2: copia i file del frontend nella directory predefinita di Nginx
COPY . /usr/share/nginx/html

# STEP 3: espone la porta standard di Nginx
EXPOSE 80

# STEP 4: avvia Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
