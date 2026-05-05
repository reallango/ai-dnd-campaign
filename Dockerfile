FROM node:22

ARG GIT_COMMIT

WORKDIR /app

COPY . .

# If GIT_COMMIT arg provided, write it to .env.build
RUN if [ -n "$GIT_COMMIT" ]; then echo "GIT_COMMIT=$GIT_COMMIT" > .env.build; fi

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
