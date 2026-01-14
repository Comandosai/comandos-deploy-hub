# Comandos Engine v2.0 (WP + Next.js)

Легкий установочный шаблон для WordPress + Next.js.

## Что внутри
- `setup.sh` — установщик
- `docker-compose.yml.j2` — шаблон с плейсхолдерами доменов
- `frontend.Dockerfile` — сборка Next.js из репозитория
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

## Параметры фронтенда
- По умолчанию сборка идет из `git@github.com:Comandosai/n8n_beget_latvia.git` (ветка `main`).
- Переопределение перед запуском:
  ```bash
  FRONTEND_REPO_URL=git@github.com:Comandosai/your-repo.git FRONTEND_REPO_REF=main ./setup.sh
  ```

## Примечания
- Установщик копирует шаблоны в текущую папку и генерирует `.env` и `docker-compose.yml`.
- Next.js собирается локально из указанного репозитория с параметрами `NEXT_PUBLIC_WP_URL` и `WP_API_BASE`.
