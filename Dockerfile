FROM node:22

WORKDIR /app

COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build (git rev-parse runs automatically since .git is copied)
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
