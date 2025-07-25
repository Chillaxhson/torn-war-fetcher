# Stage 1: Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json to enable "type": "module"
COPY --from=build /app/package.json ./

# Copy production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules
# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/api/server.js"] 
