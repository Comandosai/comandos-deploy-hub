# CyberSEO Publisher Stack

Специализированный WordPress stack под `CyberSEO`.

Это не общий WP bootstrap, а deploy-layer под AI-публикатор с фокусом на:

- стабильный article publish runtime
- сохранность `wp-content`
- deterministic SEO policy
- companion `mu-plugin` для `IndexNow` и archive control
- минимальные изменения в самой теме

## Что отличается от upstream `wp-stack`

- добавлен persistent volume для `wp-content`
- вынесен отдельный `DB_ROOT_PASSWORD`
- installer синхронизирует `mu-plugins/cyberseo-site-policy.php`
- `IndexNow` plugin больше не ставится как обязательный default
- archive SEO policy переносится в companion `mu-plugin`
- static cache TTL теперь управляется через env:
  - `COMANDOS_STATIC_CACHE_MAX_AGE`
  - `COMANDOS_STATIC_CACHE_IMMUTABLE`
- auto-install Traefik больше не поднимается с `api.insecure=true`

## Быстрый старт

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/cyberseo-publisher-stack/setup.sh | bash
```

## Что ставится по умолчанию

- WordPress на официальном Docker image
- тема `Comandos AI Blog`
- плагины:
  - `Yoast SEO`
  - `WPGraphQL`
  - `WPGraphQL Yoast SEO`
- companion `mu-plugin`:
  - `cyberseo-site-policy.php`

## Что делает companion policy layer

- обслуживает `https://domain/<indexnow_key>.txt`
- даёт REST route для проверки/синхронизации policy state
- держит archive SEO policy:
  - `post_tag` -> `noindex, follow`
  - `author` -> `noindex, follow`
  - `date` -> `noindex, follow`
  - `category` остаётся indexable
- исключает `tag/author/date` из sitemap

## Snapshot restore

Поддерживается тот же режим:

```bash
COMANDOS_RESTORE_SNAPSHOT=true \
COMANDOS_SNAPSHOT_URL="https://your-host/wordpress_data.tar.gz" \
COMANDOS_SNAPSHOT_DB_URL="https://your-host/wordpress_db.sql.gz" \
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/cyberseo-publisher-stack/setup.sh | bash
```

После restore policy layer всё равно синхронизируется поверх восстановленного сайта.

## Cache policy

По умолчанию stack оставляет aggressive static cache для PageSpeed.

Если нужно переопределить TTL без правки installer:

```bash
COMANDOS_STATIC_CACHE_MAX_AGE=604800 \
COMANDOS_STATIC_CACHE_IMMUTABLE=false \
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/cyberseo-publisher-stack/setup.sh | bash
```

## Важно

- Этот stack сознательно старается не ломать тему.
- Новые publisher/SEO/IndexNow правила должны идти через installer и `mu-plugin`, а не через хаотичные theme edits.
