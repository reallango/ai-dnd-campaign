# AI D&D Campaign Manager - Dockerfile

# Build: docker build -t ai-dnd-campaign .
# Run: docker run -p 3000:3000 -v ./campaign.db:/app/campaign.db ai-dnd-campaign

# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose the port
EXPOSE 3000

# Environment variables for AI (optional)
# AI_PROVIDER=ollama
# AI_BASE_URL=http://host.docker.internal:11434
# AI_MODEL=llama3

# For cloud AI:
# AI_PROVIDER=openai
# AI_API_KEY=your-key-here

# Start the application
CMD ["npm", "run", "dev"]