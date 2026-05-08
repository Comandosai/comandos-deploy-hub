# cyberseo.project.yml

Если файла нет, создать его в корне проекта клиента и остановиться.

Минимум:

```yaml
# Файл проекта CyberSEO.
# Заполни только то, что знаешь.
# Если поле не нужно или пока неизвестно, оставь пустым.
# Служебные данные агент будет хранить отдельно в .cyberseo.state.yml.

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
```

Реальные ключи не коммитить.
Служебные данные вроде WordPress-пароля, адреса API CyberSEO и админ-токена хранить в `.cyberseo.state.yml`.

`topics.country` — где искать спрос. `topics.language` — на каком языке писать статьи и подбирать ключи.
Если `topics.language` пустой, агент выбирает язык по стране.
Например: страна `Германия`, город `Берлин`, язык `ru` — блог для русскоязычных людей в Германии.
