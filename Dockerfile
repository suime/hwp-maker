FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN cat <<'EOF' > /usr/local/share/ca-certificates/somansa-root-ca.crt
-----BEGIN CERTIFICATE-----
MIIDQjCCAiqgAwIBAgIBATANBgkqhkiG9w0BAQsFADA5MQswCQYDVQQGEwJLUjEQ
MA4GA1UEChMHU29tYW5zYTEYMBYGA1UEAxMPU29tYW5zYSBSb290IENBMB4XDTE3
MDgyOTA0NTM0NFoXDTI3MDgyNzA0NTM0NFowOTELMAkGA1UEBhMCS1IxEDAOBgNV
BAoTB1NvbWFuc2ExGDAWBgNVBAMTD1NvbWFuc2EgUm9vdCBDQTCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAN03qAXFQvavo+OgtxCAA2f8mD5TzCSp55wu
Bszaj2aiKjxE8WUfe0d4OtogZhpVJPxW0GWknyJAW3R2guWJ6mzTjtCSjkE3LsEi
QT4Vf9LVTtDtA+ZjWk/7tqKUb6SFJi0+tCmn2IhbANpVtqwTJ5vOjiY2LfwTj0FZ
NXPp+QNUEF+1btX+vAhnJnvagD0ADyChvihuqo1wn32Ril/hbaa9QcSWoMxxgL7g
JZ3XH9+70WrnAnpUW5NLG4WUUYHfMVagQyT8GMm0OEH4+Ydbh2SBgGCh80GOz3fF
ljFTG0IZ945xYSS7Ul+pfUGHCUcOhstruRQNtrN1LSoQSGEXezECAwEAAaNVMFMw
EgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQUsoMsUHPpkKLNbOjCLWAl7qFk
ZUYwCwYDVR0PBAQDAgEGMBEGCWCGSAGG+EIBAQQEAwIABzANBgkqhkiG9w0BAQsF
AAOCAQEAfNNLtOL4hCjumTNR9ztTj1cxlWxTkTXJRrlyXXJCamA50UaH+5lYVWsG
XdOEbPgviPm0DkFAKv1zsv1DpchBZK1mXzTvjExiDrqi54J1SJLBFIwXJUUyxj+6
lohw9iYCaK3XFU+fFFvT+s7Jts0DScRZtoPLPKLjRWPY7wSXe895o99dUNOn4RDg
7p/+SrWKq7NOEMN3Rbqe04N7O4jwPbKpTFuBYXoLneQGoUmR0j+o/8m1/5m3hzDP
CqrSCFG3Gpsv51pHXW3gFvoiQJtkFdiOge4GoYMZXgWHctXQQHvhC82Yw8IUIkww
Lui45nqPKbAmZ4UfI6yxrRZGE186oQ==
-----END CERTIFICATE-----
EOF
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm config set cafile /etc/ssl/certs/ca-certificates.crt && npm ci --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
