# --- STAGE 1: Install All Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools for native modules (canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

COPY package*.json ./
RUN npm ci

# --- STAGE 2: Build the Application ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- STAGE 3: Prepare Production Dependencies ---
FROM node:20-alpine AS prod-deps
WORKDIR /app

# Install build tools again to compile production version of canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- STAGE 4: Final Runner Image ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init AND runtime libraries for canvas
# (The runner only needs the libraries, not the compilers)
RUN apk add --no-cache \
    dumb-init \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    curl

# Set Environment
ENV NODE_ENV=production

# 1. Copy ONLY the compiled code from Stage 2
COPY --from=builder /app/dist ./dist

# 2. Copy ONLY the production node_modules from Stage 3
COPY --from=prod-deps /app/node_modules ./node_modules

# 3. ADD THIS LINE: Copy package.json so npm can run scripts
COPY package*.json ./

# Security: Non-root user
USER node

# Entrypoint for Signal Management
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the server
CMD ["node", "dist/main"]