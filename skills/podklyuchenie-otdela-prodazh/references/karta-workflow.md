# Карта workflow

Источник текущих workflow:
- [workflows](../workflows)

## Основной пакет

- [01_Ingress_Channel_Intake.json](../workflows/01_Ingress_Channel_Intake.json)
  Название в интерфейсе: `Прием входящих сообщений`

- [02_Main_Orcestrator.json](../workflows/02_Main_Orcestrator.json)
  Название в интерфейсе: `Главный оркестратор`

- [03_WF_Qualification.json](../workflows/03_WF_Qualification.json)
  Название в интерфейсе: `Квалификация`

- [04_WF_Consultation.json](../workflows/04_WF_Consultation.json)
  Название в интерфейсе: `Консультация`

- [05_WF_Human_Handoff_Workflow.json](../workflows/05_WF_Human_Handoff_Workflow.json)
  Название в интерфейсе: `Передача человеку`

- [06_WF_Test.json](../workflows/06_WF_Test.json)
  Название в интерфейсе: `Тестовый workflow`

- [Уведомления об ошибках в N8N.json](../workflows/Уведомления%20об%20ошибках%20в%20N8N.json)
  Название в интерфейсе: `Уведомления об ошибках`

## Дополнительный пакет

Нужно добавить отдельный workflow:
- `06_WF_Test` — тестовый workflow проверки базы знаний

Его назначение:
- простой ИИ-агент;
- подключение к `MCP`;
- использование общего prompt;
- быстрый тест качества базы знаний и товарной таблицы.

## Что должен сделать навык с workflow

1. Загрузить основной пакет.
2. Загрузить дополнительный тестовый workflow.
3. Не плодить дубликаты, если workflow уже существуют.
4. Привязать соединения к узлам.
5. Выполнить тестовый запуск хотя бы одного простого workflow.
