# Comandos Deploy Hub

Public repository for lightweight, installable deployment templates.

## Templates
- `wp-next-stack/` - Comandos Engine v2.0 (WordPress + Next.js, Docker)

## Quick start (git)
```bash
git clone https://github.com/Comandosai/comandos-deploy-hub.git
cd comandos-deploy-hub/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Quick start (no git)
```bash
curl -L https://github.com/Comandosai/comandos-deploy-hub/archive/refs/heads/main.tar.gz | tar -xz
cd comandos-deploy-hub-main/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Template conventions
- One folder per service/template.
- Include `README.md`, `setup.sh`, and a template `docker-compose.yml.j2`.
- Keep the package lightweight (no `node_modules`, no `.git`).
