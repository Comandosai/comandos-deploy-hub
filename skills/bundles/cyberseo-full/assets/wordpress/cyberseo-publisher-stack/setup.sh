#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEFAULT_CERT_RESOLVER="myresolver"
STACK_NAME="CYBERSEO PUBLISHER STACK"
GITHUB_BRANCH="${COMANDOS_GITHUB_BRANCH:-main}"
GITHUB_STACK_PATH="${COMANDOS_GITHUB_STACK_PATH:-skills/bundles/cyberseo-full/assets/wordpress/cyberseo-publisher-stack}"
STATIC_CACHE_MAX_AGE="${COMANDOS_STATIC_CACHE_MAX_AGE:-31536000}"
STATIC_CACHE_IMMUTABLE="${COMANDOS_STATIC_CACHE_IMMUTABLE:-true}"
NONINTERACTIVE_MODE="${COMANDOS_NONINTERACTIVE:-false}"
NONINTERACTIVE_WP_DOMAIN="${COMANDOS_WP_DOMAIN:-}"
NONINTERACTIVE_SSL_EMAIL="${COMANDOS_SSL_EMAIL:-}"
NONINTERACTIVE_WP_SITE_TITLE="${COMANDOS_WP_SITE_TITLE:-}"
NONINTERACTIVE_WP_SITE_DESCRIPTION="${COMANDOS_WP_SITE_DESCRIPTION:-}"
NONINTERACTIVE_WP_BLOG_TITLE="${COMANDOS_WP_BLOG_TITLE:-}"
NONINTERACTIVE_WP_BLOG_DESCRIPTION="${COMANDOS_WP_BLOG_DESCRIPTION:-}"
NONINTERACTIVE_WP_ABOUT_BLOG="${COMANDOS_WP_ABOUT_BLOG:-}"
NONINTERACTIVE_WP_ADMIN_USER="${COMANDOS_WP_ADMIN_USER:-}"
WP_DEFAULT_LOCALE="${COMANDOS_WP_DEFAULT_LOCALE:-ru_RU}"
WP_DEFAULT_SITE_TITLE="${COMANDOS_WP_DEFAULT_SITE_TITLE:-Comandos AI Blog}"
WP_DEFAULT_SITE_DESCRIPTION="${COMANDOS_WP_DEFAULT_SITE_DESCRIPTION:-}"
WP_DEFAULT_BLOG_TITLE="${COMANDOS_WP_DEFAULT_BLOG_TITLE:-}"
WP_DEFAULT_BLOG_DESCRIPTION="${COMANDOS_WP_DEFAULT_BLOG_DESCRIPTION:-}"
WP_DEFAULT_ABOUT_BLOG="${COMANDOS_WP_DEFAULT_ABOUT_BLOG:-}"
WP_DEFAULT_ADMIN_USER="${COMANDOS_WP_DEFAULT_ADMIN_USER:-siteadmin}"
WP_GRAPHQL_YOAST_SEO_ZIP="https://github.com/ashhitch/wp-graphql-yoast-seo/archive/refs/tags/v5.0.0.zip"

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

detect_running_traefik_id() {
    docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}'
}

