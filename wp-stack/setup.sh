#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEFAULT_CERT_RESOLVER="myresolver"

# Paths for local snapshot (full WP clone)
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOT_DIR="$SCRIPT_DIR/snapshot"
SNAPSHOT_TAR="wordpress_data.tar.gz"
SNAPSHOT_DB="wordpress_db.sql.gz"
SNAPSHOT_URL="${COMANDOS_SNAPSHOT_URL:-}"
SNAPSHOT_DB_URL="${COMANDOS_SNAPSHOT_DB_URL:-}"
RESTORE_SNAPSHOT="${COMANDOS_RESTORE_SNAPSHOT:-false}"

print_logo() {
    echo -e "${BLUE}"
    cat << "EOF"
 ██████╗ ██████╗ ███╗   ███╗ █████╗ ███╗   ██╗██████╗  ██████╗ ███████╗   █████╗ ██╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔═══██╗██╔════╝  ██╔══██╗██║
██║     ██║   ██║██╔████╔██║███████║██╔██╗ ██║██║  ██║██║   ██║███████╗  ███████║██║
██║     ██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██║   ██║╚════██║  ██╔══██║██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝╚██████╔╝███████║  ██║  ██║██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚══════╝  ╚═╝  ╚═╝╚═╝
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

# Функция для надежного ввода через /dev/tty (для работы через curl | bash)
ask_user() {
    local prompt=$1
    local var_name=$2
    local extra_opt=$3
    
    # Пытаемся читать из /dev/tty напрямую
    if [ -c /dev/tty ]; then
        read $extra_opt -p "$prompt" "$var_name" < /dev/tty
    else
        # Fallback если /dev/tty нет (редкий случай)
        read $extra_opt -p "$prompt" "$var_name"
    fi
}

detect_snapshot() {
    if [ -f "$SNAPSHOT_DIR/$SNAPSHOT_TAR" ] && [ -f "$SNAPSHOT_DIR/$SNAPSHOT_DB" ]; then
        return 0
    fi

    if [ -n "$SNAPSHOT_URL" ] && [ -n "$SNAPSHOT_DB_URL" ]; then
        print_info "Скачивание snapshot..."
        mkdir -p "$SNAPSHOT_DIR"
        curl -fsSL "$SNAPSHOT_URL" -o "$SNAPSHOT_DIR/$SNAPSHOT_TAR"
        curl -fsSL "$SNAPSHOT_DB_URL" -o "$SNAPSHOT_DIR/$SNAPSHOT_DB"
        if [ -s "$SNAPSHOT_DIR/$SNAPSHOT_TAR" ] && [ -s "$SNAPSHOT_DIR/$SNAPSHOT_DB" ]; then
            return 0
        fi
    fi

    return 1
}

wait_for_db() {
    local tries=30
    while ! docker exec comandos-db mysqladmin ping -uwordpress -p"$DB_PASSWORD" --silent >/dev/null 2>&1; do
        tries=$((tries-1))
        if [ $tries -le 0 ]; then
            print_warning "DB не отвечает, продолжаю без ожидания."
            return 1
        fi
        sleep 2
    done
    return 0
}

ensure_wp_cli() {
    docker exec -u 0 comandos-wp bash -c '
      if [ ! -f /usr/local/bin/wp ]; then
        curl -sSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp
        chmod +x /usr/local/bin/wp
      fi
    '
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
print_header "COMANDOS WP ENGINE - INSTALLER v2.5.1"
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
    ask_user "Выберите вариант (1/2): " choice
    if [ "$choice" == "1" ]; then
        MODE="UPDATE"
        source .env
        print_success "Режим ОБНОВЛЕНИЯ активирован."
    else
        print_error "ВНИМАНИЕ: Все данные будут удалены!"
        ask_user "Вы уверены? (y/n): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then exit 1; fi
    fi
fi

# 3. Сбор данных (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${YELLOW}>>> Настройка домена${NC}"
    clean_url() { echo "$1" | sed -e 's|^[^/]*//||' -e 's|/.*$||'; }

    ask_user "WP Domain (blog.site.com): " RAW_WP
    WP_DOMAIN=$(clean_url "$RAW_WP")

    ask_user "SSL Email: " SSL_EMAIL
    
    DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
fi

# 4. Подготовка компонентов системы
echo -e "\n"
print_header "ПОДГОТОВКА КОМПОНЕНТОВ СИСТЕМЫ..."

GITHUB_BASE="https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack"

download_if_missing() {
    local file=$1
    local dir=$(dirname "$file")
    
    # Создаем подпапку локально, если её нет
    if [ "$dir" != "." ]; then
        mkdir -p "$dir"
    fi
    
    print_info "Проверка $file..."
    curl -sL "$GITHUB_BASE/$file" -o "$file"
    if [ ! -s "$file" ]; then
        echo -e "${RED}Ошибка: не удалось скачать или файл пуст: $file${NC}"
        exit 1
    fi
}

# Список файлов для полной премиум-сборки (включая все подпапки)
FILES=(
    "docker-compose.yml.j2" "comandos-wp.css" "user-guide.md.j2" ".htaccess"
    "functions.php" "header.php" "footer.php" "index.php" "single.php" 
    "style.css" "critical-desktop.css" "critical-mobile.css" "archive.php" "search.php"
    "inc/critical-css.php" "inc/customizer.php" "inc/enqueue.php" 
    "inc/optimization.php" "inc/performance.php" "inc/setup.php"
    "template-parts/header/branding.php" "template-parts/header/navigation.php" "template-parts/header/search.php"
    "assets/fonts/unbounded-900.woff2" "assets/fonts/inter-400-subset.woff2" "assets/fonts/inter-700-subset.woff2" "assets/fonts/inter-800-subset.woff2" "assets/fonts/inter-900-subset.woff2"
    "js/customize-preview.js"
)

for file in "${FILES[@]}"; do
    download_if_missing "$file"
done

# Копирование (если мы в режиме локальной разработки) - теперь для всех файлов
if [ -n "$SCRIPT_DIR" ] && [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    for file in "${FILES[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            cp "$SCRIPT_DIR/$file" .
        fi
    done
fi

# Обнаружение snapshot (полный клон сайта) — только если явно включено
if [ "$RESTORE_SNAPSHOT" == "true" ]; then
    if detect_snapshot; then
        print_success "Найден snapshot. Будет восстановление полного сайта."
    else
        print_warning "RESTORE_SNAPSHOT=true, но snapshot не найден. Продолжаю обычную установку."
        RESTORE_SNAPSHOT="false"
    fi
else
    print_info "Snapshot restore отключен. Будет чистая установка."
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

# 8.5 Восстановление полного сайта из snapshot (если найден)
if [ "$MODE" == "INSTALL" ] && [ "$RESTORE_SNAPSHOT" == "true" ]; then
    print_header "ВОССТАНОВЛЕНИЕ САЙТА ИЗ SNAPSHOT..."
    wait_for_db

    print_info "Копирование файлов сайта..."
    docker exec comandos-wp bash -c "rm -rf /var/www/html/* /var/www/html/.[!.]* /var/www/html/..?*"
    docker cp "$SNAPSHOT_DIR/$SNAPSHOT_TAR" comandos-wp:/tmp/wordpress_data.tar.gz
    docker exec comandos-wp bash -c "tar -xzf /tmp/wordpress_data.tar.gz -C /var/www/html && rm -f /tmp/wordpress_data.tar.gz"
    docker exec -u 0 comandos-wp chown -R www-data:www-data /var/www/html

    print_info "Импорт базы данных..."
    docker exec comandos-db mysql -uroot -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS wordpress; CREATE DATABASE wordpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON wordpress.* TO 'wordpress'@'%'; FLUSH PRIVILEGES;"
    docker cp "$SNAPSHOT_DIR/$SNAPSHOT_DB" comandos-db:/tmp/wordpress_db.sql.gz
    docker exec comandos-db bash -c "gunzip -c /tmp/wordpress_db.sql.gz | mysql -uwordpress -p\"$DB_PASSWORD\" wordpress"
    docker exec comandos-db rm -f /tmp/wordpress_db.sql.gz

    ensure_wp_cli

    OLD_URL=$(docker exec comandos-wp bash -c "wp option get home --allow-root" || true)
    if [ -n "$OLD_URL" ]; then
        print_info "Обновление домена: $OLD_URL -> https://$WP_DOMAIN"
        docker exec comandos-wp bash -c "wp search-replace \"$OLD_URL\" \"https://$WP_DOMAIN\" --all-tables --skip-columns=guid --allow-root"
        docker exec comandos-wp bash -c "wp option update home \"https://$WP_DOMAIN\" --allow-root"
        docker exec comandos-wp bash -c "wp option update siteurl \"https://$WP_DOMAIN\" --allow-root"
        docker exec comandos-wp bash -c "wp rewrite flush --hard --allow-root"
    fi
fi

# 9. Оптимизация Lighthouse (кэширование и сжатие v4.1)
if [ "$RESTORE_SNAPSHOT" != "true" ]; then
print_header "ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ (Lighthouse 98+)..."
docker exec comandos-wp bash -c 'cat <<EOF > .htaccess

# Comandos Optimization: Browser Caching (v4.1 Immutable)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/x-javascript "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(ico|pdf|flv|jpg|jpeg|png|gif|webp|js|css|swf|woff2)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>
</IfModule>

# Comandos Optimization: Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/x-javascript application/json font/woff2
</IfModule>

# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
EOF' || true
fi

# 9. Настройка Traefik
print_header "НАСТРОЙКА TRAEFIK (МАРШРУТЫ И СЕТЬ)..."
TRAEFIK_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')
if [ -z "$TRAEFIK_ID" ]; then
    echo -e "${YELLOW}Traefik контейнер не найден.${NC}"
    
    # Спрашиваем про установку Traefik ТОЛЬКО если это режим INSTALL
    if [ "$MODE" == "INSTALL" ]; then
        echo -e "\n${BLUE}==============================================${NC}"
        echo -e "${YELLOW}ВНИМАНИЕ: Для доступа к сайту из интернета нужен Traefik!${NC}"
        echo -e "Хотите установить и настроить Traefik автоматически? (Рекомендуется)"
        ask_user "Установить Traefik? (y/n): " install_traefik_choice
        
        if [[ $install_traefik_choice =~ ^[Yy]$ ]]; then
            print_info "Установка Traefik..."
            mkdir -p "$BASE_DIR/traefik"
            mkdir -p "$BASE_DIR/traefik/dynamic"
            touch "$BASE_DIR/traefik/acme.json"
            chmod 600 "$BASE_DIR/traefik/acme.json"
            
            # Создаем docker-compose для Traefik
            cat <<EOF_TRAEFIK > "$BASE_DIR/traefik/docker-compose.yml"
version: '3'

services:
  traefik:
    image: traefik:latest
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    environment:
      - DOCKER_API_VERSION=1.44
    networks:
      - comandos-network
    ports:
      - 80:80
      - 443:443
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json
      - ./dynamic:/dynamic_conf
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.file.directory=/dynamic_conf"
      - "--providers.file.watch=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=$SSL_EMAIL"
      - "--certificatesresolvers.myresolver.acme.storage=/acme.json"

networks:
  comandos-network:
    external: true
EOF_TRAEFIK

            # Запускаем Traefik
            print_info "Запуск Traefik..."
            docker compose -f "$BASE_DIR/traefik/docker-compose.yml" up -d
            
            # Получаем ID только что запущенного контейнера
            TRAEFIK_ID=$(docker ps --format '{{.ID}}' --filter "name=traefik")
            print_success "Traefik успешно установлен и запущен!"
            
            # Небольшая пауза, чтобы Traefik инициализировался
            sleep 10
        fi
    fi
    
    if [ -z "$TRAEFIK_ID" ]; then
        echo -e "${YELLOW}Пропускаю настройку маршрутов (Traefik не установлен).${NC}"
        echo -e "${RED}ВАЖНО: Сайт может быть недоступен извне без прокси-сервера!${NC}"
    fi
fi

# БЛОК 2: Генерация конфига
if [ ! -z "$TRAEFIK_ID" ]; then
    docker network connect comandos-network "$TRAEFIK_ID" 2>/dev/null || true

    # Пытаемся вытащить имя резолвера из Cmd или Entrypoint (с поддержкой разных форматов)
    TRAEFIK_RESOLVER=$(docker inspect "$TRAEFIK_ID" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' \
        | tr -d '[],"' | tr ' ' '\n' | grep -oE -- 'certificatesresolvers\.[^=. ]+' | head -n1 | sed 's/certificatesresolvers\.//')

    # Если не нашли — пробуем через логи (иногда там мелькает) или используем умный fallback
    if [ -z "$TRAEFIK_RESOLVER" ]; then
        # Список популярных имен в нашей экосистеме
        for known in "mytlschallenge" "myresolver" "letsencrypt" "comandos-resolver"; do
            if docker logs --tail 100 "$TRAEFIK_ID" 2>&1 | grep -q "$known"; then
                TRAEFIK_RESOLVER="$known"
                break
            fi
        done
    fi

    # Если всё еще пусто — берем дефолт
    if [ -z "$TRAEFIK_RESOLVER" ]; then
        TRAEFIK_RESOLVER="$DEFAULT_CERT_RESOLVER"
        echo -e "${YELLOW}certResolver не найден. Использую по умолчанию: ${TRAEFIK_RESOLVER}${NC}"
    else
        echo -e "${GREEN}Найден certResolver Traefik: ${TRAEFIK_RESOLVER}${NC}"
    fi

    TLS_BLOCK=$(cat <<EOF
      tls:
        certResolver: ${TRAEFIK_RESOLVER}
EOF
)

    # Если мы только что поставили Traefik сами - мы точно знаем путь
    if [ ! -z "$install_traefik_choice" ] && [[ $install_traefik_choice =~ ^[Yy]$ ]]; then
         DYNAMIC_DIR="$BASE_DIR/traefik/dynamic"
    else
         # Иначе пытаемся определить через Docker Inspect (для внешнего Traefik)
         DYNAMIC_DIR=$(docker inspect "$TRAEFIK_ID" --format '{{range .Mounts}}{{printf "%s|%s\n" .Destination .Source}}{{end}}' | awk -F'|' '$1 ~ /traefik/ && $1 ~ /dynamic/ {print $2; exit}')
    fi
    # Fallback, если всё сломалось
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
if [ "$RESTORE_SNAPSHOT" != "true" ]; then
print_header "ПОДГОТОВКА ТЕМЫ И ПЛАГИНОВ COMANDOS..."

# Путь к нашей кастомной теме и плагину
THEME_NAME="comandos-ai-blog"
THEME_DIR="/var/www/html/wp-content/themes/$THEME_NAME"
# Создаем папки
docker exec comandos-wp mkdir -p "$THEME_DIR"

sync_file() {
    local src=$1
    local dest=$2
    if [ -f "$src" ]; then
        docker cp "$src" comandos-wp:"$dest" && echo -e "${GREEN}Синхронизирован: $src${NC}"
        docker exec comandos-wp chown www-data:www-data "$dest"
    fi
}

# Копируем тему и её компоненты (с поддержкой папок)
sync_file "comandos-wp.css" "$THEME_DIR/comandos-wp.css"
sync_file "functions.php" "$THEME_DIR/functions.php"
sync_file "single.php" "$THEME_DIR/single.php"
sync_file "header.php" "$THEME_DIR/header.php"
sync_file "footer.php" "$THEME_DIR/footer.php"
sync_file "index.php" "$THEME_DIR/index.php"
sync_file "archive.php" "$THEME_DIR/archive.php"
sync_file "search.php" "$THEME_DIR/search.php"
sync_file "style.css" "$THEME_DIR/style.css"
sync_file "critical-desktop.css" "$THEME_DIR/critical-desktop.css"
sync_file "critical-mobile.css" "$THEME_DIR/critical-mobile.css"
sync_file ".htaccess" "/var/www/html/.htaccess"

# НОВОЕ: Рекурсивное копирование папок оптимизации и ассетов
if [ -d "inc" ]; then
    docker cp inc/ comandos-wp:"$THEME_DIR/" && echo -e "${GREEN}Синхронизирована папка: inc/${NC}"
fi
if [ -d "assets" ]; then
    docker cp assets/ comandos-wp:"$THEME_DIR/" && echo -e "${GREEN}Синхронизирована папка: assets/${NC}"
fi
if [ -d "template-parts" ]; then
    docker cp template-parts/ comandos-wp:"$THEME_DIR/" && echo -e "${GREEN}Синхронизирована папка: template-parts/${NC}"
fi
if [ -d "js" ]; then
    docker cp js/ comandos-wp:"$THEME_DIR/" && echo -e "${GREEN}Синхронизирована папка: js/${NC}"
fi

# Установка прав
docker exec comandos-wp chown -R www-data:www-data "$THEME_DIR"

# ИНТЕРАКТИВНАЯ АКТИВАЦИЯ ТЕМЫ И ПЛАГИНОВ
if [ "$MODE" == "INSTALL" ]; then
    echo -e "\n${BLUE}==============================================${NC}"
    echo -e "${YELLOW}ШАГ 1:${NC} Перейдите по ссылке: ${GREEN}https://$WP_DOMAIN/wp-admin/install.php${NC}"
    echo -e "${YELLOW}ШАГ 2:${NC} Завершите установку WordPress (создайте админа)."
    echo -e "${YELLOW}ШАГ 3:${NC} Вернитесь сюда и нажмите ${BLUE}[ENTER]${NC} для активации темы и плагинов."
    echo -e "${BLUE}==============================================${NC}"
    ask_user "Нажмите [ENTER] после завершения установки в браузере..." dummy

    ensure_wp_cli

    print_info "Активация темы..."
    if ! docker exec comandos-wp bash -c "wp theme activate $THEME_NAME --allow-root"; then
        print_warning "WP-CLI не смог активировать тему. Пробую через SQL..."
        DB_PASS_SQL="${DB_PASSWORD:-$(grep DB_PASSWORD .env | cut -d= -f2)}"
        docker exec comandos-db mysql -uwordpress -p"$DB_PASS_SQL" wordpress -e \
        "UPDATE wp_options SET option_value = '$THEME_NAME' WHERE option_name IN ('template', 'stylesheet');"
    fi

    print_info "Установка и активация плагинов..."
    docker exec comandos-wp bash -c "wp plugin install wordpress-seo wp-graphql indexnow --activate --allow-root" || true
    docker exec comandos-wp bash -c "wp plugin install https://github.com/ashhitch/wp-graphql-yoast-seo/archive/refs/tags/v5.0.0.zip --activate --allow-root" || true

    print_info "Очистка дефолтного контента (пустой сайт)..."
    docker exec comandos-wp bash -c 'IDS=$(wp post list --post_type=post,page --format=ids --allow-root); if [ -n "$IDS" ]; then wp post delete $IDS --force --allow-root; fi'
    docker exec comandos-wp bash -c 'CIDS=$(wp comment list --format=ids --allow-root); if [ -n "$CIDS" ]; then wp comment delete $CIDS --force --allow-root; fi'
    docker exec comandos-wp bash -c 'wp plugin delete akismet hello --allow-root >/dev/null 2>&1 || true'

    print_info "Удаление стандартных тем WordPress..."
    docker exec comandos-wp bash -c "wp theme list --field=name --allow-root | grep -v \"^${THEME_NAME}$\" | xargs -r wp theme delete --allow-root" || true
fi
fi

# 11. Финализация
echo -e "\n"
print_header "СИСТЕМА ГОТОВА И ПЕРЕНЕСЕНА!"
print_info "WordPress: https://$WP_DOMAIN/"
if [ "$RESTORE_SNAPSHOT" == "true" ]; then
print_info "Режим:     Полный клон (snapshot)"
else
print_info "Тема:      Comandos AI Blog (Premium v2.5.1)"
fi
print_info "Админка:   https://$WP_DOMAIN/wp-admin"
print_warning "Совет: Если дизайн не обновился, сбросьте кэш (Ctrl+F5 или Cmd+Shift+R на Mac)"
echo -e "${BLUE}================================================${NC}"
