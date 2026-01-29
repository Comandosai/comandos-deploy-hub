#!/bin/bash

# ==============================================================================
# n8n PRO Installer by COMANDOS AI
# Оптимизировано для Ubuntu/Debian. PostgreSQL + Redis + Python + Fonts.
# ==============================================================================

set -euo pipefail

# Цвета вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Глобальные переменные
PROJECT_DIR="n8n-docker-pro"
DOMAIN=""
SSL_EMAIL=""
ADMIN_PASSWORD=""
ENCRYPTION_KEY=""
REDIS_PASSWORD=""
POSTGRES_PASSWORD=""
ORIGINAL_DIR=""
EXTERNAL_IP=""

# Версии ПО
N8N_VERSION="1.76.1"
POSTGRES_VERSION="16-alpine"
REDIS_VERSION="7.2-alpine"
TRAEFIK_VERSION="v3.1"

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
    echo -e "${BLUE}================================"
    echo -e "$1"
    echo -e "================================${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Функция для корректного чтения ввода при использовании curl | bash
smart_read() {
    local prompt=$1
    local var_name=$2
    local secret=${3:-false}
    
    if [ "$secret" = "true" ]; then
        read -rsp "$prompt" value < /dev/tty
        echo
    else
        read -rp "$prompt" value < /dev/tty
    fi
    eval "$var_name=\"\$value\""
}

check_dependencies() {
    print_header "Проверка зависимостей"
    if ! command -v lsof &> /dev/null; then
        print_info "Установка lsof..."
        apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq lsof > /dev/null
    fi
    print_success "Зависимости проверены"
}

check_system_requirements() {
    print_header "Проверка системы"
    # Метрика в МБ для точности
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 1800 ]; then
        print_error "Меньше 2 ГБ ОЗУ ($TOTAL_RAM МБ). Установка прервана."
        exit 1
    fi
    print_success "ОЗУ: $TOTAL_RAM МБ - OK"
}

check_ubuntu_version() {
    print_header "Проверка ОС"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case $VERSION_ID in
            "20.04"|"22.04"|"24.04")
                print_success "Ubuntu $VERSION_ID LTS - Поддерживается"
                ;;
            *)
                print_warning "Версия Ubuntu $VERSION_ID официально не тестировалась, но попробуем..."
                ;;
        esac
    fi
}

check_ports() {
    print_header "Проверка портов"
    local conflict=false
    for port in 80 443; do
        if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null ; then
            print_error "Порт $port занят. Освободите его (возможно, работает nginx)."
            conflict=true
        fi
    done
    if [ "$conflict" = true ]; then exit 1; fi
    print_success "Порты 80, 443 свободны"
}

install_docker() {
    print_header "Подготовка Docker"
    if ! command -v docker &> /dev/null; then
        print_info "Установка Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable --now docker
    fi
    print_success "Docker готов"
}

check_dns_and_ip() {
    EXTERNAL_IP=$(curl -s --max-time 10 https://ifconfig.me || echo "")
    print_info "Проверка домена $DOMAIN..."
    local resolved_ip
    resolved_ip=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1)
    
    if [ -z "$resolved_ip" ]; then
        print_error "Домен $DOMAIN не направлен на этот сервер."
        print_warning "Создайте A-запись для домена, указывающую на IP: $EXTERNAL_IP"
        smart_read "Нажмите Enter, когда создадите запись (или Ctrl+C для отмены)... " dummy
    fi
}

load_existing_config() {
    if [ -f "$PROJECT_DIR/.env" ]; then
        print_info "Загрузка существующих настроек из .env..."
        # Загружаем переменные корректно
        set -a
        [ -f "$PROJECT_DIR/.env" ] && . "$PROJECT_DIR/.env"
        set +a
        DOMAIN=${DOMAIN_NAME:-""}
        return 0
    fi
    return 1
}

