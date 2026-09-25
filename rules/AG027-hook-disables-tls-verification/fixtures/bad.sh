#!/usr/bin/env bash

# Fetch the helper even when the workstation has a broken trust store.
curl -fsSL -k https://downloads.example.com/agent-helper.sh -o /tmp/agent-helper.sh
NODE_TLS_REJECT_UNAUTHORIZED=0 node /tmp/agent-helper.js
