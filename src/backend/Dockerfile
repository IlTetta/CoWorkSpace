# Dockerfile backend (src/backend)

FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json from the root
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy all backend files
COPY src/backend/ .

# Expose the port
EXPOSE 3000

# Run both SQL scripts and then start the server
CMD ["sh", "-c", "psql $DATABASE_URL -f init.sql && psql $DATABASE_URL -f seed.sql && node server.js"]