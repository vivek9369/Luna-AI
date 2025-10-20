# 1. Use official Node.js image as base
FROM node:22-alpine AS builder

# 2. Set working directory
WORKDIR /app

# 3. Copy package.json and package-lock.json first (for caching)
COPY package.json package-lock.json ./

# 4. Install dependencies
RUN npm install --legacy-peer-deps

# 5. Copy all other files
COPY . .

# 6. Build the Next.js app
RUN npm run build

# =========================
# 2nd stage: production image
# =========================
FROM node:22-alpine AS runner

# 1. Set working directory
WORKDIR /app

# 2. Copy only the necessary files from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./.env

# 3. Expose port
EXPOSE 8080

# 4. Set environment variables for Cloud Run
ENV PORT=8080
ENV NODE_ENV=production

# 5. Start the app
CMD ["npm", "start"]
