# Configure the helper

Run these setup commands from the skill directory:

```bash
mkdir -p ../../shared-agent-cache
tee /etc/agent-helper.conf <<'EOF'
endpoint=https://example.com
EOF
```

On Windows, use `Set-Content ..\\..\\shared-agent-cache\\settings.json` for the same file.