gather_user_input() {
    print_header "Настройка n8n PRO"
    
    if load_existing_config && [ -n "$DOMAIN" ]; then
        print_warning "Текущий домен: $DOMAIN"
        smart_read "Изменить настройки проекта? (y/N): " change_cfg
        if [[ ! $change_cfg =~ ^[Yy]$ ]]; then return 0; fi
    fi

    DOMAIN=""
    while [[ ! $DOMAIN =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
        smart_read "Введите домен для n8n (например: n8n.bash.ru): " DOMAIN
    done

    check_dns_and_ip

    SSL_EMAIL=""
    while [[ ! $SSL_EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
        smart_read "Введите Email для SSL-сертификата: " SSL_EMAIL
    done

    ADMIN_PASSWORD=""
    while [ -z "$ADMIN_PASSWORD" ]; do
        smart_read "Придумайте пароль для входа в n8n: " ADMIN_PASSWORD true
    done
    
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
}

create_config_files() {
    print_header "Создание файлов конфигурации"
    mkdir -p "$PROJECT_DIR/n8n_data" "$PROJECT_DIR/postgres_data" "$PROJECT_DIR/redis_data" "$PROJECT_DIR/output"
    chown -R 1000:1000 "$PROJECT_DIR/n8n_data" "$PROJECT_DIR/output"
    
    cd "$PROJECT_DIR"
    
    local system_ram_mb=$(free -m | awk '/^Mem:/{print $2}')
    local n8n_mem_limit=$((system_ram_mb / 2))
    local n8n_old_space=$((n8n_mem_limit * 80 / 100))

    if [ ! -f .env ] || [[ ${change_cfg:-"n"} =~ ^[Yy]$ ]]; then
        cat > .env << EOF
DOMAIN_NAME=$DOMAIN
SSL_EMAIL=$SSL_EMAIL
GENERIC_TIMEZONE=Europe/Moscow
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY:-$ENCRYPTION_KEY}
N8N_USER_MANAGEMENT_JWT_SECRET=${N8N_USER_MANAGEMENT_JWT_SECRET:-$(openssl rand -hex 32)}
REDIS_PASSWORD=${REDIS_PASSWORD:-$REDIS_PASSWORD}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$POSTGRES_PASSWORD}
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-$POSTGRES_PASSWORD}
NODE_OPTIONS=--max-old-space-size=$n8n_old_space
EOF
    fi

    cat > docker-compose.yml << EOF
version: '3.8'
services:
  traefik:
    image: traefik:$TRAEFIK_VERSION
    restart: always
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.mytlschallenge.acme.tlschallenge=true"
      - "--certificatesresolvers.mytlschallenge.acme.email=\${SSL_EMAIL}"
      - "--certificatesresolvers.mytlschallenge.acme.storage=/letsencrypt/acme.json"
    ports: ["80:80", "443:443"]
    volumes:
      - traefik_data:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro

  postgres:
    image: postgres:$POSTGRES_VERSION
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes: ["./postgres_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U n8n"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:$REDIS_VERSION
    restart: always
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes: ["./redis_data:/data"]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  n8n:
    build: .
    restart: always
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(\`\${DOMAIN_NAME}\`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=mytlschallenge"
    environment:
      - N8N_HOST=\${DOMAIN_NAME}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://\${DOMAIN_NAME}/
      - GENERIC_TIMEZONE=\${GENERIC_TIMEZONE}
      - N8N_ENCRYPTION_KEY=\${N8N_ENCRYPTION_KEY}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=\${POSTGRES_PASSWORD}
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PASSWORD=\${REDIS_PASSWORD}
      - EXECUTIONS_MODE=queue
      - NODE_OPTIONS=\${NODE_OPTIONS}
      - N8N_RUNNERS_ENABLED=true
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./output:/data/output

  n8n-worker:
    build: .
    command: worker
    restart: always
    depends_on: [n8n]
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=\${POSTGRES_PASSWORD}
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PASSWORD=\${REDIS_PASSWORD}
      - EXECUTIONS_MODE=queue
      - NODE_OPTIONS=\${NODE_OPTIONS}
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./output:/data/output

volumes:
  traefik_data:
EOF

    cat > Dockerfile << EOF
FROM n8nio/n8n:$N8N_VERSION
USER root
RUN apk add --no-cache python3 py3-pip make g++ build-base cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev font-noto font-noto-cjk font-noto-emoji terminus-font ttf-dejavu ttf-freefont ttf-font-awesome ttf-liberation
RUN ln -sf python3 /usr/bin/python
USER node
EOF

    cd "$ORIGINAL_DIR"
}

start_services() {
    print_header "Запуск сервисов"
    cd "$PROJECT_DIR"
    print_info "Сборка образа и запуск (это может занять 1-3 минуты)..."
    docker compose up -d --build
    print_success "Система запущена!"
    print_info "Доступ: https://$DOMAIN"
    print_info "Логин: $SSL_EMAIL"
}

main() {
    if [ "$EUID" -ne 0 ]; then print_error "Нужен sudo! Запустите: sudo bash <(curl ...)"; exit 1; fi
    
    print_logo
    ORIGINAL_DIR=$(pwd)
    
    check_dependencies
    check_ubuntu_version
    check_system_requirements
    check_ports
    install_docker
    gather_user_input
    create_config_files
    start_services
    
    print_header "Установка завершена успешно"
}

case "${1:-}" in
    --stop) cd "$PROJECT_DIR" && docker compose down ;;
    --logs) cd "$PROJECT_DIR" && docker compose logs -f ;;
    *) main ;;
esac
