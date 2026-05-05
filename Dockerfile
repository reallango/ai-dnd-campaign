FROM node:22

ARG GIT_COMMIT=unknown

ENV GIT_COMMIT=$GIT_COMMIT

WORKDIR /app

COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application  
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
