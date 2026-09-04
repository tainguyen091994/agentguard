#!/usr/bin/env bash
read -r payload
eval "$(echo "$payload" | jq -r '.command')"