detect_traefik_resolver() {
    local traefik_id=$1
    if [ -z "$traefik_id" ]; then
        return 0
    fi

    local resolver
    resolver=$(docker inspect "$traefik_id" --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' \
        | tr -d '[],"' | tr ' ' '\n' | grep -oE -- 'certificatesresolvers\.[^=. ]+' | head -n1 | sed 's/certificatesresolvers\.//')

    if [ -z "$resolver" ]; then
        for known in "mytlschallenge" "myresolver" "letsencrypt" "comandos-resolver"; do
            if docker logs --tail 100 "$traefik_id" 2>&1 | grep -q "$known"; then
                resolver="$known"
                break
            fi
        done
    fi

    printf '%s' "${resolver:-}"
}

detect_traefik_dynamic_dir() {
    local traefik_id=$1
    if [ -z "$traefik_id" ]; then
        return 0
    fi

    python3 - "$traefik_id" <<'PY'
import json
import subprocess
import sys

cid = sys.argv[1]
obj = json.loads(subprocess.check_output(["docker", "inspect", cid]))[0]
for mount in obj.get("Mounts", []):
    if mount.get("Destination") == "/dynamic_conf":
        print(mount.get("Source", ""))
        break
PY
}

# Функция для надежного ввода через /dev/tty (для работы через curl | bash)
ask_user() {
    local prompt=$1
    local var_name=$2
    local extra_opt=$3

    if exec 3</dev/tty 2>/dev/null; then
        read $extra_opt -p "$prompt" "$var_name" <&3
        exec 3<&-
    else
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
    local tries=45
    while ! docker exec comandos-db bash -lc "mysql -uwordpress -p\"$DB_PASSWORD\" wordpress -e 'SELECT 1' >/dev/null 2>&1"; do
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

wp_cli() {
    local command="$1"
    docker exec comandos-wp bash -lc "wp ${command} --allow-root"
}

env_quote() {
    python3 - "$1" <<'PY'
import sys

value = sys.argv[1]
print("'" + value.replace("'", "'\"'\"'") + "'")
PY
}

env_assignment() {
    local key="$1"
    local value="$2"
    printf '%s=%s\n' "$key" "$(env_quote "$value")"
}

load_env_file() {
    if [ ! -f ".env" ]; then
        return 0
    fi

    local safe_env
    safe_env="$(mktemp)"
    python3 - ".env" > "$safe_env" <<'PY'
from pathlib import Path
import re
import shlex
import sys

path = Path(sys.argv[1])

def quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"

for raw in path.read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key):
        continue
    if (value.startswith("'") and value.endswith("'")) or (value.startswith('"') and value.endswith('"')):
        try:
            parsed = shlex.split(value, posix=True)
            value = parsed[0] if parsed else ""
        except ValueError:
            value = value[1:-1]
    print(f"{key}={quote(value)}")
PY
    # shellcheck disable=SC1090
    source "$safe_env"
    rm -f "$safe_env"
}

set_wp_option_if_value() {
    local option_name="$1"
    local option_value="$2"
    if [ -z "$option_value" ]; then
        return 0
    fi

    docker exec -e COMANDOS_WP_OPTION_VALUE="$option_value" comandos-wp \
        bash -lc "wp option update '$option_name' \"\$COMANDOS_WP_OPTION_VALUE\" --allow-root" >/dev/null
}

set_theme_mod_if_value() {
    local mod_name="$1"
    local mod_value="$2"
    if [ -z "$mod_value" ]; then
        return 0
    fi

    docker exec -e COMANDOS_THEME_MOD_VALUE="$mod_value" comandos-wp \
        bash -lc "wp eval 'set_theme_mod(\"$mod_name\", getenv(\"COMANDOS_THEME_MOD_VALUE\"));' --allow-root" >/dev/null
}

sync_policy_layer() {
    docker exec comandos-wp mkdir -p /var/www/html/wp-content/mu-plugins
    for plugin in "cyberseo-site-policy.php" "cyberseo-review-sync-hook.php"; do
        local plugin_src="mu-plugins/${plugin}"
        local plugin_dest="/var/www/html/wp-content/mu-plugins/${plugin}"
        if [ ! -f "$plugin_src" ]; then
            print_warning "MU-plugin не найден локально: $plugin_src"
            continue
        fi
        docker cp "$plugin_src" comandos-wp:"$plugin_dest"
        docker exec comandos-wp chown www-data:www-data "$plugin_dest"
        print_success "MU-plugin синхронизирован: ${plugin}"
    done
}

set_publish_ready_mode() {
    ensure_wp_cli
    wp_cli "option update blog_public 1" >/dev/null 2>&1 || true
    wp_cli "option update cyberseo_publish_mode publish-ready" >/dev/null 2>&1 || true
    wp_cli "eval \"set_theme_mod('global_img_aspect_ratio', '3 / 2');\"" >/dev/null 2>&1 || true
    wp_cli "user meta update '$WP_ADMIN_USER' wpseo_noindex_author on" >/dev/null 2>&1 || true
    wp_cli "rewrite structure '/%postname%/' --hard" >/dev/null 2>&1 || true
    wp_cli "rewrite flush --hard" >/dev/null 2>&1 || true
    print_success "Сайт переведен в publish-ready SEO mode"
}

apply_site_profile_runtime() {
    local theme_blog_title="${WP_BLOG_TITLE:-$WP_SITE_TITLE}"
    local theme_blog_description="${WP_BLOG_DESCRIPTION:-$WP_SITE_DESCRIPTION}"

    ensure_wp_cli
    set_wp_option_if_value "blogname" "${WP_SITE_TITLE:-}"
    set_wp_option_if_value "blogdescription" "${WP_SITE_DESCRIPTION:-}"
    set_theme_mod_if_value "blog_title" "$theme_blog_title"
    set_theme_mod_if_value "blog_description" "$theme_blog_description"
    set_theme_mod_if_value "about_blog" "${WP_ABOUT_BLOG:-}"
    set_wp_option_if_value "cyberseo_about_blog" "${WP_ABOUT_BLOG:-}"
    print_success "Профиль сайта и поля темы применены"
}

activate_wordpress_locale() {
    local locale="$1"
    if [ -z "$locale" ]; then
        return 0
    fi

    print_info "Включаю язык WordPress: $locale"
    wp_cli "language core install '$locale' --activate" >/dev/null
    wp_cli "site switch-language '$locale'" >/dev/null 2>&1 || true
    wp_cli "option update WPLANG '$locale'" >/dev/null 2>&1 || true
    print_success "Язык WordPress активирован: $locale"
}

plugin_is_active() {
    local slug="$1"
    wp_cli "plugin is-active '$slug'" >/dev/null 2>&1
}

plugin_prefix_is_active() {
    local prefix="$1"
    docker exec comandos-wp bash -lc "wp plugin list --status=active --field=name --allow-root | grep -E '^${prefix}([-.].*)?$' >/dev/null 2>&1"
}

install_required_plugins() {
    print_info "Установка обязательных плагинов..."
    wp_cli "plugin install wordpress-seo wp-graphql wp-super-cache --activate"
    wp_cli "plugin install '$WP_GRAPHQL_YOAST_SEO_ZIP' --activate"
    enable_wp_super_cache
}

enable_wp_super_cache() {
    print_info "Включаю page cache..."
    docker exec comandos-wp bash -lc "wp eval 'if (function_exists(\"wp_cache_enable\")) { wp_cache_enable(); } if (function_exists(\"wp_super_cache_enable\")) { wp_super_cache_enable(); } echo \"ok\";' --allow-root" >/dev/null 2>&1 || true
    wp_cli "cache flush" >/dev/null 2>&1 || true
}

verify_required_plugins() {
    local failures=0

    if plugin_is_active "wordpress-seo"; then
        print_success "Yoast SEO активен"
    else
        print_error "Yoast SEO не активен"
        failures=$((failures + 1))
    fi

    if plugin_is_active "wp-graphql"; then
        print_success "WPGraphQL активен"
    else
        print_error "WPGraphQL не активен"
        failures=$((failures + 1))
    fi

    if plugin_prefix_is_active "wp-graphql-yoast-seo"; then
        print_success "WPGraphQL Yoast SEO активен"
    else
        print_error "WPGraphQL Yoast SEO не активен"
        failures=$((failures + 1))
    fi

    if plugin_is_active "wp-super-cache"; then
        print_success "WP Super Cache активен"
    else
        print_error "WP Super Cache не активен"
        failures=$((failures + 1))
    fi

    if docker exec comandos-wp bash -lc "grep -Eq \"define\\(\\s*'WP_CACHE'\\s*,\\s*true\\s*\\)\" /var/www/html/wp-config.php" >/dev/null 2>&1; then
        print_success "Page cache включен в wp-config.php"
    else
        print_error "Page cache не включился в wp-config.php"
        failures=$((failures + 1))
    fi

    return "$failures"
}

wait_for_url() {
    local url="$1"
    local attempts="${2:-15}"
    local sleep_seconds="${3:-2}"
    local code=""

    for _ in $(seq 1 "$attempts"); do
        code=$(curl -ksS -o /dev/null -w '%{http_code}' "$url" || true)
        case "$code" in
            200|301|302|401|403)
                return 0
                ;;
        esac
        sleep "$sleep_seconds"
    done

    return 1
}

