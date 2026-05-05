FROM node:22

WORKDIR /app

# Copy full project first so src/ exists before npm install
# Note: .git is now included to allow git rev-parse in webpack
COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
