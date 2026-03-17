#!/bin/bash
# =============================================================
# Sync banco de dados local → servidor ptbd01
#
# Uso: ./sync-to-server.sh
#
# Exporta o banco local e importa no PostgreSQL do servidor
# (container Docker postgres16 na rede minha_rede)
# =============================================================

set -e

SERVER="ptbd01.viptecnologia.com.br"
DB_NAME="project_cataloger"
DB_USER="rafaeljrs"
PG_CONTAINER="890c3d536565"  # postgres16 container
DUMP_FILE="/tmp/project_cataloger_dump.sql"

echo "================================"
echo "  Sync Catalogador → Servidor"
echo "================================"
echo ""

# 1. Dump local
echo "[1/3] Exportando banco local..."
pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists --no-owner --no-privileges > $DUMP_FILE
DUMP_SIZE=$(du -h $DUMP_FILE | cut -f1)
echo "       Dump: $DUMP_FILE ($DUMP_SIZE)"

# 2. Enviar para servidor
echo "[2/3] Enviando para $SERVER..."
scp $DUMP_FILE root@$SERVER:/tmp/project_cataloger_dump.sql

# 3. Importar no container PostgreSQL
echo "[3/3] Importando no servidor (container Docker)..."

# Find postgres16 container ID dinamicamente
PG_ID=$(ssh root@$SERVER "docker ps --filter name=postgres16_postgres16 --format '{{.ID}}' | head -1")

if [ -z "$PG_ID" ]; then
    echo "ERRO: Container postgres16 nao encontrado!"
    exit 1
fi

echo "       Container: $PG_ID"

# Garantir que user e database existem
ssh root@$SERVER "docker exec $PG_ID psql -U postgres -c \"DO \\\$\\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='rafaeljrs') THEN CREATE ROLE rafaeljrs WITH LOGIN SUPERUSER PASSWORD 'nw01'; END IF; END \\\$\\\$;\"" 2>/dev/null
ssh root@$SERVER "docker exec $PG_ID psql -U postgres -lqt | grep -qw project_cataloger || docker exec $PG_ID createdb -U postgres -O rafaeljrs project_cataloger" 2>/dev/null

# Copiar dump para container e importar
ssh root@$SERVER "docker cp /tmp/project_cataloger_dump.sql $PG_ID:/tmp/dump.sql && docker exec $PG_ID psql -U rafaeljrs -d project_cataloger -f /tmp/dump.sql 2>&1 | tail -3"

# Verificar
echo ""
REMOTE_COUNT=$(ssh root@$SERVER "docker exec $PG_ID psql -U rafaeljrs -d project_cataloger -t -c 'SELECT COUNT(*) FROM projects'" | tr -d ' ')
LOCAL_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM projects" | tr -d ' ')

echo "Projetos local:    $LOCAL_COUNT"
echo "Projetos servidor: $REMOTE_COUNT"

# Limpar
rm -f $DUMP_FILE
ssh root@$SERVER "rm -f /tmp/project_cataloger_dump.sql && docker exec $PG_ID rm -f /tmp/dump.sql" 2>/dev/null

echo ""
if [ "$REMOTE_COUNT" = "$LOCAL_COUNT" ]; then
    echo "✓ Sync completo! $REMOTE_COUNT projetos sincronizados."
else
    echo "⚠ Contagens diferentes. Verifique."
fi
echo ""
echo "→ https://projetos.rafaeljunior.vip"
