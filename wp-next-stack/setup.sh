#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' 
DEFAULT_CERT_RESOLVER="mytlschallenge"
DEFAULT_FRONTEND_REPO_URL="git@github.com:Comandosai/n8n_beget_latvia.git"
DEFAULT_FRONTEND_REPO_REF="main"

# Определяем, где лежит сам скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR=$(pwd)

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   COMANDOS EXPERT ENGINE - INSTALLER v1.2    ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не найден. Устанавливаю...${NC}"
    curl -fsSL https://get.docker.com | sh
fi

# 2. Сбор данных
echo -e "\n${YELLOW}>>> Настройка доменов${NC}"
clean_url() { echo "$1" | sed -e 's|^[^/]*//||' -e 's|/.*$||'; }

read -p "WP Domain (api.site.com): " RAW_WP
WP_DOMAIN=$(clean_url "$RAW_WP")

read -p "Frontend Domain (next.site.com): " RAW_FRONT
FRONT_DOMAIN=$(clean_url "$RAW_FRONT")

read -p "SSL Email: " SSL_EMAIL

# 3. Настройка фронтенда
echo -e "\n${YELLOW}>>> Настройка фронтенда${NC}"
FRONTEND_REPO_URL=${FRONTEND_REPO_URL:-$DEFAULT_FRONTEND_REPO_URL}
FRONTEND_REPO_REF=${FRONTEND_REPO_REF:-$DEFAULT_FRONTEND_REPO_REF}
echo -e "Frontend Repo: ${FRONTEND_REPO_URL}"
echo -e "Frontend Branch: ${FRONTEND_REPO_REF}"

# 4. Копирование ассетов из Мастер-папки в папку установки
echo -e "\n${YELLOW}>>> Копирование компонентов системы...${NC}"
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    cp "$SCRIPT_DIR/docker-compose.yml.j2" .
    cp "$SCRIPT_DIR/comandos-wp.css" .
    cp "$SCRIPT_DIR/frontend.Dockerfile" .
fi

# 5. Генерация конфигов
echo -e "${YELLOW}>>> Генерация конфигурации...${NC}"
DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')

cat <<EOF_ENV > .env
WP_DOMAIN=$WP_DOMAIN
FRONT_DOMAIN=$FRONT_DOMAIN
SSL_EMAIL=$SSL_EMAIL
DB_PASSWORD=$DB_PASSWORD
FRONTEND_REPO_URL=$FRONTEND_REPO_URL
FRONTEND_REPO_REF=$FRONTEND_REPO_REF
NEXT_PUBLIC_WP_URL=https://$WP_DOMAIN
EOF_ENV

# Подставляем данные в docker-compose
escape_sed() { printf '%s' "$1" | sed -e 's/[|&]/\\&/g'; }
WP_DOMAIN_ESC=$(escape_sed "$WP_DOMAIN")
FRONT_DOMAIN_ESC=$(escape_sed "$FRONT_DOMAIN")
SSL_EMAIL_ESC=$(escape_sed "$SSL_EMAIL")
DB_PASSWORD_ESC=$(escape_sed "$DB_PASSWORD")
FRONTEND_REPO_URL_ESC=$(escape_sed "$FRONTEND_REPO_URL")
FRONTEND_REPO_REF_ESC=$(escape_sed "$FRONTEND_REPO_REF")

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    -e "s|{{FRONT_DOMAIN}}|$FRONT_DOMAIN_ESC|g" \
    -e "s|{{SSL_EMAIL}}|$SSL_EMAIL_ESC|g" \
    -e "s|{{DB_PASSWORD}}|$DB_PASSWORD_ESC|g" \
    -e "s|{{FRONTEND_REPO_URL}}|$FRONTEND_REPO_URL_ESC|g" \
    -e "s|{{FRONTEND_REPO_REF}}|$FRONTEND_REPO_REF_ESC|g" \
    docker-compose.yml.j2 > docker-compose.yml

# 6. Подготовка сети
echo -e "\n${YELLOW}>>> Проверка сети comandos-network...${NC}"
if ! docker network inspect comandos-network >/dev/null 2>&1; then
    docker network create comandos-network >/dev/null
fi

# 7. Запуск
echo -e "\n${GREEN}>>> Запуск контейнеров в $INSTALL_DIR...${NC}"
docker compose up -d --build

