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

# 3. Копирование ассетов из Мастер-папки в папку установки
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
FRONT_DOMAIN=$FRONT_DOMAIN
SSL_EMAIL=$SSL_EMAIL
DB_PASSWORD=$DB_PASSWORD
NEXT_PUBLIC_WP_URL=https://$WP_DOMAIN
EOF_ENV

# Подставляем данные в docker-compose
sed "s/{{WP_DOMAIN}}/$WP_DOMAIN/g; s/{{FRONT_DOMAIN}}/$FRONT_DOMAIN/g; s/{{SSL_EMAIL}}/$SSL_EMAIL/g; s/{{DB_PASSWORD}}/$DB_PASSWORD/g" docker-compose.yml.j2 > docker-compose.yml

# 5. Запуск
echo -e "\n${GREEN}>>> Запуск контейнеров в $INSTALL_DIR...${NC}"
docker compose up -d

echo -e "\n${GREEN}==============================================${NC}"
echo -e "✅ СИСТЕМА РАЗВЕРНУТА В: $INSTALL_DIR"
echo -e "🌐 Витрина:   https://$FRONT_DOMAIN"
echo -e "📦 Склад (WP): https://$WP_DOMAIN/wp-admin"
echo -e "🔑 Пароль БД:  $DB_PASSWORD"
echo -e "==============================================${NC}"
