# Запуск отдела продаж ОС

Это новый пакет запуска hosted-отдела продаж в COMANDOS ОС.

Главное:
- старый n8n-сценарий не использовать;
- сначала прочитать `SKILL.md` и `README.md`;
- создать `AGENTS.md`, `LAUNCH_ROADMAP.md`, `LAUNCH_STATE.json` и `PROJECT_NOTES.md` в рабочей папке клиента из `templates/`;
- после каждого действия обновлять roadmap/state;
- не отмечать шаг выполненным без проверки;
- давать пользователю один следующий шаг;
- не печатать секреты полностью.

Обязательный порядок:
1. Режим запуска.
2. Supabase discovery: cloud, self-hosted SSH/VPS, готовая внешняя строка или не нужен.
3. Supabase readiness gate: внешняя строка для COMANDOS ОС, SQL, схема и таблицы.
4. База знаний.
5. Telegram.
6. Исследование аудитории, болей и конкурентов, затем подтверждение гипотезы владельцем.
7. Brief.
8. Модель продажи, стратегия рекомендаций и план данных для диалога.
9. Qualification gate и живая квалификация: боль, путь заявки/процесса, последствия, обязательные факты до консультации, optional-факты и источники без вопроса.
10. Prompt квалификатора.
11. Prompt консультанта.
12. amoCRM, если нужна.
13. CRM snapshot.
14. CRM field gap и повторный snapshot, если поля менялись.
15. Правила CRM и критерии стадий.
16. Prompt CRM-оператора.
17. Финальный Telegram/CRM smoke-test через готовые скрипты этого пакета.

Основные файлы:
- `SKILL.md`
- `README.md`
- `references/launch-roadmap.md`
- `templates/AGENTS.template.md`
- `templates/LAUNCH_ROADMAP.template.md`
- `templates/LAUNCH_STATE.template.json`
- `templates/PROJECT_NOTES.template.md`
- `scripts/telegram_session_doctor.py`
- `scripts/login_telethon_session.py`
- `scripts/telegram_os_smoke.py`

Для этого запуска не устанавливай и не вызывай старый `telegram-testirovanie-bota`, n8n test workflow или `06_WF_Test`.


<!-- context-isolation:start -->
## Граница контекста

Контур этого проекта: `COMANDOS`.

Перед работой читай только карточку COMANDOS, карточку текущего продукта, ближайшие `README.md` и `AGENTS.md`. Очередь решений открывай только для COMANDOS и только если задача ждёт решения владельца или создаёт настоящий блокер.

Не читай, не передавай и не упоминай данные, карточки, блокеры или отчёты InLogic и Work. Исключение — только прямая команда владельца с явно названными контурами и минимально нужными данными.

Если создаётся новый самостоятельный проект или сервис, сначала создай или выбери его карточку под COMANDOS, затем зарегистрируй ближайший `AGENTS.md` и пройди канонический старт проекта.
<!-- context-isolation:end -->
