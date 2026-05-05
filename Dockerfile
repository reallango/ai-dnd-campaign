FROM node:22

ARG GIT_COMMIT
ENV NEXT_PUBLIC_BUILD_HASH=$GIT_COMMIT

WORKDIR /app

# Copy full project first so src/ exists before npm install
COPY .env.build .env.build
COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
