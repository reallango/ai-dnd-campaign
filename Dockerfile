FROM node:22

WORKDIR /app

# Copy full project first so src/ exists before npm install
COPY . .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
