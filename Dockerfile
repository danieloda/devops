# ============================================================
#  MarmitaTech Pro - Multi-stage Build (Issue #10)
#  Stage 1 (builder): instala dependências + toolchain nativo
#  Stage 2 (runtime): imagem final enxuta em alpine, sem toolchain
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:18-alpine AS builder
WORKDIR /app
# bcrypt é módulo nativo: o toolchain só existe NESTA fase (não vai p/ imagem final)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: Runtime (imagem final) ----------
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Copia apenas os node_modules já compilados do builder (camada reutilizável)
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY index.js ./
COPY views ./views
COPY public ./public
COPY init.sql ./
EXPOSE 3000
# Healthcheck real: o Docker marca o container "unhealthy" se /health falhar
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
# Roda como usuário não-root (boa prática de segurança)
USER node
CMD ["node", "index.js"]
