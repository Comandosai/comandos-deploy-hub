#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/supabase-project"
SUPABASE_REPO="https://github.com/supabase/supabase.git"
SUPABASE_REF="master"
TRAEFIK_NETWORK="comandos-network"
TRAEFIK_RESOLVER="mytlschallenge"
TRAEFIK_DYNAMIC_DIR=""
EXISTING_TRAEFIK=false
TRAEFIK_CONTAINER=""

MODE="local"
DOMAIN=""
SSL_EMAIL=""
DASHBOARD_USERNAME="comandos"
SERVER_IP=""
EXTERNAL_URL=""
BACKUP_RETENTION_DAYS=14

ORIGINAL_DIR=""
COMPOSE_FILES=()

print_logo() {
  echo -e "${BLUE}"
  cat << 'BANNER'
 ██████╗ ██████╗ ███╗   ███╗ █████╗ ███╗   ██╗██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔═══██╗██╔════╝
██║     ██║   ██║██╔████╔██║███████║██╔██╗ ██║██║  ██║██║   ██║███████╗
██║     ██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██║   ██║╚════██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝╚██████╔╝███████║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚══════╝
BANNER
  echo -e "${NC}${YELLOW}              SUPABASE STACK INSTALLER BY COMANDOS${NC}"
  echo
}

print_header() { echo -e "${BLUE}================================\n$1\n================================${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

smart_read() {
  local prompt="$1"
  local var_name="$2"
  local default_value="${3:-}"
  local value=""

  if [ -n "$default_value" ]; then
    read -rp "$prompt [$default_value]: " value < /dev/tty || true
    value="${value:-$default_value}"
  else
    read -rp "$prompt" value < /dev/tty || true
  fi

  eval "$var_name=\"\$value\""
}

require_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "Нужен запуск от root/sudo"
    exit 1
  fi
}

check_dependencies() {
  print_header "Проверка зависимостей"
  local deps=(curl jq openssl git lsof)
  local missing=()
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" >/dev/null 2>&1; then
      missing+=("$dep")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    print_info "Устанавливаю: ${missing[*]}"
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${missing[@]}" >/dev/null
  fi

  print_success "Зависимости готовы"
}

install_docker() {
  print_header "Подготовка Docker"
  if ! command -v docker >/dev/null 2>&1; then
    print_info "Установка Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  fi
  print_success "Docker готов"
}

get_server_ip() {
  local ip=""
  ip=$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)
  if [[ ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ip=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)
  fi
  if [[ ! "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  fi
  echo "$ip"
}

check_ports_local_mode() {
  local conflict=false
  local ports=(8000 8443)
  for p in "${ports[@]}"; do
    if lsof -Pi ":$p" -sTCP:LISTEN -t >/dev/null 2>&1; then
      print_error "Порт $p уже занят. Освободите его или используйте домен+Traefik режим."
      conflict=true
    fi
  done
  if [ "$conflict" = true ]; then
    exit 1
  fi
}

detect_traefik() {
  TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i 'traefik' | head -n1 || true)
  if [ -n "$TRAEFIK_CONTAINER" ]; then
    EXISTING_TRAEFIK=true
    local detected_resolver
    detected_resolver=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' \
      | tr -d '[],"' | tr ' ' '\n' | grep -oE 'certificatesresolvers\.[^=. ]+' | head -n1 | sed 's/certificatesresolvers\.//' || true)
    if [ -n "$detected_resolver" ]; then
      TRAEFIK_RESOLVER="$detected_resolver"
    fi

    TRAEFIK_DYNAMIC_DIR=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range .Mounts}}{{printf "%s|%s\n" .Destination .Source}}{{end}}' \
      | awk -F'|' '$1 ~ /dynamic/ {print $2; exit}' || true)

    print_success "Обнаружен Traefik: $TRAEFIK_CONTAINER"
    print_info "Resolver: $TRAEFIK_RESOLVER"
  fi
}

ensure_traefik_network() {
  print_header "Проверка сети Docker"
  if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    docker network create "$TRAEFIK_NETWORK" >/dev/null
    print_success "Сеть $TRAEFIK_NETWORK создана"
  else
    print_success "Сеть $TRAEFIK_NETWORK уже существует"
  fi
}

