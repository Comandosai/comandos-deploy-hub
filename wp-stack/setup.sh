#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Определяем, где лежит сам скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR=$(pwd)

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   COMANDOS WP ENGINE - INSTALLER v1.0        ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не найден. Устанавливаю...${NC}"
    curl -fsSL https://get.docker.com | sh
fi

# 2. Сбор данных
echo -e "\n${YELLOW}>>> Настройка домена${NC}"
clean_url() { echo "$1" | sed -e 's|^[^/]*//||' -e 's|/.*$||'; }

read -p "WP Domain (blog.site.com): " RAW_WP
WP_DOMAIN=$(clean_url "$RAW_WP")

read -p "SSL Email: " SSL_EMAIL

# 3. Копирование ассетов из папки шаблона в папку установки
echo -e "\n${YELLOW}>>> Копирование компонентов системы...${NC}"
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    cp "$SCRIPT_DIR/docker-compose.yml.j2" .
    cp "$SCRIPT_DIR/comandos-wp.css" .
fi

# 4. Генерация конфигов
echo -e "${YELLOW}>>> Генерация конфигурации...${NC}"
DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')

cat <<EOF_ENV > .env
WP_DOMAIN=$WP_DOMAIN
SSL_EMAIL=$SSL_EMAIL
DB_PASSWORD=$DB_PASSWORD
EOF_ENV

# Подставляем данные в docker-compose
sed "s/{{WP_DOMAIN}}/$WP_DOMAIN/g; s/{{SSL_EMAIL}}/$SSL_EMAIL/g; s/{{DB_PASSWORD}}/$DB_PASSWORD/g" docker-compose.yml.j2 > docker-compose.yml

# 5. Запуск
echo -e "\n${GREEN}>>> Запуск контейнеров в $INSTALL_DIR...${NC}"
docker compose up -d

# 6. Настройка Traefik
echo -e "\n${YELLOW}>>> Настройка Traefik (маршруты и сеть)...${NC}"
TRAEFIK_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')
if [ -z "$TRAEFIK_ID" ]; then
    echo -e "${YELLOW}Traefik контейнер не найден, пропускаю настройку маршрутов.${NC}"
else
    docker network connect comandos-network "$TRAEFIK_ID" 2>/dev/null || true

    TRAEFIK_RESOLVER=$(docker inspect "$TRAEFIK_ID" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' \
        | tr -d '[],"' | tr ' ' '\n' | grep -oE -- '--certificatesresolvers\\.[^=. ]+' | head -n1 | sed 's/--certificatesresolvers\\.//')

    if [ -n "$TRAEFIK_RESOLVER" ]; then
        TLS_BLOCK="      tls:\n        certResolver: ${TRAEFIK_RESOLVER}"
        echo -e "${GREEN}Найден certResolver Traefik: ${TRAEFIK_RESOLVER}${NC}"
    else
        TLS_BLOCK="      tls: {}"
        echo -e "${YELLOW}certResolver Traefik не найден. HTTPS может быть самоподписанным.${NC}"
    fi

    DYNAMIC_DIR=$(docker inspect "$TRAEFIK_ID" --format '{{range .Mounts}}{{printf "%s|%s\n" .Destination .Source}}{{end}}' | awk -F'|' '$1 ~ /traefik/ && $1 ~ /dynamic/ {print $2; exit}')
    if [ -z "$DYNAMIC_DIR" ]; then
        DYNAMIC_DIR="/root/traefik-dynamic"
    fi
    mkdir -p "$DYNAMIC_DIR"

    cat <<EOF_YAML > "$DYNAMIC_DIR/comandos.yml"
http:
  routers:
    comandos-wp:
      rule: "Host(\`${WP_DOMAIN}\`)"
      entryPoints:
        - websecure
${TLS_BLOCK}
      service: comandos-wp
  services:
    comandos-wp:
      loadBalancer:
        servers:
          - url: "http://comandos-wp:80"
EOF_YAML
fi

echo -e "\n${GREEN}==============================================${NC}"
echo -e "✅ СИСТЕМА РАЗВЕРНУТА В: $INSTALL_DIR"
echo -e "📦 WordPress: https://$WP_DOMAIN/wp-admin"
echo -e "🔑 Пароль БД:  $DB_PASSWORD"
echo -e "==============================================${NC}"
