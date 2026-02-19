#!/bin/bash

# ==============================================================================
# n8n Installer by COMANDOS AI
# PostgreSQL + Redis + Worker. Стандартная установка.
# ==============================================================================

set -euo pipefail

# Цвета вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Глобальные переменные
PROJECT_DIR="n8n"
DOMAIN=""
SSL_EMAIL=""
ADMIN_PASSWORD=""
ENCRYPTION_KEY=""
REDIS_PASSWORD=""
POSTGRES_PASSWORD=""
ORIGINAL_DIR=""
EXTERNAL_IP=""
TRAEFIK_CONTAINER=""
TRAEFIK_DYNAMIC_DIR=""
TRAEFIK_NETWORK="comandos-network"
TRAEFIK_RESOLVER="mytlschallenge"
EXISTING_TRAEFIK=false

# Версии ПО
N8N_IMAGE="docker.n8n.io/n8nio/n8n:1.123.5"
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
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 1800 ]; then
        print_error "Меньше 2 ГБ ОЗУ ($TOTAL_RAM МБ). Установка прервана."
        exit 1
    fi
    print_success "ОЗУ: $TOTAL_RAM МБ - OK"
}

check_ports() {
    print_header "Проверка портов и Traefik"
    
    # Ищем существующий Traefik
    TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "traefik" | head -n1 || echo "")
    
    if [ -n "$TRAEFIK_CONTAINER" ]; then
        print_success "Обнаружен работающий Traefik: $TRAEFIK_CONTAINER"
        EXISTING_TRAEFIK=true
        
        # Пытаемся определить динамическую директорию
        TRAEFIK_DYNAMIC_DIR=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range .Mounts}}{{printf "%s|%s\n" .Destination .Source}}{{end}}' | awk -F'|' '$1 ~ /dynamic/ {print $2; exit}')
        
        # Fallback: ищем через команду Traefik
        if [ -z "$TRAEFIK_DYNAMIC_DIR" ]; then
            TRAEFIK_DYNAMIC_DIR=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{json .Config.Cmd}}' | tr -d '[]",\n' | grep -oP '(?<=providers\.file\.directory=)[^ ]+' | head -n1)
            # Это путь внутри контейнера, найдем хостовый путь
            if [ -n "$TRAEFIK_DYNAMIC_DIR" ]; then
                local host_path=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "'"$TRAEFIK_DYNAMIC_DIR"'"}}{{.Source}}{{end}}{{end}}')
                if [ -n "$host_path" ]; then
                    TRAEFIK_DYNAMIC_DIR="$host_path"
                fi
            fi
        fi
        
        # Fallback 2: известные пути в экосистеме Comandos
        if [ -z "$TRAEFIK_DYNAMIC_DIR" ] || [ ! -d "$TRAEFIK_DYNAMIC_DIR" ]; then
            for known_dir in "$HOME/comandos/traefik/dynamic" "$HOME/traefik/dynamic" "/root/comandos/traefik/dynamic"; do
                if [ -d "$known_dir" ]; then
                    TRAEFIK_DYNAMIC_DIR="$known_dir"
                    break
                fi
            done
        fi
        
        # Пытаемся определить сеть
        local detected_net=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}' | tr ' ' '\n' | grep -v '^bridge$' | head -n1)
        if [ -n "$detected_net" ]; then TRAEFIK_NETWORK="$detected_net"; fi
        
        # Пытаемся определить резолвер
        local detected_resolver=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' | tr -d '[],"' | tr ' ' '\n' | grep -oE 'certificatesresolvers\.[^=. ]+' | head -n1 | sed 's/certificatesresolvers\.//')
        if [ -n "$detected_resolver" ]; then TRAEFIK_RESOLVER="$detected_resolver"; fi
        
        print_info "Параметры Traefik: Сеть=$TRAEFIK_NETWORK, Resolver=$TRAEFIK_RESOLVER, Dynamic=$TRAEFIK_DYNAMIC_DIR"
    fi

    local conflict=false
    for port in 80 443; do
        if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null ; then
            if [ "$EXISTING_TRAEFIK" = true ]; then
                print_info "Порт $port занят (нормально для существующего Traefik)."
            else
                print_error "Порт $port занят. Освободите его (возможно, работает nginx)."
                conflict=true
            fi
        fi
    done
    if [ "$conflict" = true ]; then exit 1; fi
    if [ "$EXISTING_TRAEFIK" = false ]; then
        print_success "Порты 80, 443 свободны"
    fi
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
        set -a
        [ -f "$PROJECT_DIR/.env" ] && . "$PROJECT_DIR/.env"
        set +a
        DOMAIN=${DOMAIN_NAME:-""}
        return 0
    fi
    return 1
}