prewarm_public_urls() {
    local urls=("$@")
    local warmed=0

    for url in "${urls[@]}"; do
        if [ -z "$url" ]; then
            continue
        fi
        if curl -ksS -o /dev/null --max-time 20 "$url"; then
            warmed=$((warmed + 1))
        fi
    done

    if [ "$warmed" -gt 0 ]; then
        print_success "Прогрев страниц выполнен ($warmed)"
    else
        print_warning "Прогрев страниц не подтвердился"
    fi
}

run_install_smoke_checks() {
    local theme_name="$1"
    local failures=0
    local locale=""
    local blog_public=""
    local permalink=""
    local publish_mode=""
    local indexnow_key=""
    local aspect_ratio=""
    local author_noindex=""
    local policy_json=""

    print_header "ПРОВЕРКА УСТАНОВКИ"

    if wp_cli "core is-installed" >/dev/null 2>&1; then
        print_success "WordPress установлен"
    else
        print_error "WordPress не установлен"
        failures=$((failures + 1))
    fi

    locale=$(wp_cli "language core list --status=active --field=language" 2>/dev/null | tail -n1 | tr -d '\r')
    if [ "$locale" == "$WP_LOCALE" ]; then
        print_success "Язык WordPress: $locale"
    elif [ "$MODE" == "INSTALL" ]; then
        print_error "Язык WordPress не совпадает. Ожидался $WP_LOCALE, получен ${locale:-пусто}"
        failures=$((failures + 1))
    else
        print_warning "Язык WordPress отличается от ожидаемого: ${locale:-пусто}"
    fi

    if wp_cli "theme is-active '$theme_name'" >/dev/null 2>&1; then
        print_success "Тема $theme_name активна"
    else
        print_error "Тема $theme_name не активна"
        failures=$((failures + 1))
    fi

    if ! verify_required_plugins; then
        failures=$((failures + 1))
    fi

    if wp_cli "user get '$WP_ADMIN_USER' --field=user_login" >/dev/null 2>&1; then
        print_success "Администратор $WP_ADMIN_USER создан"
    else
        print_error "Администратор $WP_ADMIN_USER не найден"
        failures=$((failures + 1))
    fi

    if [ -n "${WP_APP_PASSWORD:-}" ]; then
        if wp_cli "user application-password list '$WP_ADMIN_USER' --fields=name --format=csv" 2>/dev/null | grep -q "CyberSEO Publisher"; then
            print_success "Application Password создан"
        else
            print_error "Application Password не найден"
            failures=$((failures + 1))
        fi
    elif [ "$MODE" == "INSTALL" ]; then
        print_error "Application Password пустой"
        failures=$((failures + 1))
    else
        print_warning "Application Password не сохранён в .env, пропускаю внешнюю проверку"
    fi

    blog_public=$(wp_cli "option get blog_public" 2>/dev/null | tr -d '\r')
    if [ "$blog_public" == "1" ]; then
        print_success "Сайт открыт для индексации"
    else
        print_error "Сайт закрыт от индексации"
        failures=$((failures + 1))
    fi

    permalink=$(wp_cli "option get permalink_structure" 2>/dev/null | tr -d '\r')
    if [ -n "$permalink" ]; then
        print_success "Постоянные ссылки включены: $permalink"
    else
        print_error "Постоянные ссылки пустые"
        failures=$((failures + 1))
    fi

    aspect_ratio=$(wp_cli "eval \"echo get_theme_mod('global_img_aspect_ratio', '');\"" 2>/dev/null | tail -n1 | tr -d '\r')
    if [ "$aspect_ratio" == "3 / 2" ]; then
        print_success "Пропорции изображений темы: $aspect_ratio"
    else
        print_error "Пропорции изображений темы не выставлены в 3 / 2"
        failures=$((failures + 1))
    fi

    author_noindex=$(wp_cli "user meta get '$WP_ADMIN_USER' wpseo_noindex_author" 2>/dev/null | tail -n1 | tr -d '\r')
    if [ "$author_noindex" == "on" ]; then
        print_success "Yoast: архив автора закрыт от индексации"
    else
        print_error "Yoast: архив автора не закрыт от индексации"
        failures=$((failures + 1))
    fi

    publish_mode=$(wp_cli "option get cyberseo_publish_mode" 2>/dev/null | tr -d '\r')
    if [ "$publish_mode" == "publish-ready" ]; then
        print_success "Режим публикации сайта: publish-ready"
    else
        print_error "Режим публикации сайта не выставлен"
        failures=$((failures + 1))
    fi

    indexnow_key=$(wp_cli "option get cyberseo_indexnow_key" 2>/dev/null | tr -d '\r')
    if [ -n "$indexnow_key" ]; then
        print_success "IndexNow ключ создан"
    else
        print_error "IndexNow ключ не создан"
        failures=$((failures + 1))
    fi

    if wait_for_url "https://$WP_DOMAIN/" 20 3; then
        print_success "Главная страница отвечает"
    else
        print_warning "Главная страница пока не отвечает извне"
    fi

    if wait_for_url "https://$WP_DOMAIN/wp-admin/" 20 3; then
        print_success "Админка отвечает"
    else
        print_warning "Админка пока не отвечает извне"
    fi

    if command -v curl >/dev/null 2>&1 && [ -n "${WP_APP_PASSWORD:-}" ]; then
        policy_json=$(curl -ksS -u "$WP_ADMIN_USER:$WP_APP_PASSWORD" "https://$WP_DOMAIN/wp-json/cyberseo/v1/site-policy" || true)
        if printf '%s' "$policy_json" | grep -q '"plugin_ready":true' && printf '%s' "$policy_json" | grep -q '"public_indexing_enabled":true'; then
            print_success "Служебная политика отвечает"
        else
            print_warning "Служебная политика не подтвердилась через внешний REST"
        fi
    fi

    if [ "$failures" -gt 0 ]; then
        print_error "Проверка установки провалена: $failures проблем"
        return 1
    fi

    print_success "Базовая проверка установки пройдена"
}

