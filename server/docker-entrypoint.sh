#!/bin/sh
# Roda as migrations pendentes contra o Postgres do container antes de subir
# o servidor — "migrate deploy" (não "migrate dev"): só aplica migrations já
# existentes no repo, nunca gera uma nova nem pede confirmação interativa.
set -e

echo "[entrypoint] Aplicando migrations do Prisma..."
npx prisma migrate deploy --schema=server/prisma/schema.prisma

echo "[entrypoint] Migrations em dia. Iniciando o servidor..."
exec "$@"
