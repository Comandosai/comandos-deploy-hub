#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' 
DEFAULT_CERT_RESOLVER="mytlschallenge"

# Определяем, где лежит сам скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR=$(pwd)

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   COMANDOS EXPERT ENGINE - INSTALLER v1.3.3  ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Проверка окружения
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не найден. Устанавливаю...${NC}"
    curl -fsSL https://get.docker.com | sh
fi

# Проверка портов 80 и 443
check_ports() {
    for port in 80 443; do
        if ss -tuln | grep -q ":$port "; then
            echo -e "${RED}ВНИМАНИЕ: Порт $port уже занят другим процессом!${NC}"
            echo -e "${YELLOW}Это может помешать работе Traefik и получению SSL-сертификатов.${NC}"
            read -p "Продолжить всё равно? (y/n): " confirm
            if [[ ! $confirm =~ ^[Yy]$ ]]; then exit 1; fi
        fi
    done
}
check_ports

# 2. Определение режима (Установка или Обновление)
MODE="INSTALL"
if [ -f ".env" ]; then
    echo -e "\n${BLUE}>>> Обнаружена существующая установка!${NC}"
    echo -e "1) ${GREEN}Обновить${NC} (сохранить базу данных и настройки)"
    echo -e "2) ${RED}Переустановить${NC} (СТЕРЕТЬ ВСЁ и начать заново)"
    read -p "Выберите вариант (1/2): " choice
    if [ "$choice" == "1" ]; then
        MODE="UPDATE"
        source .env
        echo -e "${GREEN}Режим ОБНОВЛЕНИЯ активирован.${NC}"
    else
        echo -e "${RED}ВНИМАНИЕ: Все данные будут удалены!${NC}"
        read -p "Вы уверены? (y/n): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then exit 1; fi
    fi
fi

# 3. Сбор данных (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${YELLOW}>>> Настройка доменов${NC}"
    clean_url() { echo "$1" | sed -e 's|^[^/]*//||' -e 's|/.*$||'; }

    read -p "WP Domain (api.site.com): " RAW_WP
    WP_DOMAIN=$(clean_url "$RAW_WP")

    read -p "Frontend Domain (next.site.com): " RAW_FRONT
    FRONT_DOMAIN=$(clean_url "$RAW_FRONT")

    read -p "SSL Email: " SSL_EMAIL
    
    DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
fi

# 4. Подготовка компонентов системы
echo -e "\n${YELLOW}>>> Подготовка компонентов системы...${NC}"

GITHUB_BASE="https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-next-stack"

download_if_missing() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}Файл $file не найден. Скачиваю из GitHub...${NC}"
        curl -sL "$GITHUB_BASE/$file" -o "$file"
        if [ ! -f "$file" ]; then
            echo -e "${RED}Ошибка: не удалось скачать $file${NC}"
            exit 1
        fi
    fi
}

download_if_missing "docker-compose.yml.j2"
download_if_missing "comandos-wp.css"

# Копирование (если мы в режиме локальной разработки из Мастер-папки)
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ] && [ -f "$SCRIPT_DIR/docker-compose.yml.j2" ]; then
    cp "$SCRIPT_DIR/docker-compose.yml.j2" .
    cp "$SCRIPT_DIR/comandos-wp.css" .
fi

# 5. Генерация конфигов (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    echo -e "${YELLOW}>>> Генерация конфигурации...${NC}"
    cat <<EOF_ENV > .env
WP_DOMAIN=$WP_DOMAIN
FRONT_DOMAIN=$FRONT_DOMAIN
SSL_EMAIL=$SSL_EMAIL
DB_PASSWORD=$DB_PASSWORD
NEXT_PUBLIC_WP_URL=https://$WP_DOMAIN
WP_API_BASE=https://$WP_DOMAIN/wp-json/wp/v2
EOF_ENV
fi

# Подставляем данные в docker-compose
escape_sed() { printf '%s' "$1" | sed -e 's/[|&]/\\&/g'; }
WP_DOMAIN_ESC=$(escape_sed "$WP_DOMAIN")
FRONT_DOMAIN_ESC=$(escape_sed "$FRONT_DOMAIN")
SSL_EMAIL_ESC=$(escape_sed "$SSL_EMAIL")
DB_PASSWORD_ESC=$(escape_sed "$DB_PASSWORD")

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    -e "s|{{FRONT_DOMAIN}}|$FRONT_DOMAIN_ESC|g" \
    -e "s|{{SSL_EMAIL}}|$SSL_EMAIL_ESC|g" \
    -e "s|{{DB_PASSWORD}}|$DB_PASSWORD_ESC|g" \
    docker-compose.yml.j2 > docker-compose.yml

# 6. Очистка (только при переустановке)
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${YELLOW}>>> Очистка старых контейнеров...${NC}"
    PROJECT_NAME=$(basename "$INSTALL_DIR")
    DB_VOLUME="${PROJECT_NAME}_comandos-db-data"
    docker rm -f comandos-db comandos-wp comandos-next 2>/dev/null || true
    if docker volume ls -q | grep -Fx "$DB_VOLUME" >/dev/null 2>&1; then
        docker volume rm "$DB_VOLUME" >/dev/null 2>&1 || true
    fi
fi

# 6. Подготовка сети
echo -e "\n${YELLOW}>>> Проверка сети comandos-network...${NC}"
if ! docker network inspect comandos-network >/dev/null 2>&1; then
    docker network create comandos-network >/dev/null
fi

# 7. Обновление образов
echo -e "\n${YELLOW}>>> Обновление образов...${NC}"
docker compose pull >/dev/null 2>&1 || true

# 8. Запуск системы
echo -e "\n${GREEN}>>> Запуск контейнеров в $INSTALL_DIR...${NC}"
if ! docker compose up -d; then
    echo -e "${RED}Ошибка запуска контейнеров. Проверьте логи: docker compose logs${NC}"
    exit 1
fi

# 9. Настройка Traefik
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

    TLS_BLOCK=$(cat <<EOF
      tls:
        certResolver: ${TRAEFIK_RESOLVER}
EOF
)

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

# 10. Финализация

echo -e "\n${GREEN}==============================================${NC}"
echo -e "✅ СИСТЕМА РАЗВЕРНУТА В: $INSTALL_DIR"
echo -e "🌐 Витрина:   https://$FRONT_DOMAIN"
echo -e "📦 Склад (WP): https://$WP_DOMAIN/wp-admin"
echo -e "🔑 Пароль БД:  $DB_PASSWORD"
echo -e "==============================================${NC}"
