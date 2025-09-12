# Usa Nginx leggero
FROM nginx:alpine

# Copia i file statici del frontend
COPY src/frontend/ /usr/share/nginx/html

# Copia il config Nginx custom
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Espone porta 80 (Render fa il mapping verso $PORT)
EXPOSE 80

# Avvia Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
