# Contributing

Rules are the point of this project. Most pull requests should add one.

## Add a rule in five minutes

1. Pick the next free id. `agentguard rules` shows what exists.
2. Create `rules/AG0NN-your-rule-name/rule.yml`:

```yaml
id: AG042
name: hook-disables-tls-verification
severity: high
message: This hook turns off TLS certificate checking.
description: >
  Skipping certificate verification in a hook means any host on the path can
  feed the agent whatever it likes. It is usually a workaround for a proxy that
  should have been configured properly.
targets: [hook, settings]
match:
  any_of:
    - regex: 'curl[^\n]{0,120}(?:--insecure|\s-k\b)'
    - regex: 'NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0'
fix: Fix the certificate chain instead of skipping verification.
references:
  - https://curl.se/docs/sslcerts.html
tags: [transport]
```

3. Add two fixtures:

- `rules/AG042-hook-disables-tls-verification/fixtures/bad.sh`, which must trigger the rule
- `rules/AG042-hook-disables-tls-verification/fixtures/good.sh`, which must stay clean. Make it the realistic near miss that a careless regex would catch

4. Run `npm test`. It builds, validates every `rule.yml`, and checks every fixture.
5. Open the pull request. One rule per pull request keeps review fast.

Fixtures are named `bad*` and `good*`. If the rule matches on the file path, name them `bad__<filename>` and `good__<filename>`. Everything after `__` becomes the scanned path.

## What makes a rule land

- **It fires on something real.** Link to the extension, advisory, or discussion where you saw the pattern.
- **The good fixture is a near miss.** `curl https://x.com/a.sh -o a.sh` is a good fixture for the curl-pipe-shell rule. An empty file is not.
- **The message states the problem, not the fix.** "This hook sends environment variables over the network" rather than "avoid sending environment variables".
- **Severity is honest.** `critical` means credential loss or code execution. Style issues are `low` or `info`.

## Severity

| Level | Means |
|---|---|
| `critical` | Credential theft, code execution, or persistence |
| `high` | Strong signal of one of the above, or a real supply chain gap |
| `medium` | Weakens a defence; exploitable with a second problem |
| `low` | Portability or correctness issue with no direct security impact |
| `info` | Worth knowing, never worth failing a build |

## Other pull requests

Engine changes, new matcher types, and output formats are welcome. Open an issue first if the change touches `src/match.ts`. The matcher set is deliberately small so rule authors do not have to learn much.

## Development

```bash
npm install
npm run build
npm test                    # rule validation + fixtures
node dist/cli.js scan examples/vulnerable-plugin
```

Node 20 or newer. The only runtime dependency is `yaml`, and it should stay that way.

## Ground rules

Do not commit real credentials, even expired ones, in a fixture. Use obviously fake values like `ghp_abcdefghijklmnopqrstuvwxyz0123456789`.

Do not submit a rule that targets a specific person's or company's project. Rules describe patterns.

By contributing you agree your work is licensed under Apache-2.0.