update_env_value() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" .env 2>/dev/null; then
        python3 - "$key" "$value" <<'PY'
from pathlib import Path
import sys

path = Path(".env")
key = sys.argv[1]
value = sys.argv[2]
quoted = "'" + value.replace("'", "'\"'\"'") + "'"
lines = path.read_text().splitlines()
updated = False
for index, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[index] = f"{key}={quoted}"
        updated = True
        break
if not updated:
    lines.append(f"{key}={quoted}")
path.write_text("\n".join(lines) + "\n")
PY
    else
        env_assignment "$key" "$value" >> .env
    fi
}

bootstrap_wordpress_install() {
    local site_title="$1"
    local admin_user="$2"
    local admin_password="$3"
    local admin_email="$4"

    ensure_wp_cli
    wait_for_db

    if docker exec comandos-wp bash -lc "wp core is-installed --allow-root >/dev/null 2>&1"; then
        print_info "WordPress уже установлен. Bootstrap пропущен."
        return 0
    fi

    print_info "Автоматический bootstrap WordPress..."
    wp_cli "core install --url='https://$WP_DOMAIN' --title='$site_title' --admin_user='$admin_user' --admin_password='$admin_password' --admin_email='$admin_email' --skip-email"
    activate_wordpress_locale "$WP_LOCALE"
}

generate_wp_app_password() {
    local admin_user="$1"
    ensure_wp_cli
    wp_cli "user application-password create '$admin_user' 'CyberSEO Publisher' --porcelain 2>/dev/null" | tail -n1 | tr -d '\r'
}

