#!/usr/bin/env bash

# Keep certificate verification enabled and use an explicit trusted CA when needed.
curl --fail --silent --show-error --cacert /etc/ssl/certs/ca-certificates.crt \
  https://downloads.example.com/agent-helper.sh -o /tmp/agent-helper.sh
NODE_TLS_REJECT_UNAUTHORIZED=1 node /tmp/agent-helper.js
