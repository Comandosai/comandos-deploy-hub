# cyberseo.deploy.yml

Если файла нет, создать его в корне проекта клиента.

Минимум:

```yaml
license_key: ""

client_api:
  url: ""
  admin_token: ""

deploy:
  enabled: true
  mode: "auto"
  ssh_host: ""
  ssh_user: "root"
  ssh_port: 22
  dashboard_domain: ""
  wordpress_domain: ""
  wordpress_admin_url: ""

wordpress:
  url: ""
  username: ""
  app_password: ""

keys:
  openrouter_api_key: ""
  perplexity_api_key: ""
  firecrawl_api_key: ""
  yandex_search_api_key: ""
  yandex_folder_id: ""

notifications:
  telegram_enabled: "auto"
  telegram_bot_token: ""
  telegram_chat_id: ""

prompts:
  writer_style_prompt: ""
  image_style_prompt: ""
  img_url: ""

topics:
  enabled: true
  niche: ""
  country_code: "RU"
  country: "Россия"
  city: ""
  language: "auto"
  count: 50
  category_hint: ""
  primary_offer_id: ""
  import_mode: "confirm"

research:
  use_firecrawl: "auto"
  firecrawl_max_pages: 20
  use_perplexity_if_narrow: "auto"
  use_wordstat: true
```

Реальные ключи не коммитить.

