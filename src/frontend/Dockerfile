FROM nginx:alpine

# Copia i file statici del frontend
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Render assegna la porta con la variabile PORT
ENV PORT=10000
CMD ["/bin/sh", "-c", "sed -i 's/80/$PORT/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
