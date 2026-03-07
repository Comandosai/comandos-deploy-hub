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
N8N_IMAGE="n8nio/n8n:latest"
POSTGRES_VERSION="pg16"
POSTGRES_IMAGE="pgvector/pgvector"
REDIS_VERSION="7.2-alpine"
TRAEFIK_VERSION="v3.1"

# Флаги состояний
ENABLE_AUTO_UPDATE=false
IS_UPGRADE=false
ENABLE_WEEKLY_NODES_UPDATE=false
NPM_AUTHOR="comandos_ai"

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
    if ! command -v jq &> /dev/null; then
        print_info "Установка jq..."
        apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq > /dev/null
    fi
    if ! command -v curl &> /dev/null; then
        print_info "Установка curl..."
        apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl > /dev/null
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
        
        # Пытаемся определить сеть.
        # Предпочитаем comandos-network как общую межсервисную сеть в экосистеме.
        local detected_networks detected_net
        detected_networks=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range $net, $conf := .NetworkSettings.Networks}}{{println $net}}{{end}}' \
            | grep -E '^[^[:space:]]+$' \
            | grep -v '^bridge$' || true)
        if echo "$detected_networks" | grep -qx "comandos-network"; then
            detected_net="comandos-network"
        else
            detected_net=$(echo "$detected_networks" | head -n1)
        fi
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

ensure_traefik_network() {
    print_header "Проверка Docker-сети"
    if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
        print_info "Создаю сеть $TRAEFIK_NETWORK..."
        docker network create "$TRAEFIK_NETWORK" >/dev/null
        print_success "Сеть $TRAEFIK_NETWORK создана"
    else
        print_success "Сеть $TRAEFIK_NETWORK уже существует"
    fi
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
        
        # Проверка версии: если нет переменных v2, считаем что это v1
        if ! grep -q "N8N_RUNNERS_MODE" "$PROJECT_DIR/.env" 2>/dev/null; then
            print_warning "Обнаружена старая версия n8n v1."
            smart_read "Желаете обновить её до v2 со всеми исправлениями? (Y/n): " upgrade_confirm
            if [[ ! $upgrade_confirm =~ ^[Nn]$ ]]; then
                IS_UPGRADE=true
                print_info "Режим обновления активирован."
            fi
        fi

        if [ "$IS_UPGRADE" = false ]; then
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

    print_header "Дополнительные опции"
    smart_read "Включить ежемесячное автообновление n8n? (y/N): " auto_upd
    if [[ $auto_upd =~ ^[Yy]$ ]]; then
        ENABLE_AUTO_UPDATE=true
        print_success "Автообновление будет настроено."
    fi

    smart_read "Включить еженедельную синхронизацию community-нод из npm-профиля $NPM_AUTHOR? (y/N): " nodes_upd
    if [[ $nodes_upd =~ ^[Yy]$ ]]; then
        ENABLE_WEEKLY_NODES_UPDATE=true
        print_success "Еженедельная синхронизация community-нод будет настроена."
    fi
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
N8N_RUNNERS_MODE=internal
N8N_TASK_BROKER_HOST=0.0.0.0
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_WORKERS_CONCURRENCY=3
N8N_PUBLIC_API_DISABLED=false
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
    image: $POSTGRES_IMAGE:$POSTGRES_VERSION
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
      - N8N_RUNNERS_MODE=\${N8N_RUNNERS_MODE}
      - N8N_TASK_BROKER_HOST=\${N8N_TASK_BROKER_HOST}
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=\${N8N_BLOCK_ENV_ACCESS_IN_NODE}
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
    command: worker --concurrency=\${N8N_WORKERS_CONCURRENCY}
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
      - $TRAEFIK_NETWORK

networks:
  $TRAEFIK_NETWORK:
    external: true

volumes:
  traefik_data:
EOF


    cd "$ORIGINAL_DIR"
}

