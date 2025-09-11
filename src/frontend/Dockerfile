# Immagine base Nginx leggera
FROM nginx:alpine

# Copia i file statici del frontend
COPY . /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80

# Avvia Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
