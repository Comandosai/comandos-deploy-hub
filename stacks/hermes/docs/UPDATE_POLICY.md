# Update Policy

## Вердикт

Тихие автообновления выключены. Управляемые уведомления об обновлениях включены.

Причина простая: пользователь не должен случайно подтянуть upstream Hermes или случайный `main`, но должен видеть понятную кнопку, когда мы сами выпустили проверенную версию COMANDOS-стека.

## Источник правды

Есть два файла:

```text
comandos-hermes.lock
update-manifest.json
```

`comandos-hermes.lock` фиксирует, что ставим:

- версия COMANDOS Workspace;
- версия Hermes Agent;
- официальный установщик Hermes Agent;
- запрет legacy dashboard;
- запрет тихих timers/cron.

`update-manifest.json` говорит уже установленной панели, что доступна новая проверенная версия:

- `workspace.version` - версия панели;
- `workspace.ref` - ветка/метка стека;
- `agent.version` - человекочитаемая версия Hermes Agent;
- `agent.ref` - проверенный ref Hermes Agent.

## Как работает проверка

Панель при загрузке вызывает свой `/api/update/status`.

Сервер панели:

1. читает текущую установленную версию из `.runtime/comandos-installed.json`;
2. сразу читает локальный кэш `.runtime/update-manifest-cache.json`;
3. запускает обновление кэша `COMANDOS_UPDATE_MANIFEST_URL` в фоне, без блокировки панели;
4. сравнивает локальные версии с manifest;
5. если version/ref отличаются, показывает уведомление:
   - обновить панель;
   - обновить Hermes Agent.

Это работает даже без `.git`, потому что установленная панель хранит свою версию отдельно.
Первый ответ `/api/update/status` не должен ходить в сеть синхронно: иначе GitHub/raw задержка блокирует остальные кнопки панели.

## Как работает обновление

Кнопка обновления запускает:

```text
/opt/comandos/hermes/install/comandos-update.sh
```

Скрипт:

1. скачивает `Comandosai/comandos-deploy-hub`;
2. берёт только `stacks/hermes`;
3. делает backup текущей панели;
4. обновляет файлы панели без перезаписи `.env` и `.runtime`;
5. пересобирает панель;
6. обновляет `.runtime/comandos-installed.json`;
7. перезапускает нужный systemd user service.

Для Hermes Agent скрипт использует закреплённый официальный installer URL из lock-файла и после обновления перезапускает gateway.

## Что нельзя

- Нельзя включать тихие auto-update timers.
- Нельзя обновлять пользователя напрямую из upstream Hermes dashboard.
- Нельзя поднимать родную публичную панель Hermes как вторую панель.
- Нельзя считать `main` безопасным, если `update-manifest.json` не обновлён осознанно.
- Нельзя терять `.env`, лицензию, пароль, Telegram и model keys при обновлении панели.

## Как выпускать новую версию

1. Локально внести изменения в `stacks/hermes`.
2. Проверить сборку панели и smoke-install.
3. Поднять `COMANDOS_WORKSPACE_VERSION` в `comandos-hermes.lock`.
4. Обновить `workspace.version` в `update-manifest.json`.
5. Если менялся Hermes Agent, обновить `HERMES_AGENT_REF` и `agent.ref`.
6. Запушить изменения в GitHub.
7. На тестовом VPS открыть панель и проверить, что появилось уведомление об обновлении.

## Откат

Если обновление панели прошло плохо:

1. остановить `comandos-workspace.service`;
2. вернуть backup из `/opt/comandos/hermes/backups`;
3. восстановить `.runtime/comandos-installed.json` под старую версию;
4. запустить сервис обратно.

Hermes Agent откатываем отдельно только после проверки совместимости, потому что официальный installer может менять окружение.