setup_auto_update() {
    if [ "$ENABLE_AUTO_UPDATE" = "false" ]; then return; fi
    
    print_header "Настройка автообновления"
    local service_path="/etc/systemd/system/n8n-dev-update.service"
    local timer_path="/etc/systemd/system/n8n-dev-update.timer"
    local project_abs_path=$(realpath "$PROJECT_DIR")

    cat > "$service_path" << EOF
[Unit]
Description=n8n Auto Update Service
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=$project_abs_path
ExecStart=/usr/bin/docker compose pull
ExecStart=/usr/bin/docker compose up -d
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

    cat > "$timer_path" << EOF
[Unit]
Description=Run n8n Auto Update monthly

[Timer]
OnCalendar=*-*-01 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable --now n8n-dev-update.timer
    print_success "Ежемесячное автообновление (1-е число, 04:00) настроено."
}

get_n8n_internal_base_url() {
    local container_id
    local container_ip
    container_id=$(docker compose ps -q n8n 2>/dev/null || true)
    if [ -z "$container_id" ]; then
        return 1
    fi

    container_ip=$(docker inspect "$container_id" --format '{{range .NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' \
        | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' \
        | head -n1 || true)

    if [ -z "$container_ip" ]; then
        return 1
    fi

    echo "http://$container_ip:5678"
}

wait_for_n8n_api() {
    local base_url="$1"
    local max_retries=90
    local i=1

    while [ "$i" -le "$max_retries" ]; do
        if curl -fsS --max-time 5 "$base_url/rest/settings" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        i=$((i + 1))
    done

    return 1
}

get_public_api_key() {
    local base_url="$1"
    local cookie_file="$2"
    local key_response
    local expires_at

    expires_at=$(($(date +%s) + 86400))
    key_response=$(curl -fsS -b "$cookie_file" -H "Content-Type: application/json" \
        -X POST "$base_url/rest/api-keys" \
        --data "{\"label\":\"bootstrap-credentials\",\"expiresAt\":$expires_at,\"scopes\":[\"credential:list\",\"credential:create\",\"credential:update\",\"credential:delete\"]}" 2>/dev/null || true)

    if [ -z "$key_response" ]; then
        return 1
    fi

    echo "$key_response" | jq -r '.data.rawApiKey // empty'
}

ensure_credential() {
    local base_url="$1"
    local api_key="$2"
    local cred_name="$3"
    local cred_type="$4"
    local cred_data_json="$5"
    local list_json
    local credential_id

    list_json=$(curl -fsS -H "X-N8N-API-KEY: $api_key" "$base_url/api/v1/credentials?limit=250" 2>/dev/null || true)
    if [ -z "$list_json" ]; then
        print_warning "Не удалось получить список credentials через Public API."
        return 1
    fi

    credential_id=$(echo "$list_json" | jq -r --arg n "$cred_name" --arg t "$cred_type" '.data[]? | select(.name == $n and .type == $t) | .id' | head -n1)

    if [ -n "$credential_id" ]; then
        if curl -fsS -H "X-N8N-API-KEY: $api_key" -H "Content-Type: application/json" \
            -X PATCH "$base_url/api/v1/credentials/$credential_id" \
            --data "{\"name\":\"$cred_name\",\"type\":\"$cred_type\",\"data\":$cred_data_json,\"isPartialData\":false}" >/dev/null 2>&1; then
            print_success "Credential '$cred_name' обновлён."
            return 0
        fi
        print_warning "Не удалось обновить credential '$cred_name'."
        return 1
    fi

    if curl -fsS -H "X-N8N-API-KEY: $api_key" -H "Content-Type: application/json" \
        -X POST "$base_url/api/v1/credentials" \
        --data "{\"name\":\"$cred_name\",\"type\":\"$cred_type\",\"data\":$cred_data_json}" >/dev/null 2>&1; then
        print_success "Credential '$cred_name' создан."
        return 0
    fi

    print_warning "Не удалось создать credential '$cred_name'."
    return 1
}

install_community_nodes_from_file() {
    local base_url="$1"
    local cookie_file="$2"
    local custom_nodes_file="$ORIGINAL_DIR/custom/community-nodes.txt"
    local pkg
    local response_file
    local http_code
    local message

    if [ ! -f "$custom_nodes_file" ]; then
        return 0
    fi

    if ! grep -qE '^[[:space:]]*[^#[:space:]]' "$custom_nodes_file"; then
        return 0
    fi

    print_header "Установка community-нод"
    response_file=$(mktemp)

    while IFS= read -r pkg; do
        pkg=$(echo "$pkg" | xargs)
        if [ -z "$pkg" ] || [[ "$pkg" =~ ^# ]]; then
            continue
        fi

        http_code=$(curl -sS -o "$response_file" -w "%{http_code}" -b "$cookie_file" \
            -H "Content-Type: application/json" \
            -X POST "$base_url/rest/community-packages" \
            --data "{\"name\":\"$pkg\",\"verify\":false}" || true)

        if [ "$http_code" = "200" ]; then
            print_success "Пакет '$pkg' установлен."
            continue
        fi

        message=$(jq -r '.message // empty' "$response_file" 2>/dev/null || true)
        if [[ "$message" == *"already installed"* ]]; then
            print_info "Пакет '$pkg' уже установлен."
        else
            print_warning "Не удалось установить '$pkg' (HTTP $http_code). ${message:-Проверьте логи n8n.}"
        fi
    done < "$custom_nodes_file"

    rm -f "$response_file"
}

ensure_vector_storage() {
    print_header "Инициализация pgvector"

    local max_attempts=20
    local attempt=1

    while [ "$attempt" -le "$max_attempts" ]; do
        if docker compose exec -T postgres psql -U n8n -d n8n -c "SELECT 1;" >/dev/null 2>&1; then
            break
        fi
        if [ "$attempt" -eq "$max_attempts" ]; then
            print_warning "PostgreSQL не готов для миграции pgvector. Пропускаю шаг."
            return 0
        fi
        sleep 3
        attempt=$((attempt + 1))
    done

    if docker compose exec -T postgres psql -U n8n -d n8n <<'SQL' >/dev/null 2>&1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.comandos_embeddings (
  id BIGSERIAL PRIMARY KEY,
  source TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comandos_embeddings_created_at_idx
  ON public.comandos_embeddings (created_at);
SQL
    then
        print_success "pgvector и таблица comandos_embeddings готовы."
    else
        print_warning "Не удалось применить миграцию pgvector автоматически."
    fi
}

post_deploy_bootstrap() {
    print_header "Пост-настройка n8n"

    if [ -z "${ADMIN_PASSWORD:-}" ]; then
        print_warning "Пароль администратора не задан. Пропускаю автосоздание credentials и установку community-нод."
        return 0
    fi

    local base_url
    local settings_json
    local show_setup
    local cookie_file
    local api_key
    local pg_data_json
    local redis_data_json
    local auth_file

    base_url=$(get_n8n_internal_base_url || true)
    if [ -z "$base_url" ]; then
        print_warning "Не удалось определить внутренний адрес n8n. Пропускаю пост-настройку."
        return 0
    fi

    if ! wait_for_n8n_api "$base_url"; then
        print_warning "API n8n недоступен после запуска. Пропускаю пост-настройку."
        return 0
    fi

    settings_json=$(curl -fsS "$base_url/rest/settings" 2>/dev/null || true)
    if [ -z "$settings_json" ]; then
        print_warning "Не удалось получить настройки n8n. Пропускаю пост-настройку."
        return 0
    fi

    show_setup=$(echo "$settings_json" | jq -r '.data.userManagement.showSetupOnFirstLoad // false')
    cookie_file=$(mktemp)

    if [ "$show_setup" = "true" ]; then
        if ! curl -fsS -c "$cookie_file" -H "Content-Type: application/json" \
            -X POST "$base_url/rest/owner/setup" \
            --data "{\"email\":\"$SSL_EMAIL\",\"firstName\":\"Admin\",\"lastName\":\"User\",\"password\":\"$ADMIN_PASSWORD\"}" >/dev/null 2>&1; then
            print_warning "Не удалось завершить owner setup автоматически. Пропускаю пост-настройку."
            rm -f "$cookie_file"
            return 0
        fi
        print_success "Owner setup выполнен автоматически."
    else
        if ! curl -fsS -c "$cookie_file" -H "Content-Type: application/json" \
            -X POST "$base_url/rest/login" \
            --data "{\"emailOrLdapLoginId\":\"$SSL_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" >/dev/null 2>&1; then
            print_warning "Не удалось выполнить логин в n8n (email/пароль). Пропускаю пост-настройку."
            rm -f "$cookie_file"
            return 0
        fi
        print_success "Успешный логин в n8n API."
    fi

    auth_file="$PROJECT_DIR/.bootstrap.env"
    cat > "$auth_file" << EOF
BOOTSTRAP_EMAIL=$SSL_EMAIL
BOOTSTRAP_PASSWORD=$ADMIN_PASSWORD
NPM_AUTHOR=$NPM_AUTHOR
EOF
    chmod 600 "$auth_file"
    print_info "Файл bootstrap-доступа сохранён: $auth_file"

    api_key=$(get_public_api_key "$base_url" "$cookie_file" || true)
    if [ -z "$api_key" ]; then
        print_warning "Не удалось получить Public API key. Пропускаю автосоздание credentials."
        install_community_nodes_from_file "$base_url" "$cookie_file"
        rm -f "$cookie_file"
        return 0
    fi

    pg_data_json=$(jq -cn --arg host "postgres" --arg database "n8n" --arg user "n8n" --arg password "$POSTGRES_PASSWORD" \
        '{host:$host,database:$database,user:$user,password:$password,maxConnections:100,allowUnauthorizedCerts:false,ssl:"disable",port:5432,sshTunnel:false,sshAuthenticateWith:"password",sshHost:"localhost",sshPort:22,sshUser:"root",sshPassword:"",privateKey:"",passphrase:""}')
    redis_data_json=$(jq -cn --arg host "redis" --arg password "$REDIS_PASSWORD" \
        '{password:$password,user:"",host:$host,port:6379,database:0,ssl:false,disableTlsVerification:false}')

    ensure_credential "$base_url" "$api_key" "Postgres Internal" "postgres" "$pg_data_json" || true
    ensure_credential "$base_url" "$api_key" "Redis Internal" "redis" "$redis_data_json" || true

    install_community_nodes_from_file "$base_url" "$cookie_file"
    rm -f "$cookie_file"
}

run_nodes_sync_once() {
    local project_abs_path
    local sync_script

    project_abs_path=$(realpath "$PROJECT_DIR")
    sync_script="/usr/local/bin/n8n-community-sync-$USER.sh"
    if [ ! -x "$sync_script" ]; then
        print_warning "Скрипт синхронизации не найден. Сначала настройте weekly sync."
        return 1
    fi

    print_header "Ручной запуск синхронизации community-нод"
    if "$sync_script" "$project_abs_path"; then
        print_success "Синхронизация завершена."
    else
        print_warning "Синхронизация завершилась с ошибкой. Проверьте лог: /var/log/n8n-community-sync.log"
        return 1
    fi
}

setup_weekly_nodes_update() {
    if [ "$ENABLE_WEEKLY_NODES_UPDATE" = "false" ]; then return; fi

    print_header "Настройка weekly sync community-нод"
    local service_path="/etc/systemd/system/n8n-community-sync.service"
    local timer_path="/etc/systemd/system/n8n-community-sync.timer"
    local script_path="/usr/local/bin/n8n-community-sync-$USER.sh"
    local project_abs_path
    project_abs_path=$(realpath "$PROJECT_DIR")

    cat > "$script_path" << 'EOF'
#!/bin/bash
set -euo pipefail

PROJECT_DIR="${1:-}"
if [ -z "$PROJECT_DIR" ]; then
  echo "Usage: $0 <project_dir>"
  exit 1
fi

cd "$PROJECT_DIR"
if [ ! -f ".bootstrap.env" ]; then
  echo "Missing $PROJECT_DIR/.bootstrap.env"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

set -a
. ".bootstrap.env"
set +a

if [ -z "${BOOTSTRAP_EMAIL:-}" ] || [ -z "${BOOTSTRAP_PASSWORD:-}" ]; then
  echo "BOOTSTRAP_EMAIL/BOOTSTRAP_PASSWORD are required in .bootstrap.env"
  exit 1
fi

NPM_AUTHOR="${NPM_AUTHOR:-comandos_ai}"

container_id=$(docker compose ps -q n8n 2>/dev/null || true)
if [ -z "$container_id" ]; then
  echo "n8n container is not running"
  exit 1
fi

container_ip=$(docker inspect "$container_id" --format '{{range .NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' \
  | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' \
  | head -n1 || true)
if [ -z "$container_ip" ]; then
  echo "Failed to resolve n8n container IP"
  exit 1
fi
base_url="http://$container_ip:5678"

for i in {1..60}; do
  if curl -fsS "$base_url/rest/settings" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

cookie_file=$(mktemp)
trap 'rm -f "${cookie_file:-}" "${resp_file:-}" "${packages_file:-}"' EXIT

curl -fsS -c "$cookie_file" -H "Content-Type: application/json" \
  -X POST "$base_url/rest/login" \
  --data "{\"emailOrLdapLoginId\":\"$BOOTSTRAP_EMAIL\",\"password\":\"$BOOTSTRAP_PASSWORD\"}" >/dev/null

resp_file=$(mktemp)
packages_file=$(mktemp)

from=0
size=250
while true; do
  payload=$(curl -fsS "https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_AUTHOR}&size=${size}&from=${from}")
  echo "$payload" | jq -r '.objects[].package.name' | grep -E '^n8n-nodes-' || true >> "$packages_file"
  count=$(echo "$payload" | jq '.objects | length')
  if [ "$count" -lt "$size" ]; then
    break
  fi
  from=$((from + size))
done

sort -u "$packages_file" -o "$packages_file"
echo "Found $(wc -l < "$packages_file") packages for $NPM_AUTHOR"

while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue
  install_code=$(curl -sS -o "$resp_file" -w "%{http_code}" -b "$cookie_file" \
    -H "Content-Type: application/json" \
    -X POST "$base_url/rest/community-packages" \
    --data "{\"name\":\"$pkg\",\"verify\":false}" || true)

  if [ "$install_code" = "200" ]; then
    echo "[install] $pkg"
    continue
  fi

  msg=$(jq -r '.message // empty' "$resp_file" 2>/dev/null || true)
  if [[ "$msg" == *"already installed"* ]]; then
    update_code=$(curl -sS -o "$resp_file" -w "%{http_code}" -b "$cookie_file" \
      -H "Content-Type: application/json" \
      -X PATCH "$base_url/rest/community-packages" \
      --data "{\"name\":\"$pkg\"}" || true)
    if [ "$update_code" = "200" ]; then
      echo "[update] $pkg"
    else
      update_msg=$(jq -r '.message // empty' "$resp_file" 2>/dev/null || true)
      echo "[warn] $pkg update failed (HTTP $update_code): ${update_msg:-unknown}"
    fi
  else
    echo "[warn] $pkg install failed (HTTP $install_code): ${msg:-unknown}"
  fi
done < "$packages_file"
EOF
    chmod +x "$script_path"

    cat > "$service_path" << EOF
[Unit]
Description=n8n Community Nodes Weekly Sync
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=$project_abs_path
ExecStart=$script_path $project_abs_path
StandardOutput=append:/var/log/n8n-community-sync.log
StandardError=append:/var/log/n8n-community-sync.log
EOF

    cat > "$timer_path" << EOF
[Unit]
Description=Run n8n community nodes sync weekly

[Timer]
OnCalendar=Sun *-*-* 05:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable --now n8n-community-sync.timer
    print_success "Еженедельная синхронизация community-нод (воскресенье, 05:00) настроена."
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

    ensure_vector_storage
    post_deploy_bootstrap
    
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
    ensure_traefik_network
    gather_user_input
    create_config_files
    setup_auto_update
    start_services
    setup_weekly_nodes_update
}

case "${1:-}" in
    --stop) cd "$PROJECT_DIR" && docker compose down ;;
    --logs) cd "$PROJECT_DIR" && docker compose logs -f ;;
    --sync-nodes) run_nodes_sync_once ;;
    *) main ;;
esac
