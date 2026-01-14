# Comandos Deploy Hub

Публичный репозиторий для легких установочных шаблонов деплоя.

## Шаблоны
- `wp-next-stack/` — Comandos Engine v2.0 (WordPress + Next.js, Docker)

## Быстрый старт (git)
```bash
git clone https://github.com/Comandosai/comandos-deploy-hub.git
cd comandos-deploy-hub/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Быстрый старт (без git)
```bash
curl -L https://github.com/Comandosai/comandos-deploy-hub/archive/refs/heads/main.tar.gz | tar -xz
cd comandos-deploy-hub-main/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Правила для шаблонов
- Одна папка на сервис/шаблон.
- Внутри: `README.md`, `setup.sh`, `docker-compose.yml.j2`.
- Пакет должен быть легким (без `node_modules`, без `.git`).
