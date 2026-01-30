#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_logo() {
    echo -e "${BLUE}"
    cat << "EOF"
 ██████╗ ██████╗ ███╗   ███╗ █████╗ ██████╗  ██████╗ ███████╗   █████╗ ██╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔══██╗██╔═══██╗██╔════╝  ██╔══██╗██║
██║     ██║   ██║██╔████╔██║███████║██║  ██║██║   ██║███████╗  ███████║██║
██║     ██║   ██║██║╚██╔╝██║██╔══██║██║  ██║██║   ██║╚════██║  ██╔══██║██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝╚██████╔╝███████║  ██║  ██║██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚══════╝  ╚═╝  ╚═╝╚═╝
EOF
    echo -e "${NC}"
    echo -e "${YELLOW}                 POWERED BY COMANDOS AI${NC}"
    echo
}

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 0. Стандартизация директории
BASE_DIR="$HOME/comandos"
PRODUCT_DIR="$BASE_DIR/wordpress"

# Создаем структуру если её нет
mkdir -p "$PRODUCT_DIR"

# Переходим в директорию продукта
cd "$PRODUCT_DIR" || exit 1
INSTALL_DIR=$(pwd)

print_logo
print_header "COMANDOS WP ENGINE - INSTALLER v2.4.5"
print_info "DIR: $INSTALL_DIR"
echo

# 1. Проверка окружения
if ! command -v docker &> /dev/null; then
    print_warning "Docker не найден. Устанавливаю..."
    curl -fsSL https://get.docker.com | sh
fi

# Проверка портов 80 и 443 (Информационная)
check_ports() {
    for port in 80 443; do
        if ss -tuln | grep -q ":$port "; then
            print_info "Порт $port занят (нормально для Traefik)."
        fi
    done
}
check_ports

# 2. Определение режима (Установка или Обновление)
MODE="INSTALL"
if [ -f ".env" ]; then
    echo -e "\n"
    print_header "ОБНАРУЖЕНА СУЩЕСТВУЮЩАЯ УСТАНОВКА!"
    echo -e "1) ${GREEN}Обновить${NC} (сохранить базу данных и настройки)"
    echo -e "2) ${RED}Переустановить${NC} (СТЕРЕТЬ ВСЁ и начать заново)"
    read -p "Выберите вариант (1/2): " choice < /dev/tty
    if [ "$choice" == "1" ]; then
        MODE="UPDATE"
        source .env
        print_success "Режим ОБНОВЛЕНИЯ активирован."
    else
        print_error "ВНИМАНИЕ: Все данные будут удалены!"
        read -p "Вы уверены? (y/n): " confirm < /dev/tty
        if [[ ! $confirm =~ ^[Yy]$ ]]; then exit 1; fi
    fi
fi

# 3. Сбор данных (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${YELLOW}>>> Настройка домена${NC}"
    clean_url() { echo "$1" | sed -e 's|^[^/]*//||' -e 's|/.*$||'; }

    read -p "WP Domain (blog.site.com): " RAW_WP < /dev/tty
    WP_DOMAIN=$(clean_url "$RAW_WP")

    read -p "SSL Email: " SSL_EMAIL < /dev/tty
    
    DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
fi

# 4. Подготовка компонентов системы
echo -e "\n"
print_header "ПОДГОТОВКА КОМПОНЕНТОВ СИСТЕМЫ..."

GITHUB_BASE="https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack"

download_if_missing() {
    local file=$1
    print_info "Проверка $file..."
    curl -sL "$GITHUB_BASE/$file" -o "$file"
    if [ ! -s "$file" ]; then
        echo -e "${RED}Ошибка: не удалось скачать или файл пуст: $file${NC}"
        exit 1
    fi
}

# Список файлов для полной премиум-сборки
FILES=("docker-compose.yml.j2" "comandos-wp.css" "user-guide.md.j2" "functions.php" "header.php" "footer.php" "index.php" "single.php" "style.css" "critical-wp.css" "archive.php" "search.php" "comandos-seo-helper.php")

for file in "${FILES[@]}"; do
    download_if_missing "$file"
done

# Копирование (если мы в режиме локальной разработки) - теперь для всех файлов
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    for file in "${FILES[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            cp "$SCRIPT_DIR/$file" .
        fi
    done
fi

# 5. Генерация конфигов (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    print_header "ГЕНЕРАЦИЯ КОНФИГУРАЦИИ..."
    cat <<EOF_ENV > .env
WP_DOMAIN=$WP_DOMAIN
SSL_EMAIL=$SSL_EMAIL
DB_PASSWORD=$DB_PASSWORD
EOF_ENV
fi

# Подставляем данные в docker-compose
escape_sed() { printf '%s' "$1" | sed -e 's/[|&]/\\&/g'; }
WP_DOMAIN_ESC=$(escape_sed "$WP_DOMAIN")
SSL_EMAIL_ESC=$(escape_sed "$SSL_EMAIL")
DB_PASSWORD_ESC=$(escape_sed "$DB_PASSWORD")

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    -e "s|{{SSL_EMAIL}}|$SSL_EMAIL_ESC|g" \
    -e "s|{{DB_PASSWORD}}|$DB_PASSWORD_ESC|g" \
    docker-compose.yml.j2 > docker-compose.yml

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    user-guide.md.j2 > user-guide.md

# 6. Очистка (только при переустановке)
if [ "$MODE" == "INSTALL" ]; then
    print_warning "Очистка старых контейнеров..."
    PROJECT_NAME=$(basename "$INSTALL_DIR")
    DB_VOLUME="${PROJECT_NAME}_comandos-db-data"
    docker rm -f comandos-db comandos-wp 2>/dev/null || true
    if docker volume ls -q | grep -Fx "$DB_VOLUME" >/dev/null 2>&1; then
        docker volume rm "$DB_VOLUME" >/dev/null 2>&1 || true
    fi
