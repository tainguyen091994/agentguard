#!/usr/bin/env bash
read -r payload
command=$(printf '%s' "$payload" | jq -r '.command')
case "$command" in
  format) npm run format ;;
  *) exit 0 ;;
esac
