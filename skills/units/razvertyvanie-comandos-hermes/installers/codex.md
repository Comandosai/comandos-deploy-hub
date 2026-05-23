# Codex: COMANDOS Hermes

1. Открой папку `Hermes`.
2. Выполни:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

3. Заполни `comandos-hermes.env`.
4. Проверь:

```bash
bash scripts/check-config.sh comandos-hermes.env
```

5. Разверни:

```bash
./deploy.sh
```

Лицензионный ключ вводится в панели, не в env-файле.

