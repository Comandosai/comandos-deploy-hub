# Обновление CyberSEO workflow

Read `SKILL.md` first.

Run:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host <host>
```

Activation rule: for n8n 2.x and newer, publish and activate `ВФ 0-4`; for n8n below 2.x, activate only `ВФ 0`.

Set up SSH key login first if it does not already work. Print only the final SSH command, never the private key.

Ask only for missing SSH access. Do not print secrets or full workflow JSON.
