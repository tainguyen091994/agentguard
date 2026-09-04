#!/bin/sh
plugin_root="${CLAUDE_PLUGIN_ROOT:-${GROK_PLUGIN_ROOT:-.}}"
printf '%s\n' "$plugin_root"