load_existing_env() {
  if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    . "$PROJECT_DIR/.env"
    set +a
    DOMAIN="${DOMAIN:-${DOMAIN_NAME:-$DOMAIN}}"
    DASHBOARD_USERNAME="${DASHBOARD_USERNAME:-$DASHBOARD_USERNAME}"
    BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-$BACKUP_RETENTION_DAYS}"
  fi
}

gather_user_input() {
  print_header "Параметры установки Supabase"
  SERVER_IP=$(get_server_ip)

  smart_read "Введите домен (Enter = локальный режим): " DOMAIN "${DOMAIN:-}"
  DOMAIN="${DOMAIN:-}"

  if [ -n "$DOMAIN" ]; then
    MODE="public"
    while [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
      print_warning "Неверный формат домена"
      smart_read "Введите домен: " DOMAIN
    done

    while [[ ! "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
      smart_read "Введите email для SSL (Let's Encrypt): " SSL_EMAIL "${SSL_EMAIL:-}"
    done
  else
    MODE="local"
    SSL_EMAIL=""
  fi

  smart_read "Имя пользователя Dashboard" DASHBOARD_USERNAME "${DASHBOARD_USERNAME:-comandos}"
  smart_read "Срок хранения backup (дней)" BACKUP_RETENTION_DAYS "${BACKUP_RETENTION_DAYS:-14}"

  if [ -n "$SERVER_IP" ]; then
    local override_ip
    smart_read "IP сервера для финального вывода (Enter = авто)" override_ip "$SERVER_IP"
    SERVER_IP="$override_ip"
  fi

  if [ "$MODE" = "local" ]; then
    check_ports_local_mode
    EXTERNAL_URL="http://${SERVER_IP}:8000"
  else
    EXTERNAL_URL="https://${DOMAIN}"
  fi
}

fetch_official_stack() {
  print_header "Подготовка файлов Supabase"

  if [ -f "$PROJECT_DIR/docker-compose.yml" ] && [ -f "$PROJECT_DIR/.env" ]; then
    print_info "Существующая установка найдена в $PROJECT_DIR, использую её"
    return
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  git clone --depth 1 --branch "$SUPABASE_REF" "$SUPABASE_REPO" "$tmpdir/supabase" >/dev/null 2>&1

  mkdir -p "$PROJECT_DIR"
  cp -a "$tmpdir/supabase/docker/." "$PROJECT_DIR/"
  rm -rf "$tmpdir"

  print_success "Официальный Docker-стек Supabase загружен"
}

set_env_key() {
  local key="$1"
  local value="$2"
  local env_file="$PROJECT_DIR/.env"
  local escaped
  escaped=$(printf '%s' "$value" | sed 's/[&/]/\\&/g')

  if grep -qE "^${key}=" "$env_file"; then
    sed -i "s|^${key}=.*$|${key}=${escaped}|" "$env_file"
  else
    echo "${key}=${value}" >> "$env_file"
  fi
}

generate_secure_keys() {
  print_header "Генерация секретов"
  local key_output
  key_output=$(cd "$PROJECT_DIR" && sh ./utils/generate-keys.sh)

  while IFS='=' read -r key value; do
    [ -z "${key:-}" ] && continue
    case "$key" in
      JWT_SECRET|ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY_BASE|VAULT_ENC_KEY|PG_META_CRYPTO_KEY|LOGFLARE_PUBLIC_ACCESS_TOKEN|LOGFLARE_PRIVATE_ACCESS_TOKEN|S3_PROTOCOL_ACCESS_KEY_ID|S3_PROTOCOL_ACCESS_KEY_SECRET|MINIO_ROOT_PASSWORD|POSTGRES_PASSWORD|DASHBOARD_PASSWORD)
        set_env_key "$key" "$value"
      ;;
    esac
  done <<< "$key_output"

  print_success "Секреты сгенерированы"
}

configure_env() {
  print_header "Настройка .env"

  if [ ! -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  fi

  if grep -q '^POSTGRES_PASSWORD=your-super-secret' "$PROJECT_DIR/.env" || ! grep -q '^ANON_KEY=eyJ' "$PROJECT_DIR/.env"; then
    generate_secure_keys
  fi

  set_env_key "DASHBOARD_USERNAME" "$DASHBOARD_USERNAME"
  set_env_key "POOLER_TENANT_ID" "$(openssl rand -hex 8)"
  set_env_key "BACKUP_RETENTION_DAYS" "$BACKUP_RETENTION_DAYS"

  if [ "$MODE" = "local" ]; then
    set_env_key "SUPABASE_PUBLIC_URL" "http://${SERVER_IP}:8000"
    set_env_key "API_EXTERNAL_URL" "http://${SERVER_IP}:8000"
    set_env_key "SITE_URL" "http://${SERVER_IP}:8000"
    set_env_key "ADDITIONAL_REDIRECT_URLS" "http://localhost:3000,http://${SERVER_IP}:3000"
  else
    set_env_key "SUPABASE_PUBLIC_URL" "https://${DOMAIN}"
    set_env_key "API_EXTERNAL_URL" "https://${DOMAIN}"
    set_env_key "SITE_URL" "https://${DOMAIN}"
    set_env_key "ADDITIONAL_REDIRECT_URLS" "https://${DOMAIN},http://localhost:3000"
  fi

  set_env_key "SMTP_HOST" "supabase-mail"
  set_env_key "SMTP_PORT" "2500"
  set_env_key "SMTP_USER" "fake_mail_user"
  set_env_key "SMTP_PASS" "fake_mail_password"
  set_env_key "SMTP_ADMIN_EMAIL" "admin@localhost"
  set_env_key "SMTP_SENDER_NAME" "Comandos Supabase"

  print_success ".env настроен"
}

create_override_compose() {
  print_header "Создание override-конфига Comandos"
  local override="$PROJECT_DIR/docker-compose.comandos.yml"
  local kong_traefik_block=""

  if [ "$MODE" = "public" ] && [ "$EXISTING_TRAEFIK" = true ]; then
    kong_traefik_block=$(cat <<EOF
    ports: []
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=${TRAEFIK_NETWORK}"
      - "traefik.http.routers.supabase-kong.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.supabase-kong.entrypoints=websecure"
      - "traefik.http.routers.supabase-kong.tls=true"
      - "traefik.http.routers.supabase-kong.tls.certresolver=${TRAEFIK_RESOLVER}"
      - "traefik.http.services.supabase-kong.loadbalancer.server.port=8000"
EOF
)
  fi

  cat > "$override" << EOFYAML
services:
  studio:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  kong:
    networks:
      - default
      - ${TRAEFIK_NETWORK}
${kong_traefik_block}
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  auth:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  rest:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  realtime:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  storage:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  imgproxy:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  meta:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  functions:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  analytics:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  db:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  vector:
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }
  supavisor:
    networks:
      - default
      - ${TRAEFIK_NETWORK}
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "3" }

networks:
  ${TRAEFIK_NETWORK}:
    external: true
EOFYAML

  if [ "$MODE" = "public" ] && [ "$EXISTING_TRAEFIK" = true ]; then
    print_success "Traefik-маршрут для ${DOMAIN} добавлен"
  elif [ "$MODE" = "public" ] && [ "$EXISTING_TRAEFIK" = false ]; then
    print_warning "Домен указан, но Traefik не найден. Стек будет доступен по http://${SERVER_IP}:8000"
  fi

  print_success "Override-конфиг создан"
}

set_compose_context() {
  COMPOSE_FILES=(-f docker-compose.yml)
  if [ -f "docker-compose.comandos.yml" ]; then
    COMPOSE_FILES+=(-f docker-compose.comandos.yml)
  fi
}

compose_run() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

setup_maintenance_timer() {
  print_header "Настройка weekly maintenance"
  local script_path="/usr/local/bin/comandos-supabase-maintenance.sh"
  local service_path="/etc/systemd/system/comandos-supabase-maintenance.service"
  local timer_path="/etc/systemd/system/comandos-supabase-maintenance.timer"
  local project_abs
  project_abs=$(realpath "$PROJECT_DIR")

  cat > "$script_path" << 'EOSH'
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:?project_dir required}"
BACKUP_DIR="${2:?backup_dir required}"
RETENTION_DAYS="${3:-14}"

cd "$PROJECT_DIR"

docker compose ps -q | while read -r cid; do
  [ -z "$cid" ] && continue
  log_path=$(docker inspect --format '{{.LogPath}}' "$cid" 2>/dev/null || true)
  if [ -n "$log_path" ] && [ -f "$log_path" ]; then
    size=$(stat -c%s "$log_path" 2>/dev/null || echo 0)
    if [ "$size" -gt 52428800 ]; then
      truncate -s 0 "$log_path" || true
    fi
  fi
done

if [ -d "$BACKUP_DIR" ]; then
  find "$BACKUP_DIR" -type f -name 'backup_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete || true
fi

journalctl --vacuum-time=21d >/dev/null 2>&1 || true
EOSH
  chmod +x "$script_path"

  cat > "$service_path" << EOFUNIT
[Unit]
Description=Comandos Supabase weekly maintenance
After=docker.service

[Service]
Type=oneshot
ExecStart=${script_path} ${project_abs} ${project_abs}/backups ${BACKUP_RETENTION_DAYS}
EOFUNIT

  cat > "$timer_path" << 'EOFTIMER'
[Unit]
Description=Run Comandos Supabase maintenance weekly

[Timer]
OnCalendar=Sun *-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOFTIMER

  systemctl daemon-reload
  systemctl enable --now comandos-supabase-maintenance.timer >/dev/null 2>&1
  print_success "Weekly maintenance timer включен"
}

