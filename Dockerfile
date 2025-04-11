FROM node:16-alpine

WORKDIR /app

# Copy frontend files
COPY frontend/ ./

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

EXPOSE 3000

# Serve the static files
CMD ["npx", "serve", "-s", "build", "-l", "3000"] 