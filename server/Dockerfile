# Use an official Node runtime as a parent image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install OS deps (optional, but useful for many node modules)
RUN apk add --no-cache bash

# Copy package files first (for better build caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build step (for Nest/TypeScript)
RUN npm run build

# ---- Runtime image (optional second stage, small) ----
FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache bash

# Copy only necessary files from build stage
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# Port your Nest app listens on
EXPOSE 3000

# Command to run the app (Nest default)
CMD ["node", "dist/main.js"]
