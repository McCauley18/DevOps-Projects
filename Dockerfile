# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.17.1
FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV=production

# Set working directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Use a non-root user for security
USER node

# Expose the app's port
EXPOSE 3001

# Run the app
CMD ["node", "FrontEnd/zerver.js"]