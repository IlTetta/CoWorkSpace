FROM nginx:alpine

# Copia tutto il frontend
COPY src/frontend/ /usr/share/nginx/html

# Copia il config custom di Nginx
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
