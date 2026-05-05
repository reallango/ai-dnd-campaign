FROM node:22

# Install git for commit hash detection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
