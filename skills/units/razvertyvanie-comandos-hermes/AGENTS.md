# Развертывание COMANDOS Hermes для Codex

Ты работаешь в папке, которую пользователь создал как `Hermes`.

## Порядок

1. Если файлов установщика нет, скачай их:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

2. Прочитай:

- `README.md`
- `AGENTS.md`
- `comandos-hermes.env`
- `comandos-hermes.lock`
- `docs/INSTALLER_SPEC.md`

3. Запусти:

```bash
bash scripts/check-config.sh comandos-hermes.env
```

4. Если проверка упала, покажи только недостающие поля. Не спрашивай лицензионный ключ.

5. После заполнения запусти:

```bash
./deploy.sh
```

## Главные запреты

- Не создавай вложенную папку `Hermes`.
- Не сохраняй реальные ключи в Git.
- Не печатай секреты в ответе.
- Не запускай `hermes update`.
- Не включай auto-update.
- Не называй установку готовой без проверки HTTPS и systemd-сервисов.

## Лицензия

Лицензионный ключ вводится в браузере при входе в панель. В `comandos-hermes.env` его быть не должно.