# 8. Настройка Traefik
echo -e "\n${YELLOW}>>> Настройка Traefik (маршруты и сеть)...${NC}"
TRAEFIK_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')
if [ -z "$TRAEFIK_ID" ]; then
    echo -e "${YELLOW}Traefik контейнер не найден, пропускаю настройку маршрутов.${NC}"
else
    docker network connect comandos-network "$TRAEFIK_ID" 2>/dev/null || true

    TRAEFIK_RESOLVER=$(docker inspect "$TRAEFIK_ID" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' \
        | tr -d '[],"' | tr ' ' '\n' | grep -oE -- '--certificatesresolvers\\.[^=. ]+' | head -n1 | sed 's/--certificatesresolvers\\.//')

    if [ -z "$TRAEFIK_RESOLVER" ]; then
        TRAEFIK_RESOLVER="$DEFAULT_CERT_RESOLVER"
        echo -e "${YELLOW}certResolver не найден. Использую по умолчанию: ${TRAEFIK_RESOLVER}${NC}"
        echo -e "${YELLOW}Если TLS не выдаётся, проверьте: открыты 80/443, DNS A/AAAA, Cloudflare proxy.${NC}"
    else
        echo -e "${GREEN}Найден certResolver Traefik: ${TRAEFIK_RESOLVER}${NC}"
    fi

    TLS_BLOCK="      tls:\n        certResolver: ${TRAEFIK_RESOLVER}"

    DYNAMIC_DIR=$(docker inspect "$TRAEFIK_ID" --format '{{range .Mounts}}{{printf "%s|%s\n" .Destination .Source}}{{end}}' | awk -F'|' '$1 ~ /traefik/ && $1 ~ /dynamic/ {print $2; exit}')
    if [ -z "$DYNAMIC_DIR" ]; then
        DYNAMIC_DIR="/root/traefik-dynamic"
    fi
    mkdir -p "$DYNAMIC_DIR"
    echo -e "${GREEN}Traefik ID: ${TRAEFIK_ID}${NC}"
    echo -e "${GREEN}Dynamic dir: ${DYNAMIC_DIR}${NC}"

    cat <<EOF_YAML > "$DYNAMIC_DIR/comandos.yml"
http:
  routers:
    comandos-wp:
      rule: "Host(\`${WP_DOMAIN}\`)"
      entryPoints:
        - websecure
${TLS_BLOCK}
      service: comandos-wp
    comandos-next:
      rule: "Host(\`${FRONT_DOMAIN}\`)"
      entryPoints:
        - websecure
${TLS_BLOCK}
      service: comandos-next
  services:
    comandos-wp:
      loadBalancer:
        servers:
          - url: "http://comandos-wp:80"
    comandos-next:
      loadBalancer:
        servers:
          - url: "http://comandos-next:3000"
EOF_YAML
fi

# 9. Установка плагинов WordPress
echo -e "\n${YELLOW}>>> Установка плагинов WordPress...${NC}"
if ! docker run --rm --network comandos-network --volumes-from comandos-wp wordpress:cli wp core is-installed --allow-root >/dev/null 2>&1; then
    echo -e "${YELLOW}WordPress еще не установлен. Завершите установку в браузере и нажмите Enter.${NC}"
    read -r
fi

if docker run --rm --network comandos-network --volumes-from comandos-wp wordpress:cli wp core is-installed --allow-root >/dev/null 2>&1; then
    docker run --rm --network comandos-network --volumes-from comandos-wp wordpress:cli wp plugin install wp-graphql wordpress-seo --activate --allow-root
else
    echo -e "${YELLOW}WordPress не установлен. Команда для ручного запуска:${NC}"
    echo "docker run --rm --network comandos-network --volumes-from comandos-wp wordpress:cli wp plugin install wp-graphql wordpress-seo --activate --allow-root"
fi

echo -e "\n${GREEN}==============================================${NC}"
echo -e "✅ СИСТЕМА РАЗВЕРНУТА В: $INSTALL_DIR"
echo -e "🌐 Витрина:   https://$FRONT_DOMAIN"
echo -e "📦 Склад (WP): https://$WP_DOMAIN/wp-admin"
echo -e "🔑 Пароль БД:  $DB_PASSWORD"
echo -e "==============================================${NC}"
