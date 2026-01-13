# Comandos Engine v2.0 (WP + Next.js)

This folder contains the lightweight installer and templates for the WordPress + Next.js stack.

## What is included
- `setup.sh` - universal installer
- `docker-compose.yml.j2` - template with domain placeholders
- `comandos-wp.css` - WordPress frontend styles

## Quick start
```bash
git clone https://github.com/Comandosai/comandos-deploy-hub.git
cd comandos-deploy-hub/wp-next-stack
chmod +x setup.sh
./setup.sh
```

## Installer prompts
- WP Domain (example: `blog.mysite.com`)
- Frontend Domain (example: `next.mysite.com`)
- SSL Email

## Notes
- The installer copies templates into the current directory and generates `.env` and `docker-compose.yml`.
- Next.js uses the prebuilt image `gansa1os/comandos-frontend:latest`.
