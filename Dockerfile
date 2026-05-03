FROM node:20-alpine

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy app files
COPY . .

# Build the app - fail if this fails
RUN npm run build || { echo "BUILD FAILED"; exit 1; }

# Expose port
EXPOSE 3000

# Run production
ENV NODE_ENV=production
CMD ["npm", "start"]