activate_theme_runtime() {
    local theme_name="$1"
    local mode="$2"

    ensure_wp_cli

    print_info "Активация темы..."
    if ! docker exec comandos-wp bash -lc "wp theme activate '$theme_name' --allow-root"; then
        print_warning "WP-CLI не смог активировать тему. Пробую через SQL..."
        DB_PASS_SQL="${DB_PASSWORD:-$(grep DB_PASSWORD .env | cut -d= -f2)}"
        docker exec comandos-db mysql -uwordpress -p"$DB_PASS_SQL" wordpress -e \
        "UPDATE wp_options SET option_value = '$theme_name' WHERE option_name IN ('template', 'stylesheet');"
    fi

    install_required_plugins || return 1

    if [ "$mode" == "INSTALL" ]; then
        print_info "Очистка дефолтного контента (пустой сайт)..."
        docker exec comandos-wp bash -lc 'IDS=$(wp post list --post_type=post,page --format=ids --allow-root); if [ -n "$IDS" ]; then wp post delete $IDS --force --allow-root; fi'
        docker exec comandos-wp bash -lc 'CIDS=$(wp comment list --format=ids --allow-root); if [ -n "$CIDS" ]; then wp comment delete $CIDS --force --allow-root; fi'
        docker exec comandos-wp bash -lc 'wp plugin delete akismet hello --allow-root >/dev/null 2>&1 || true'
        print_info "Удаление стандартных тем WordPress..."
        docker exec comandos-wp bash -lc "wp theme list --field=name --allow-root | grep -v '^${theme_name}$' | xargs -r wp theme delete --allow-root" || true
    fi

    wp_cli "transient delete --all" >/dev/null 2>&1 || true
    wp_cli "cache flush" >/dev/null 2>&1 || true
    wp_cli "rewrite flush --hard" >/dev/null 2>&1 || true
    set_publish_ready_mode
}

write_install_report() {
    local report_path="$INSTALL_DIR/install-report.txt"
    cat > "$report_path" <<EOF
WORDPRESS_URL=https://$WP_DOMAIN/
WP_ADMIN_URL=https://$WP_DOMAIN/wp-admin
WP_ADMIN_USER=$WP_ADMIN_USER
WP_ADMIN_PASSWORD=$WP_ADMIN_PASSWORD
WP_APP_PASSWORD=$WP_APP_PASSWORD
WP_ADMIN_EMAIL=$WP_ADMIN_EMAIL
WP_LOCALE=$WP_LOCALE
WP_PUBLISH_MODE=publish-ready
EOF
    chmod 600 "$report_path" 2>/dev/null || true
}

# 0. Стандартизация директории
BASE_DIR="${COMANDOS_BASE_DIR:-$HOME/comandos}"
PRODUCT_SLUG="${COMANDOS_PRODUCT_SLUG:-wordpress}"
PRODUCT_DIR="${COMANDOS_PRODUCT_DIR:-$BASE_DIR/$PRODUCT_SLUG}"

# Создаем структуру если её нет
mkdir -p "$PRODUCT_DIR"

# Переходим в директорию продукта
cd "$PRODUCT_DIR" || exit 1
INSTALL_DIR=$(pwd)

print_logo
print_header "${STACK_NAME} - INSTALLER v1.1.0"
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

TRAEFIK_ID=$(detect_running_traefik_id)
TRAEFIK_RESOLVER_PRESET=$(detect_traefik_resolver "$TRAEFIK_ID")

