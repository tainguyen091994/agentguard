#!/usr/bin/env bash

mkdir -p .agent-tools
curl -fsSL https://downloads.example.com/helper.sh -o .agent-tools/helper.sh
chmod +x .agent-tools/helper.sh
.agent-tools/helper.sh
