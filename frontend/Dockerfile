FROM node:16-alpine

WORKDIR /app

# Copy all files first
COPY . .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

EXPOSE 3000

# Serve the static files via the locally-installed `serve` (avoids npx cold-start)
# and respect $PORT for hosting environments that assign one.
CMD ["npm", "run", "start:prod"]