# 2. Определение режима (Установка или Обновление)
MODE="INSTALL"
if [ -f ".env" ]; then
    echo -e "\n"
    print_header "ОБНАРУЖЕНА СУЩЕСТВУЮЩАЯ УСТАНОВКА!"
    echo -e "1) ${GREEN}Обновить${NC} (сохранить базу данных и настройки)"
    echo -e "2) ${RED}Переустановить${NC} (СТЕРЕТЬ ВСЁ и начать заново)"
    echo -e "3) ${BLUE}Theme sync/update${NC} (обновить тему, policy layer и ассеты без переустановки)"
    ask_user "Выберите вариант (1/2/3): " choice
    if [ "$choice" == "1" ]; then
        MODE="UPDATE"
        load_env_file
        WP_LOCALE="${WP_LOCALE:-$WP_DEFAULT_LOCALE}"
        WP_ADMIN_USER="${WP_ADMIN_USER:-$WP_DEFAULT_ADMIN_USER}"
        WP_SITE_TITLE="${WP_SITE_TITLE:-$WP_DEFAULT_SITE_TITLE}"
        WP_SITE_DESCRIPTION="${WP_SITE_DESCRIPTION:-$WP_DEFAULT_SITE_DESCRIPTION}"
        WP_BLOG_TITLE="${WP_BLOG_TITLE:-$WP_DEFAULT_BLOG_TITLE}"
        WP_BLOG_DESCRIPTION="${WP_BLOG_DESCRIPTION:-$WP_DEFAULT_BLOG_DESCRIPTION}"
        WP_ABOUT_BLOG="${WP_ABOUT_BLOG:-$WP_DEFAULT_ABOUT_BLOG}"
        WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-$SSL_EMAIL}"
        print_success "Режим ОБНОВЛЕНИЯ активирован."
    elif [ "$choice" == "3" ]; then
        MODE="THEME_SYNC"
        load_env_file
        WP_LOCALE="${WP_LOCALE:-$WP_DEFAULT_LOCALE}"
        WP_ADMIN_USER="${WP_ADMIN_USER:-$WP_DEFAULT_ADMIN_USER}"
        WP_SITE_TITLE="${WP_SITE_TITLE:-$WP_DEFAULT_SITE_TITLE}"
        WP_SITE_DESCRIPTION="${WP_SITE_DESCRIPTION:-$WP_DEFAULT_SITE_DESCRIPTION}"
        WP_BLOG_TITLE="${WP_BLOG_TITLE:-$WP_DEFAULT_BLOG_TITLE}"
        WP_BLOG_DESCRIPTION="${WP_BLOG_DESCRIPTION:-$WP_DEFAULT_BLOG_DESCRIPTION}"
        WP_ABOUT_BLOG="${WP_ABOUT_BLOG:-$WP_DEFAULT_ABOUT_BLOG}"
        WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-$SSL_EMAIL}"
        print_success "Режим THEME SYNC активирован."
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

    if [ "$NONINTERACTIVE_MODE" == "true" ]; then
        if [ -z "$NONINTERACTIVE_WP_DOMAIN" ] || [ -z "$NONINTERACTIVE_SSL_EMAIL" ]; then
            print_error "COMANDOS_NONINTERACTIVE=true требует COMANDOS_WP_DOMAIN и COMANDOS_SSL_EMAIL"
            exit 1
        fi
        RAW_WP="$NONINTERACTIVE_WP_DOMAIN"
        SSL_EMAIL="$NONINTERACTIVE_SSL_EMAIL"
        RAW_SITE_TITLE="${NONINTERACTIVE_WP_SITE_TITLE:-$WP_DEFAULT_SITE_TITLE}"
        RAW_SITE_DESCRIPTION="${NONINTERACTIVE_WP_SITE_DESCRIPTION:-$WP_DEFAULT_SITE_DESCRIPTION}"
        RAW_BLOG_TITLE="${NONINTERACTIVE_WP_BLOG_TITLE:-$WP_DEFAULT_BLOG_TITLE}"
        RAW_BLOG_DESCRIPTION="${NONINTERACTIVE_WP_BLOG_DESCRIPTION:-$WP_DEFAULT_BLOG_DESCRIPTION}"
        RAW_ABOUT_BLOG="${NONINTERACTIVE_WP_ABOUT_BLOG:-$WP_DEFAULT_ABOUT_BLOG}"
        RAW_ADMIN_USER="${NONINTERACTIVE_WP_ADMIN_USER:-$WP_DEFAULT_ADMIN_USER}"
        print_info "Non-interactive install: использую значения из env"
    else
        ask_user "WP Domain (blog.site.com): " RAW_WP
        ask_user "SSL Email: " SSL_EMAIL
        ask_user "Название сайта [${WP_DEFAULT_SITE_TITLE}]: " RAW_SITE_TITLE
        RAW_SITE_DESCRIPTION="$WP_DEFAULT_SITE_DESCRIPTION"
        RAW_BLOG_TITLE="$WP_DEFAULT_BLOG_TITLE"
        RAW_BLOG_DESCRIPTION="$WP_DEFAULT_BLOG_DESCRIPTION"
        RAW_ABOUT_BLOG="$WP_DEFAULT_ABOUT_BLOG"
        ask_user "Логин админа [${WP_DEFAULT_ADMIN_USER}]: " RAW_ADMIN_USER
    fi

    WP_DOMAIN=$(clean_url "$RAW_WP")

    DB_PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9')
    DB_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')
    WP_ADMIN_USER="${RAW_ADMIN_USER:-$WP_DEFAULT_ADMIN_USER}"
    WP_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')
    WP_SITE_TITLE="${RAW_SITE_TITLE:-$WP_DEFAULT_SITE_TITLE}"
    WP_SITE_DESCRIPTION="$RAW_SITE_DESCRIPTION"
    WP_BLOG_TITLE="$RAW_BLOG_TITLE"
    WP_BLOG_DESCRIPTION="$RAW_BLOG_DESCRIPTION"
    WP_ABOUT_BLOG="$RAW_ABOUT_BLOG"
    WP_ADMIN_EMAIL="$SSL_EMAIL"
    WP_LOCALE="$WP_DEFAULT_LOCALE"
    WP_APP_PASSWORD=""
fi

# 4. Подготовка компонентов системы
echo -e "\n"
print_header "ПОДГОТОВКА КОМПОНЕНТОВ СИСТЕМЫ..."

GITHUB_BASE="https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/${GITHUB_BRANCH}/${GITHUB_STACK_PATH}"

