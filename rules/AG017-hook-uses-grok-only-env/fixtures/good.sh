#!/bin/sh
plugin_data="${GROK_PLUGIN_DATA:-${CLAUDE_PLUGIN_DATA:-.cache}}"
mkdir -p "$plugin_data/cache"
