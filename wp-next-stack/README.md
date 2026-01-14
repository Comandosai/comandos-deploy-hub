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

## Примечания
- Установщик копирует шаблоны в текущую папку и генерирует `.env` и `docker-compose.yml`.
- Next.js использует готовый образ `gansa1os/comandos-frontend:latest`.