gather_user_input() {
    print_header "Настройка n8n"
    
    if load_existing_config && [ -n "$DOMAIN" ]; then
        print_info "Обнаружена существующая установка n8n."
        print_warning "Текущий домен: $DOMAIN"
        smart_read "Хотите использовать старые настройки (домен, email, пароли)? (Y/n): " use_old
        if [[ $use_old =~ ^[Nn]$ ]]; then 
            DOMAIN=""
            SSL_EMAIL=""
            ADMIN_PASSWORD=""
        else
            return 0 
        fi
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

    while true; do
        smart_read "Придумайте пароль администратора n8n (мин. 8 символов, цифра, заглавная буква): " ADMIN_PASSWORD true
        if [[ ${#ADMIN_PASSWORD} -ge 8 && "$ADMIN_PASSWORD" =~ [0-9] && "$ADMIN_PASSWORD" =~ [A-Z] ]]; then
            break
        else
            print_error "Пароль слишком простой! Требования: минимум 8 символов, хотя бы одна цифра и одна заглавная буква (A-Z)."
        fi
    done

    # Вытаскиваем существующий ключ шифрования, если он есть
    if [ -f "$PROJECT_DIR/n8n_data/config" ]; then
        print_info "Обнаружен существующий конфиг n8n. Извлекаем ключ шифрования..."
        EXISTING_KEY=$(grep -oP '"encryptionKey":\s*"\K[^"]+' "$PROJECT_DIR/n8n_data/config" || echo "")
        if [ -n "$EXISTING_KEY" ]; then
            ENCRYPTION_KEY="$EXISTING_KEY"
            print_success "Ключ шифрования восстановлен."
        fi
    fi

    if [ -z "${ENCRYPTION_KEY:-}" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
    fi
    
    REDIS_PASSWORD=${REDIS_PASSWORD:-$(openssl rand -hex 16)}
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}
}

create_config_files() {
    print_header "Создание файлов конфигурации"
    mkdir -p "$PROJECT_DIR/n8n_data" "$PROJECT_DIR/postgres_data" "$PROJECT_DIR/redis_data" "$PROJECT_DIR/output"
    chown -R 1000:1000 "$PROJECT_DIR/n8n_data" "$PROJECT_DIR/output"
    
    cd "$PROJECT_DIR"
    
    local system_ram_mb=$(free -m | awk '/^Mem:/{print $2}')
    local n8n_mem_limit=$((system_ram_mb / 2))
    local n8n_old_space=$((n8n_mem_limit * 80 / 100))

    cat > .env << EOF
DOMAIN_NAME=$DOMAIN
SSL_EMAIL=$SSL_EMAIL
GENERIC_TIMEZONE=Europe/Moscow
N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY
N8N_USER_MANAGEMENT_JWT_SECRET=${N8N_USER_MANAGEMENT_JWT_SECRET:-$(openssl rand -hex 32)}
REDIS_PASSWORD=$REDIS_PASSWORD
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=$POSTGRES_PASSWORD
NODE_OPTIONS=--max-old-space-size=$n8n_old_space
EOF

    # Создание папки и конфига для модульного Traefik
    mkdir -p traefik_dynamic
    cat > traefik_dynamic/n8n.yml << EOF
http:
  routers:
    n8n-router:
      rule: "Host(\`$DOMAIN\`)"
      entryPoints: ["websecure"]
      service: "n8n-service"
      tls: { certResolver: "$TRAEFIK_RESOLVER" }
  services:
    n8n-service:
      loadBalancer:
        servers:
          - url: "http://n8n:5678"
EOF

    cat > docker-compose.yml << EOF
services:
EOF

    if [ "$EXISTING_TRAEFIK" = false ]; then
        cat >> docker-compose.yml << EOF
  traefik:
    image: traefik:$TRAEFIK_VERSION
    restart: always
    command:
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--providers.file.watch=true"
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
      - ./traefik_dynamic:/etc/traefik/dynamic:ro
    networks:
      - default
      - $TRAEFIK_NETWORK

EOF
    fi

    cat >> docker-compose.yml << EOF
  postgres:
    image: postgres:$POSTGRES_VERSION
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes: ["./postgres_data:/var/lib/postgresql/data"]
    networks:
      - default
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
    networks:
      - default
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  n8n:
    image: $N8N_IMAGE
    restart: always
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
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
      - N8N_RUNNERS_ENABLED=false
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./output:/data/output
    networks:
      - default
      - $TRAEFIK_NETWORK
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=$TRAEFIK_NETWORK"
      - "traefik.http.routers.n8n-router.rule=Host(\`$DOMAIN\`)"
      - "traefik.http.routers.n8n-router.entrypoints=websecure"
      - "traefik.http.routers.n8n-router.tls=true"
      - "traefik.http.routers.n8n-router.tls.certresolver=$TRAEFIK_RESOLVER"
      - "traefik.http.services.n8n-service.loadbalancer.server.port=5678"

  n8n-worker:
    image: $N8N_IMAGE
    command: worker
    restart: always
    depends_on: [n8n]
    environment:
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
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./output:/data/output
    networks:
      - default

networks:
  $TRAEFIK_NETWORK:
    external: true

volumes:
  traefik_data:
EOF


    cd "$ORIGINAL_DIR"
}

start_services() {
    print_header "Запуск сервисов"
    cd "$PROJECT_DIR"
    print_info "Загрузка образов и запуск..."
    
    # Тянем все образы
    docker compose pull
    
    # Запускаем
    docker compose up -d
    
    # Если Traefik был внешний, копируем конфиг ПОСЛЕ запуска
    if [ "$EXISTING_TRAEFIK" = true ]; then
        # Если динамическая папка так и не определена, последняя попытка
        if [ -z "$TRAEFIK_DYNAMIC_DIR" ] || [ ! -d "$TRAEFIK_DYNAMIC_DIR" ]; then
            print_warning "Не удалось найти динамическую папку Traefik автоматически."
            smart_read "Укажите путь к динамической папке Traefik (напр.: /root/comandos/traefik/dynamic): " TRAEFIK_DYNAMIC_DIR
        fi
        
        if [ -n "$TRAEFIK_DYNAMIC_DIR" ] && [ -d "$TRAEFIK_DYNAMIC_DIR" ]; then
            print_info "Копирование конфигурации n8n в $TRAEFIK_DYNAMIC_DIR..."
            cp traefik_dynamic/n8n.yml "$TRAEFIK_DYNAMIC_DIR/n8n.yml"
            print_success "Маршрут n8n добавлен в Traefik!"
        else
            print_error "Папка $TRAEFIK_DYNAMIC_DIR не найдена. Скопируйте файл вручную:"
            print_error "  cp $(pwd)/traefik_dynamic/n8n.yml <путь-к-динамической-папке>/n8n.yml"
        fi
    fi
    
    print_success "Система запущена!"
    print_info "Доступ: https://$DOMAIN"
}

main() {
    if [ "$EUID" -ne 0 ]; then print_error "Нужен sudo!"; exit 1; fi
    print_logo
    ORIGINAL_DIR=$(pwd)
    check_dependencies
    check_system_requirements
    check_ports
    install_docker
    gather_user_input
    create_config_files
    start_services
}

case "${1:-}" in
    --stop) cd "$PROJECT_DIR" && docker compose down ;;
    --logs) cd "$PROJECT_DIR" && docker compose logs -f ;;
    *) main ;;
esac
