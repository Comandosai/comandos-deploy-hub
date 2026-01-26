# Comandos Engine v2.0 (WP + Next.js)

Легкий установочный шаблон для WordPress + Next.js.

## Что внутри
- `setup.sh` — установщик
- `docker-compose.yml.j2` — шаблон с плейсхолдерами доменов
- `comandos-wp.css` — стили для WordPress (таблицы/блоки)

## Быстрый старт
```bash
git clone https://github.com/Comandosai/comandos-deploy-hub.git
cd comandos-deploy-hub/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Вопросы установщика
- WP Domain (пример: `blog.mysite.com`)
- Frontend Domain (пример: `next.mysite.com`)
- SSL Email

## Порядок установки
1) Скрипт поднимает БД + WordPress.  
2) Просит открыть `https://<WP_DOMAIN>/wp-admin` и завершить установку.  
3) После нажатия Enter запускает Next.js.

## Примечания
- Установщик копирует шаблоны в текущую папку и генерирует `.env` и `docker-compose.yml`.
- Next.js использует готовый образ `gansa1os/comandos-frontend:latest` и получает `WP_API_BASE` из окружения.
 - Повторный запуск `setup.sh` очищает старую БД и пересоздаёт контейнеры.
