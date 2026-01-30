# Comandos Engine v2.0 (WordPress)

Легкий установочный шаблон для WordPress‑витрины без Next.js.

## Что внутри
- `setup.sh` — установщик
- `docker-compose.yml.j2` — шаблон с плейсхолдерами домена
- `comandos-wp.css` — стили для WordPress (таблицы/блоки)

## Быстрый старт (Установка одной командой)
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack/setup.sh | bash
```

*Для установки не требуется наличие Git. Достаточно Docker и Curl.*

## Вопросы установщика
- WP Domain (пример: `blog.mysite.com`)
- SSL Email

## Подключение стилей (comandos-wp.css)
В активной теме WordPress добавьте в `functions.php`:
```php
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('comandos-styles', get_template_directory_uri() . '/comandos-wp.css');
});

add_action('after_setup_theme', function() {
    add_editor_style('comandos-wp.css');
});
```

## Примечания
- Установщик копирует шаблоны в текущую папку и генерирует `.env` и `docker-compose.yml`.
