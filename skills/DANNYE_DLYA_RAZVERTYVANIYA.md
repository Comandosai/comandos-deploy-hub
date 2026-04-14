# Данные для развертывания

Заполните только то, что знаете. Остальное агент должен найти сам или спросить отдельно.

Это главный файл входных данных для всего сценария.

## Заполните только это

- `server_access:` 
- `x_license_key:` 
- `n8n_domain:` 
- `ssl_email:` 
- `n8n_admin_email:` 
- `n8n_admin_password:` 
- `openai_api_key:` 
- `openrouter_api_key:` 
- `telegram_bot_token:` 

## Остальное агент должен найти сам, если сможет

- `supabase_dashboard_url:` 
- `supabase_admin_email:` 
- `supabase_admin_password:` 
- `db_host:` 
- `db_port:` 
- `db_name:` 
- `db_user:` 
- `db_password:` 
- `db_schema:` public
- `tenant_id:` global

## Правило для агента

- сначала читать этот файл;
- не спрашивать повторно уже заполненные поля;
- спрашивать только то, чего здесь нет;
- если `n8n` или `Supabase` уже найдены на сервере, дописывать сюда найденные URL, логины, пароли и DB-параметры;
- после каждого этапа предлагать только один следующий шаг.