backup_now() {
  print_header "Создание backup"
  if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Папка $PROJECT_DIR не найдена"
    exit 1
  fi

  cd "$PROJECT_DIR"
  set_compose_context

  mkdir -p backups
  local ts
  ts=$(date +%F_%H-%M-%S)
  local out_file="backups/backup_${ts}.sql.gz"

  if ! docker ps --format '{{.Names}}' | grep -qx 'supabase-db'; then
    print_error "Контейнер supabase-db не найден. Сначала запустите стек."
    exit 1
  fi

  docker exec supabase-db pg_dump -U postgres -d postgres | gzip -9 > "$out_file"
  print_success "Backup создан: $(realpath "$out_file")"
}

read_env_value() {
  local key="$1"
  grep -E "^${key}=" "$PROJECT_DIR/.env" | head -n1 | cut -d'=' -f2-
}

n8n_get_base_url() {
  local container_id
  local container_ip

  container_id=$(docker ps --format '{{.ID}} {{.Names}}' | awk '$2 ~ /n8n/ {print $1; exit}')
  if [ -z "$container_id" ]; then
    return 1
  fi

  container_ip=$(docker inspect "$container_id" --format '{{range .NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 || true)
  if [ -z "$container_ip" ]; then
    return 1
  fi

  echo "http://${container_ip}:5678"
}

n8n_find_bootstrap_env() {
  local candidate
  for candidate in /root/n8n/.bootstrap.env /opt/n8n/.bootstrap.env; do
    if [ -f "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  candidate=$(find /root /opt /home -maxdepth 4 -type f -name '.bootstrap.env' 2>/dev/null | head -n1 || true)
  if [ -n "$candidate" ]; then
    echo "$candidate"
    return 0
  fi

  return 1
}

n8n_wait_api() {
  local base_url="$1"
  local i=1
  while [ "$i" -le 90 ]; do
    if curl -fsS --max-time 5 "$base_url/rest/settings" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  return 1
}

n8n_get_api_key() {
  local base_url="$1"
  local cookie_file="$2"
  local expires_at
  expires_at=$(($(date +%s) + 86400))

  curl -fsS -b "$cookie_file" -H "Content-Type: application/json" \
    -X POST "$base_url/rest/api-keys" \
    --data "{\"label\":\"comandos-supabase-bootstrap\",\"expiresAt\":$expires_at,\"scopes\":[\"credential:list\",\"credential:create\",\"credential:update\"]}" \
    | jq -r '.data.rawApiKey // empty'
}

n8n_ensure_credential() {
  local base_url="$1"
  local api_key="$2"
  local name="$3"
  local type="$4"
  local data_json="$5"

  local list_json cred_id
  list_json=$(curl -fsS -H "X-N8N-API-KEY: $api_key" "$base_url/api/v1/credentials?limit=250" 2>/dev/null || true)
  [ -z "$list_json" ] && return 1

  cred_id=$(echo "$list_json" | jq -r --arg n "$name" --arg t "$type" '.data[]? | select(.name==$n and .type==$t) | .id' | head -n1)

  if [ -n "$cred_id" ]; then
    curl -fsS -H "X-N8N-API-KEY: $api_key" -H "Content-Type: application/json" \
      -X PATCH "$base_url/api/v1/credentials/$cred_id" \
      --data "{\"name\":\"$name\",\"type\":\"$type\",\"data\":$data_json,\"isPartialData\":false}" >/dev/null
  else
    curl -fsS -H "X-N8N-API-KEY: $api_key" -H "Content-Type: application/json" \
      -X POST "$base_url/api/v1/credentials" \
      --data "{\"name\":\"$name\",\"type\":\"$type\",\"data\":$data_json}" >/dev/null
  fi
}

bootstrap_n8n_credentials() {
  print_header "Проверка n8n интеграции"

  local base_url
  if ! base_url=$(n8n_get_base_url); then
    print_info "n8n не обнаружен. Автосоздание credentials пропущено."
    return 0
  fi

  local bootstrap_env
  if ! bootstrap_env=$(n8n_find_bootstrap_env); then
    print_info "Файл .bootstrap.env для n8n не найден. Автосоздание credentials пропущено."
    return 0
  fi

  set -a
  . "$bootstrap_env"
  set +a

  if [ -z "${BOOTSTRAP_EMAIL:-}" ] || [ -z "${BOOTSTRAP_PASSWORD:-}" ]; then
    print_info "В .bootstrap.env нет BOOTSTRAP_EMAIL/BOOTSTRAP_PASSWORD. Пропускаю интеграцию."
    return 0
  fi

  if ! n8n_wait_api "$base_url"; then
    print_info "API n8n недоступен. Пропускаю интеграцию."
    return 0
  fi

  local cookie_file api_key
  cookie_file=$(mktemp)

  if ! curl -fsS -c "$cookie_file" -H "Content-Type: application/json" \
    -X POST "$base_url/rest/login" \
    --data "{\"emailOrLdapLoginId\":\"$BOOTSTRAP_EMAIL\",\"password\":\"$BOOTSTRAP_PASSWORD\"}" >/dev/null 2>&1; then
    print_info "Не удалось войти в n8n API. Пропускаю интеграцию."
    rm -f "$cookie_file"
    return 0
  fi

  api_key=$(n8n_get_api_key "$base_url" "$cookie_file" || true)
  if [ -z "$api_key" ]; then
    print_info "Не удалось получить Public API key n8n. Пропускаю интеграцию."
    rm -f "$cookie_file"
    return 0
  fi

  local service_role pg_password pg_port pg_host supabase_host
  service_role=$(read_env_value "SERVICE_ROLE_KEY")
  pg_password=$(read_env_value "POSTGRES_PASSWORD")
  pg_port=$(read_env_value "POSTGRES_PORT")
  pg_host="supabase-supavisor"

  if [ "$MODE" = "public" ] && [ "$EXISTING_TRAEFIK" = true ]; then
    supabase_host="https://${DOMAIN}"
  else
    supabase_host="http://${SERVER_IP}:8000"
  fi

  local supa_json pg_json
  supa_json=$(jq -cn --arg host "$supabase_host" --arg serviceRole "$service_role" '{host:$host,serviceRole:$serviceRole}')
  pg_json=$(jq -cn --arg host "$pg_host" --arg database "postgres" --arg user "postgres" --arg password "$pg_password" --argjson port "${pg_port:-5432}" \
    '{host:$host,database:$database,user:$user,password:$password,maxConnections:100,allowUnauthorizedCerts:false,ssl:"disable",port:$port,sshTunnel:false,sshAuthenticateWith:"password",sshHost:"localhost",sshPort:22,sshUser:"root",sshPassword:"",privateKey:"",passphrase:""}')

  n8n_ensure_credential "$base_url" "$api_key" "Supabase Internal" "supabaseApi" "$supa_json" || true
  n8n_ensure_credential "$base_url" "$api_key" "Supabase Postgres" "postgres" "$pg_json" || true

  rm -f "$cookie_file"
  print_success "n8n credentials обновлены (если n8n был доступен)"
}

start_stack() {
  print_header "Запуск Supabase"
  cd "$PROJECT_DIR"
  set_compose_context
  compose_run pull
  compose_run up -d
  print_success "Supabase запущен"
}

print_summary() {
  print_header "Готово: данные для подключения"
  local postgres_password anon_key service_key pg_port
  postgres_password=$(read_env_value "POSTGRES_PASSWORD")
  anon_key=$(read_env_value "ANON_KEY")
  service_key=$(read_env_value "SERVICE_ROLE_KEY")
  pg_port=$(read_env_value "POSTGRES_PORT")

  if [ "$MODE" = "public" ] && [ "$EXISTING_TRAEFIK" = true ]; then
    EXTERNAL_URL="https://${DOMAIN}"
  elif [ "$MODE" = "public" ]; then
    EXTERNAL_URL="http://${SERVER_IP}:8000"
  else
    EXTERNAL_URL="http://${SERVER_IP}:8000"
  fi

  cat << EOT
URL Supabase: ${EXTERNAL_URL}
Studio URL: ${EXTERNAL_URL}
Server IP: ${SERVER_IP}

PostgreSQL (через Supavisor):
  host: ${SERVER_IP}
  port: ${pg_port:-5432}
  database: postgres
  user: postgres
  password: ${postgres_password}

Supabase keys:
  ANON_KEY: ${anon_key}
  SERVICE_ROLE_KEY: ${service_key}

Локальный путь данных: $(realpath "$PROJECT_DIR")
Бэкапы: $(realpath "$PROJECT_DIR/backups" 2>/dev/null || echo "$PROJECT_DIR/backups")

Compliance note (RU, 152-ФЗ):
  Если вы обрабатываете персональные данные граждан РФ, оцените применимость требований
  152-ФЗ и связанных норм (включая локализацию ПДн) к вашему сценарию.
  При необходимости размещайте инфраструктуру на серверах в РФ и согласуйте требования
  с вашим юристом/специалистом по ИБ.
  Этот скрипт не является юридической консультацией.
EOT
}

health_check() {
  if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Папка $PROJECT_DIR не найдена"
    exit 1
  fi

  cd "$PROJECT_DIR"
  set_compose_context

  print_header "Health check"
  compose_run ps

  local target public_url
  public_url=$(read_env_value "SUPABASE_PUBLIC_URL")
  target="http://127.0.0.1:8000/rest/v1/"
  if [[ "${public_url:-}" =~ ^https?:// ]]; then
    target="${public_url%/}/rest/v1/"
  fi
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$target" || true)
  if [ "$code" = "200" ] || [ "$code" = "401" ]; then
    print_success "API отвечает (HTTP $code): $target"
  else
    print_warning "API пока недоступен (HTTP ${code:-n/a}): $target"
  fi
}

update_stack() {
  print_header "Обновление Supabase"
  backup_now
  cd "$PROJECT_DIR"
  set_compose_context
  compose_run pull
  compose_run up -d
  print_success "Обновление завершено"
}

main_install() {
  require_root
  ORIGINAL_DIR=$(pwd)
  print_logo
  check_dependencies
  install_docker
  detect_traefik
  ensure_traefik_network
  load_existing_env
  gather_user_input
  fetch_official_stack
  configure_env
  create_override_compose
  start_stack
  setup_maintenance_timer
  bootstrap_n8n_credentials
  print_summary
  cd "$ORIGINAL_DIR"
}

case "${1:-}" in
  --stop)
    cd "$PROJECT_DIR"
    set_compose_context
    compose_run down
    ;;
  --logs)
    cd "$PROJECT_DIR"
    set_compose_context
    compose_run logs -f
    ;;
  --backup)
    backup_now
    ;;
  --update)
    update_stack
    ;;
  --health)
    health_check
    ;;
  *)
    main_install
    ;;
esac
