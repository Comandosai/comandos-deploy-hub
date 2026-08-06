# Supabase

Цель: подключить клиентский Supabase/Postgres к COMANDOS ОС и применить схему `sales_department`.

## Supabase readiness gate

Сначала определи deployment mode и зафиксируй его в `LAUNCH_STATE.json`:

- `cloud_supabase` - проект в облаке Supabase;
- `self_hosted_ssh` - Supabase найден на SSH/VPS клиента;
- `external_postgres` - пользователь дал готовую внешнюю Postgres/Supabase строку;
- `not_required` - запуск без базы знаний и без CRM-хранилища.

Если пользователь просит "зайди на SSH Main и посмотри Supabase", это не повод прыгать дальше. Это этап discovery:

1. Проверь, есть ли Supabase/Postgres на сервере.
2. Определи, как база доступна внутри сервера: Docker service, host, порт, имя базы.
3. Отдельно определи, как COMANDOS ОС сможет подключиться снаружи.
4. Если доступ есть только как `db:<port>` внутри Docker-сети, отметь `internal_connection_available = true`, но `external_connection_verified = false`.
5. Не запускай базу знаний и векторизацию, пока не появится проверенная строка подключения для COMANDOS ОС или не подтверждено, что ОС находится в той же сети.

Supabase считается готовой только когда выполнены все условия:

- deployment mode определен;
- SQL из `sql/supabase_schema.sql` применен;
- схема `sales_department` и обязательные таблицы проверены;
- connection string проверена именно там, где будет работать COMANDOS ОС/кабинет;
- кабинет показывает статус `подключена` или агент доказал эквивалентную внешнюю проверку.

## Сценарий A: агент имеет доступ

1. Получи connection string из защищенного источника.
2. Не печатай его полностью.
3. Примени SQL из `sql/supabase_schema.sql`.
4. Проверь, что есть схема `sales_department`.
5. Проверь обязательные таблицы:
   - `knowledge_rag`
   - `products_live`
   - `clients`
   - `client_identities`
   - `leads`
   - `channel_identities`
   - `client_memory_events`
   - `conversations`
   - `messages`
   - `workflow_runs`
   - `handoffs`
   - `lead_events`
   - `processed_events`
   - `chat_history`
   - `chat_history_raw_backup`
   - `nurture_state`
   - `daily_kpi`
6. Проверь поиск для базы знаний:
   - `sales_department.knowledge_rag` имеет `embedding vector(1536)` и `fts tsvector`;
   - есть HNSW-индекс по `embedding`;
   - есть GIN-индекс по `fts`;
   - есть функция `sales_department.hybrid_search`;
   - есть функция `sales_department.match_knowledge_rag`.
7. Попроси пользователя вставить connection string в кабинет COMANDOS ОС, если кабинет требует ручной ввод.
8. Отметь Supabase готовой только после статуса `подключена` в кабинете.

## Сценарий B: облачный Supabase, агент не имеет доступа

Дай пользователю один следующий шаг:

1. Откройте Supabase.
2. Выберите проект.
3. Перейдите в `Project Settings -> Database`.
4. Найдите `Connection string`.
5. Выберите `Direct connection`.
6. Скопируйте строку.
7. Замените `[YOUR-PASSWORD]` на пароль базы проекта.
8. Вставьте строку в COMANDOS ОС -> Отдел продаж -> Supabase.
9. В Supabase откройте `SQL Editor`.
10. Вставьте SQL из `sql/supabase_schema.sql`.
11. Нажмите `Run`.
12. Вернитесь в кабинет и нажмите `Подключить`.

## Сценарий C: self-hosted Supabase на SSH/VPS

Если Supabase найден на сервере:

1. Проверь контейнеры/сервисы Supabase и Postgres.
2. Найди внутренний host/port без вывода паролей.
3. Проверь SQL внутри серверного контура, если есть безопасный доступ.
4. Определи внешний путь для COMANDOS ОС:
   - Supavisor/pooler, если он реально принимает стандартное Postgres-подключение;
   - защищенный direct-port/proxy к Postgres;
   - внутренняя сеть, если COMANDOS ОС работает на том же сервере/контуре;
   - иначе ручное действие владельца: открыть безопасный доступ или дать cloud Supabase.
5. Не копируй в буфер и не предлагай строку, которая работает только внутри Docker-сети.
6. Если внешняя строка не готова, остановись и дай один точный вопрос/действие: открыть защищенный доступ, настроить pooler или выбрать cloud Supabase.

Признаки неготовности:

- работает только `db:5433`, `postgres:5432` или другой внутренний Docker-host;
- внешний pooler не принимает пароль/пользователя;
- `sales_department.knowledge_rag` видна изнутри, но не проверена снаружи;
- кабинет COMANDOS ОС не показывает статус `подключена`.

В этом случае Supabase в roadmap остается `[ ]`, а в `PROJECT_NOTES.md` фиксируется: "данные/схема внутри есть, внешняя строка подключения не подтверждена".

## Важно

- Connection string не писать в `LAUNCH_ROADMAP.md`.
- Connection string не писать в `LAUNCH_STATE.json`.
- В `LAUNCH_STATE.json` можно хранить только тип подключения, маску host/port и признаки проверки.
- Если SQL упал на extension `vector`, попроси пользователя проверить, включено ли расширение `vector` в Supabase.
- Для отдела продаж ОС рабочая схема всегда `sales_department`.
- Таблицы `public.knowledge_rag` и `public.products_live` не являются критерием готовности этого запуска.
- Если этап Supabase был пропущен, а позже агент уперся в connection string, нужно вернуться к Supabase readiness gate и закрыть его, а не чинить векторизацию задним числом.
- Клиентская схема не должна требовать `sales_department.error_logs`: технические ошибки runtime пишутся в центральную схему COMANDOS `sales_monitoring.error_events`.