fi

# 6. Подготовка сети
print_info "Проверка сети comandos-network..."
if ! docker network inspect comandos-network >/dev/null 2>&1; then
    docker network create comandos-network >/dev/null
fi

# 7. Обновление образов
print_info "Обновление образов..."
docker compose pull >/dev/null 2>&1 || true

# 8. Запуск (или обновление)
print_success "Запуск/Обновление контейнеров..."
docker compose up -d

# 9. Оптимизация Lighthouse (кэширование и сжатие)
print_header "ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ (Lighthouse v2.4.5)..."
docker exec comandos-wp bash -c 'cat <<EOF >> .htaccess

# Comandos Optimization: Browser Caching & Performance
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/x-javascript "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresDefault "access plus 2 days"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(ico|pdf|flv|jpg|jpeg|png|gif|webp|js|css|swf)$">
    Header set Cache-Control "max-age=31536000, public"
  </FilesMatch>
</IfModule>

# Comandos Optimization: Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/x-javascript application/json
</IfModule>

# Comandos Optimization: WebP Rewrite Support (Placeholder)
# (If WebP images exist, serve them. Requires advanced configuration or plugins)
EOF' || true

# 9. Настройка Traefik
print_header "НАСТРОЙКА TRAEFIK (МАРШРУТЫ И СЕТЬ)..."
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
  services:
    comandos-wp:
      loadBalancer:
        servers:
          - url: "http://comandos-wp:80"
EOF_YAML
fi

# 10. Глубокая интеграция темы и плагинов (Comandos Premium)
print_header "ПОДГОТОВКА ТЕМЫ И ПЛАГИНОВ COMANDOS..."

# Путь к нашей кастомной теме и плагину
THEME_NAME="comandos-blog"
THEME_DIR="/var/www/html/wp-content/themes/$THEME_NAME"
PLUGIN_NAME="comandos-seo-helper"
PLUGIN_DIR="/var/www/html/wp-content/plugins/$PLUGIN_NAME"

# Создаем папки
docker exec comandos-wp mkdir -p "$THEME_DIR"
docker exec comandos-wp mkdir -p "$PLUGIN_DIR"

sync_file() {
    local src=$1
    local dest=$2
    if [ -f "$src" ]; then
        docker cp "$src" comandos-wp:"$dest" && echo -e "${GREEN}Синхронизирован: $src${NC}"
        docker exec comandos-wp chown www-data:www-data "$dest"
    fi
}

# Копируем тему
sync_file "comandos-wp.css" "$THEME_DIR/comandos-wp.css"
sync_file "functions.php" "$THEME_DIR/functions.php"
sync_file "single.php" "$THEME_DIR/single.php"
sync_file "header.php" "$THEME_DIR/header.php"
sync_file "footer.php" "$THEME_DIR/footer.php"
sync_file "index.php" "$THEME_DIR/index.php"
sync_file "archive.php" "$THEME_DIR/archive.php"
sync_file "search.php" "$THEME_DIR/search.php"
sync_file "style.css" "$THEME_DIR/style.css"
sync_file "critical-wp.css" "$THEME_DIR/critical-wp.css"

# Копируем плагин
sync_file "comandos-seo-helper.php" "$PLUGIN_DIR/comandos-seo-helper.php"

# Установка WP-CLI и регенерация миниатюр + активация плагина
print_info "Установка WP-CLI и настройка..."
docker exec -u 0 comandos-wp bash -c "
  if [ ! -f /usr/local/bin/wp ]; then
    curl -sSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp
    chmod +x /usr/local/bin/wp
  fi
  # Активируем плагин принудительно
  wp plugin activate $PLUGIN_NAME --allow-root || true
  # Регенерация миниатюр
  wp media regenerate --yes --allow-root
" || print_warning "Не удалось завершить настройку через WP-CLI."

# ИНТЕРАКТИВНАЯ АКТИВАЦИЯ ТЕМЫ
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${BLUE}==============================================${NC}"
    echo -e "${YELLOW}ШАГ 1:${NC} Перейдите по ссылке: ${GREEN}https://$WP_DOMAIN/wp-admin/install.php${NC}"
    echo -e "${YELLOW}ШАГ 2:${NC} Завершите установку WordPress (создайте админа)."
    echo -e "${YELLOW}ШАГ 3:${NC} Вернитесь сюда и нажмите ${BLUE}[ENTER]${NC} для активации темы."
    echo -e "${BLUE}==============================================${NC}"
    read -p "Нажмите [ENTER] после завершения установки в браузере..." < /dev/tty
fi

print_warning "Принудительная активация темы через SQL..."
DB_PASS_SQL="${DB_PASSWORD:-$(grep DB_PASSWORD .env | cut -d= -f2)}"
docker exec comandos-db mysql -uwordpress -p"$DB_PASS_SQL" wordpress -e \
"UPDATE wp_options SET option_value = '$THEME_NAME' WHERE option_name IN ('template', 'stylesheet');"

# 11. Финализация
echo -e "\n"
print_header "СИСТЕМА ГОТОВА И ПЕРЕНЕСЕНА!"
print_info "WordPress: https://$WP_DOMAIN/"
print_info "Тема:      Comandos Blog (Premium v2.4.5)"
print_info "Админка:   https://$WP_DOMAIN/wp-admin"
print_warning "Совет: Если дизайн не обновился, сбросьте кэш браузера (Ctrl+F5)"
echo -e "${BLUE}================================================${NC}"
