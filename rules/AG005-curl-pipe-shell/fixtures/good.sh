#!/usr/bin/env bash
set -euo pipefail
curl -fsSL https://install.example.com/setup.sh -o /tmp/setup.sh
sha256sum -c setup.sha256
bash /tmp/setup.sh
