# Закрытая загрузка workflow

Workflow отдела продаж не берутся из открытой папки GitHub.

Открытый GitHub хранит инструкции, правила и команды. Сами workflow скачиваются закрытым архивом через `api.comandos.ai` по лицензионному ключу.

## Что нужно взять из файла данных

В `DANNYE_DLYA_RAZVERTYVANIYA.md` найди:

- `x_license_key`

Если ключа нет, остановись и спроси только его.

## Как скачать архив

Скачивай архив только так:

```bash
curl -fSL \
  -H "X-License-Key: ${X_LICENSE_KEY}" \
  "https://api.comandos.ai/skill-runtime/artifacts/sales-workflows/latest" \
  -o /tmp/sales-workflows.zip
```

После скачивания распакуй во временную папку:

```bash
rm -rf /tmp/sales-workflows
mkdir -p /tmp/sales-workflows
unzip -q /tmp/sales-workflows.zip -d /tmp/sales-workflows
```

Ожидаемая структура:

```text
/tmp/sales-workflows/
  manifest.json
  workflows/
    01_Ingress_Channel_Intake.json
    02_Main_Orcestrator.json
    03_WF_Qualification.json
    04_WF_Consultation.json
    05_WF_Human_Handoff_Workflow.json
    06_WF_Test.json
    07_WF_CRM_Operator.json
    Уведомления об ошибках в N8N.json
```

## Жесткие правила

- Не искать workflow в интернете.
- Не брать workflow из открытой GitHub-папки.
- Не создавать workflow вручную вместо скачивания архива.
- Не продолжать импорт, если архив не скачался.
- Не продолжать импорт, если внутри архива нет `manifest.json` или папки `workflows`.
- Не печатать лицензионный ключ в отчете.

## Что импортировать

Импортировать все `*.json` из:

```text
/tmp/sales-workflows/workflows/
```

После импорта сразу переходить к обязательной перепривязке соединений, настройке error workflow и проверке `credential.id`.