download_if_missing() {
    local file=$1
    local dir=$(dirname "$file")
    local local_src="$SCRIPT_DIR/$file"

    # Создаем подпапку локально, если её нет
    if [ "$dir" != "." ]; then
        mkdir -p "$dir"
    fi

    if [ -f "$local_src" ]; then
        print_info "Использую локальный файл: $file"
        if [ "$local_src" != "$INSTALL_DIR/$file" ]; then
            cp "$local_src" "$file"
        fi
        return 0
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
    "js/customize-preview.js" "mu-plugins/cyberseo-site-policy.php" "mu-plugins/cyberseo-review-sync-hook.php"
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

REVIEW_SYNC_WEBHOOK_URL="${REVIEW_SYNC_WEBHOOK_URL:-}"
REVIEW_SYNC_SECRET="${REVIEW_SYNC_SECRET:-}"

# 5. Генерация конфигов (только если новая установка)
if [ "$MODE" == "INSTALL" ]; then
    print_header "ГЕНЕРАЦИЯ КОНФИГУРАЦИИ..."
    {
        env_assignment "WP_DOMAIN" "$WP_DOMAIN"
        env_assignment "SSL_EMAIL" "$SSL_EMAIL"
        env_assignment "DB_PASSWORD" "$DB_PASSWORD"
        env_assignment "DB_ROOT_PASSWORD" "$DB_ROOT_PASSWORD"
        env_assignment "STATIC_CACHE_MAX_AGE" "$STATIC_CACHE_MAX_AGE"
        env_assignment "STATIC_CACHE_IMMUTABLE" "$STATIC_CACHE_IMMUTABLE"
        env_assignment "WP_ADMIN_USER" "$WP_ADMIN_USER"
        env_assignment "WP_ADMIN_PASSWORD" "$WP_ADMIN_PASSWORD"
        env_assignment "WP_SITE_TITLE" "$WP_SITE_TITLE"
        env_assignment "WP_SITE_DESCRIPTION" "$WP_SITE_DESCRIPTION"
        env_assignment "WP_BLOG_TITLE" "$WP_BLOG_TITLE"
        env_assignment "WP_BLOG_DESCRIPTION" "$WP_BLOG_DESCRIPTION"
        env_assignment "WP_ABOUT_BLOG" "$WP_ABOUT_BLOG"
        env_assignment "WP_ADMIN_EMAIL" "$WP_ADMIN_EMAIL"
        env_assignment "WP_LOCALE" "$WP_LOCALE"
        env_assignment "REVIEW_SYNC_WEBHOOK_URL" "$REVIEW_SYNC_WEBHOOK_URL"
        env_assignment "REVIEW_SYNC_SECRET" "$REVIEW_SYNC_SECRET"
    } > .env
fi

# Подставляем данные в docker-compose
escape_sed() { printf '%s' "$1" | sed -e 's/[|&]/\\&/g'; }
WP_DOMAIN_ESC=$(escape_sed "$WP_DOMAIN")
SSL_EMAIL_ESC=$(escape_sed "$SSL_EMAIL")
DB_PASSWORD_ESC=$(escape_sed "$DB_PASSWORD")
DB_ROOT_PASSWORD_ESC=$(escape_sed "$DB_ROOT_PASSWORD")
REVIEW_SYNC_WEBHOOK_URL_ESC=$(escape_sed "$REVIEW_SYNC_WEBHOOK_URL")
REVIEW_SYNC_SECRET_ESC=$(escape_sed "$REVIEW_SYNC_SECRET")
TRAEFIK_TLS_RESOLVER_LABEL=""
if [ -n "${TRAEFIK_RESOLVER_PRESET:-}" ]; then
    TRAEFIK_TLS_RESOLVER_LABEL="      - \"traefik.http.routers.comandos-wp.tls.certresolver=${TRAEFIK_RESOLVER_PRESET}\""
fi

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    -e "s|{{SSL_EMAIL}}|$SSL_EMAIL_ESC|g" \
    -e "s|{{DB_PASSWORD}}|$DB_PASSWORD_ESC|g" \
    -e "s|{{DB_ROOT_PASSWORD}}|$DB_ROOT_PASSWORD_ESC|g" \
    -e "s|{{REVIEW_SYNC_WEBHOOK_URL}}|$REVIEW_SYNC_WEBHOOK_URL_ESC|g" \
    -e "s|{{REVIEW_SYNC_SECRET}}|$REVIEW_SYNC_SECRET_ESC|g" \
    -e "s|{{TRAEFIK_TLS_RESOLVER_LABEL}}|$(escape_sed "$TRAEFIK_TLS_RESOLVER_LABEL")|g" \
    docker-compose.yml.j2 > docker-compose.yml

sed -e "s|{{WP_DOMAIN}}|$WP_DOMAIN_ESC|g" \
    user-guide.md.j2 > user-guide.md

# 6. Очистка (только при переустановке)
if [ "$MODE" == "INSTALL" ]; then
    print_warning "Очистка старых контейнеров..."
    PROJECT_NAME=$(basename "$INSTALL_DIR")
    DB_VOLUME="${PROJECT_NAME}_comandos-db-data"
    WP_CONTENT_VOLUME="${PROJECT_NAME}_comandos-wp-content-data"
    docker rm -f comandos-db comandos-wp 2>/dev/null || true
    if docker volume ls -q | grep -Fx "$DB_VOLUME" >/dev/null 2>&1; then
        docker volume rm "$DB_VOLUME" >/dev/null 2>&1 || true
    fi
    if docker volume ls -q | grep -Fx "$WP_CONTENT_VOLUME" >/dev/null 2>&1; then
        docker volume rm "$WP_CONTENT_VOLUME" >/dev/null 2>&1 || true
    fi
fi

# 6. Подготовка сети
print_info "Проверка сети comandos-network..."
if ! docker network inspect comandos-network >/dev/null 2>&1; then
    docker network create comandos-network >/dev/null
fi

# 7. Обновление образов
if [ "$MODE" != "THEME_SYNC" ]; then
    print_info "Обновление образов..."
    docker compose pull >/dev/null 2>&1 || true
else
    print_info "Theme sync mode: пропускаю docker compose pull"
fi

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
    docker exec comandos-db mysql -uroot -p"$DB_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS wordpress; CREATE DATABASE wordpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON wordpress.* TO 'wordpress'@'%'; FLUSH PRIVILEGES;"
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
    set_publish_ready_mode
fi

# 9. Оптимизация Lighthouse (кэширование и сжатие v4.1)
if [ "$RESTORE_SNAPSHOT" != "true" ]; then
print_header "ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ (Lighthouse 98+)..."
if [ "$STATIC_CACHE_IMMUTABLE" == "true" ]; then
CACHE_CONTROL_VALUE="max-age=${STATIC_CACHE_MAX_AGE}, public, immutable"
else
CACHE_CONTROL_VALUE="max-age=${STATIC_CACHE_MAX_AGE}, public"
fi
docker exec comandos-wp bash -c "cat > /var/www/html/.htaccess <<EOF

# Comandos Optimization: Browser Caching (v4.1 Immutable)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/jpg \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/jpeg \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/gif \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/png \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/webp \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/avif \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType image/x-icon \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType text/css \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType application/javascript \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType application/x-javascript \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
  ExpiresByType font/woff2 \"access plus ${STATIC_CACHE_MAX_AGE} seconds\"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch \"\.(ico|pdf|flv|jpg|jpeg|png|gif|webp|avif|js|css|swf|woff2)$\">
    Header set Cache-Control \"${CACHE_CONTROL_VALUE}\"
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
EOF" || true
fi

# 9. Настройка Traefik
print_header "НАСТРОЙКА TRAEFIK (МАРШРУТЫ И СЕТЬ)..."
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
    image: traefik:v3.1
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

print_header "СИНХРОНИЗАЦИЯ POLICY LAYER..."
sync_policy_layer

# БЛОК 2: Генерация конфига
if [ ! -z "$TRAEFIK_ID" ]; then
    docker network connect comandos-network "$TRAEFIK_ID" 2>/dev/null || true

    # Пытаемся вытащить имя резолвера из Cmd или Entrypoint (с поддержкой разных форматов)
    TRAEFIK_RESOLVER=$(detect_traefik_resolver "$TRAEFIK_ID")

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
         # Иначе берём реальный mounted source path для /dynamic_conf
         DYNAMIC_DIR=$(detect_traefik_dynamic_dir "$TRAEFIK_ID")
    fi
    # Fallback, если всё сломалось
    if [ -z "$DYNAMIC_DIR" ]; then
        if [ -d "$BASE_DIR/traefik/dynamic" ]; then
            DYNAMIC_DIR="$BASE_DIR/traefik/dynamic"
        elif [ -d "/root/traefik/dynamic" ]; then
            DYNAMIC_DIR="/root/traefik/dynamic"
        else
            DYNAMIC_DIR="/root/traefik-dynamic"
        fi
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

if [ "$MODE" == "INSTALL" ]; then
    bootstrap_wordpress_install "$WP_SITE_TITLE" "$WP_ADMIN_USER" "$WP_ADMIN_PASSWORD" "$WP_ADMIN_EMAIL"
    WP_APP_PASSWORD=$(generate_wp_app_password "$WP_ADMIN_USER")
    update_env_value "WP_ADMIN_USER" "$WP_ADMIN_USER"
    update_env_value "WP_ADMIN_PASSWORD" "$WP_ADMIN_PASSWORD"
    update_env_value "WP_SITE_TITLE" "$WP_SITE_TITLE"
    update_env_value "WP_SITE_DESCRIPTION" "$WP_SITE_DESCRIPTION"
    update_env_value "WP_BLOG_TITLE" "$WP_BLOG_TITLE"
    update_env_value "WP_BLOG_DESCRIPTION" "$WP_BLOG_DESCRIPTION"
    update_env_value "WP_ABOUT_BLOG" "$WP_ABOUT_BLOG"
    update_env_value "WP_ADMIN_EMAIL" "$WP_ADMIN_EMAIL"
    update_env_value "WP_LOCALE" "$WP_LOCALE"
    update_env_value "WP_APP_PASSWORD" "$WP_APP_PASSWORD"
fi

if ! activate_theme_runtime "$THEME_NAME" "$MODE"; then
    print_error "Не удалось подготовить тему и плагины"
    exit 1
fi

apply_site_profile_runtime

if [ "$MODE" == "INSTALL" ]; then
    write_install_report
fi

if ! run_install_smoke_checks "$THEME_NAME"; then
    exit 1
fi

prewarm_public_urls \
    "https://$WP_DOMAIN/" \
    "https://$WP_DOMAIN/robots.txt" \
    "https://$WP_DOMAIN/wp-sitemap.xml"
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
if [ -f "$INSTALL_DIR/install-report.txt" ]; then
print_info "Отчет:     $INSTALL_DIR/install-report.txt"
fi
print_warning "Совет: Если дизайн не обновился, сбросьте кэш (Ctrl+F5 или Cmd+Shift+R на Mac)"
echo -e "${BLUE}================================================${NC}"
