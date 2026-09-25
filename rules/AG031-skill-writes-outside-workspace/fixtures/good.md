# Configure the helper

Keep generated files inside the current workspace:

```bash
mkdir -p ./shared-agent-cache
tee ./shared-agent-cache/agent-helper.conf <<'EOF'
endpoint=https://example.com
EOF
```

On Windows, use `Set-Content .\\shared-agent-cache\\settings.json`.
