# cyberseo.project.yml

Если файла нет, создать его в корне проекта клиента и остановиться.

Минимум:

```yaml
# Файл проекта CyberSEO.
# Заполни только то, что знаешь.
# Если поле не нужно или пока неизвестно, оставь пустым.
# Агент работает только с этим YAML-файлом и не создаёт отдельный .cyberseo.state.yml.

server:
  # SSH-доступ к серверу. Можно указать IP, домен или SSH-алиас.
  ssh_host: ""

  # SSH-порт. Обычно 22.
  ssh_port: 22

domains:
  # Домен WordPress / блога.
  wordpress: ""

  # Домен панели управления CyberSEO.
  cyberseo_panel: ""

license:
  # Лицензионный ключ CyberSEO.
  cyberseo_key: ""

keys:
  # Ключ KIE / Krea AI для генерации изображений.
  kie_api_key: ""

  # Ключ Perplexity, если пользователь хочет использовать свой баланс.
  perplexity_api_key: ""

  # Ключ Firecrawl для анализа сайтов конкурентов.
  firecrawl_api_key: ""

telegram:
  # Если bot_token и chat_id заполнены, уведомления включатся автоматически.
  bot_token: ""
  chat_id: ""

wordpress:
  admin_email: ""
  admin_username: ""

site:
  site_title: ""
  site_description: ""
  blog_title: ""
  blog_description: ""
  about_blog: ""
  logo_path: ""
  favicon_path: ""
  reference_image_path: ""

topics:
  main_topic: ""
  country: ""
  city: ""
  language: ""
  count: 50

prompts:
  writer_style_prompt: ""
  image_style_prompt: ""

state:
  wordpress:
    installed: false
    admin_url: ""
    admin_username: ""
    admin_password: ""
    app_password: ""
    locale: ""
  cyberseo:
    installed: false
    panel_url: ""
    api_url: ""
    admin_email: ""
    admin_password: ""
    admin_token: ""
    license_connected: false
    healthz_ok: false
  import:
    wordpress_profile_imported: false
    cyberseo_settings_imported: false
    topics_imported: false
  topics:
    generated: false
    rows: []
    report: ""
```

Реальные ключи не коммитить.
Служебные данные вроде WordPress-пароля, адреса API CyberSEO и админ-токена хранить в блоке `state` этого же файла.
Отдельный `.cyberseo.state.yml` не создавать.

`topics.country` — где искать спрос. `topics.language` — на каком языке писать статьи и подбирать ключи.
Если `topics.language` пустой, агент выбирает язык по стране.
Например: страна `Германия`, город `Берлин`, язык `ru` — блог для русскоязычных людей в Германии.

При развёртывании WordPress поля `site.*` должны попасть не только в обычные настройки WordPress, но и в настройки темы Comandos AI Blog:

- `site.site_title` -> `blogname`;
- `site.site_description` -> `blogdescription`;
- `site.blog_title` -> `get_theme_mod('blog_title')`;
- `site.blog_description` -> `get_theme_mod('blog_description')`;
- `site.about_blog` -> `get_theme_mod('about_blog')` и option `cyberseo_about_blog`.

Для администратора WordPress обязательно поставить `user meta wpseo_noindex_author = on`. Это галочка Yoast SEO, которая запрещает показывать архив автора в результатах поиска.
