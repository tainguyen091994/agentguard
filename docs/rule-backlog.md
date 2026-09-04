# Rule backlog

Rules we want and have not written. Each one is a self-contained first contribution: one `rule.yml`, one `bad` fixture, one `good` fixture. Claim one by opening an issue or a draft pull request.

Read [CONTRIBUTING.md](../CONTRIBUTING.md) first, then [rule-format.md](rule-format.md) for the matchers.

## Code execution

| Suggested name | Targets | What it should catch |
|---|---|---|
| `hook-disables-tls-verification` | hook, settings | `curl --insecure`, `curl -k`, `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| `hook-downloads-to-tmp-and-runs` | hook | Download into `/tmp` or `%TEMP%` followed by `chmod +x` and execution |
| `mcp-server-from-paste-site` | mcp, settings | Server code fetched from a gist, pastebin, or a raw URL with no repo behind it |
| `plugin-lifecycle-script` | plugin | `preinstall` / `postinstall` scripts in a plugin's `package.json` |
| `skill-instructs-global-install` | skill | Skill body telling the agent to run `npm i -g`, `pip install --user`, `brew install` unprompted |

## Credentials and exfiltration

| Suggested name | Targets | What it should catch |
|---|---|---|
| `reads-browser-profile` | skill, hook | Chrome `Login Data`, Firefox profile paths, `Cookies` sqlite files |
| `clipboard-access` | skill, hook | `pbpaste`, `xclip -o`, `Get-Clipboard` in an extension that has no clipboard purpose |
| `agentsmd-contains-secret` | agentsmd | A live-looking key committed in `CLAUDE.md` or `AGENTS.md` |
| `hook-modifies-git-config` | hook, settings | `git config` writes to `core.hooksPath` or `credential.helper` |
| `base64-blob-in-skill` | skill | A base64 run of 200+ characters embedded in skill prose |

## Prompt injection

| Suggested name | Targets | What it should catch |
|---|---|---|
| `skill-instructs-disabling-hooks` | skill, agentsmd | Text telling the agent to delete or bypass the user's own hooks |
| `obfuscated-url` | skill, agentsmd, hook | Shortener domains, IP-literal URLs, punycode hosts |
| `skill-impersonates-system` | skill | Body text posing as a system message or as the agent's own operator |
| `instruction-in-code-fence-comment` | skill | Imperative instructions hidden inside an example code block's comments |

## Permissions and blast radius

| Suggested name | Targets | What it should catch |
|---|---|---|
| `settings-permission-allow-all` | settings | `Bash(*)` or an equivalent wildcard in `permissions.allow` |
| `skill-requests-wildcard-tools` | skill | `allowed-tools: "*"` or a list that includes every tool |
| `hook-matcher-unfiltered` | settings | A hook wired to every tool event with no matcher, running a network command |
| `skill-writes-outside-workspace` | skill | Instructions to write above the workspace root |

## Supply chain

| Suggested name | Targets | What it should catch |
|---|---|---|
| `typosquat-known-mcp-server` | mcp, settings | Package names one edit away from a well-known MCP server |
| `plugin-bundles-binary` | any | A committed `.exe`, `.dll`, `.so`, or `.dylib` inside an extension folder |
| `marketplace-source-branch-ref` | plugin | Source pinned to a branch or tag rather than a commit SHA |
| `mcp-http-transport-without-auth` | mcp, settings | A remote HTTP MCP endpoint configured with no auth header |
| `dependency-from-git-url` | plugin | Dependencies pulled straight from a git URL instead of a registry |

## Cross-agent compatibility

These are the `agentcompat` half of the project: things that work on one agent and silently do nothing on another.

| Suggested name | Targets | What it should catch |
|---|---|---|
| `hook-uses-claude-only-env` | hook | `CLAUDE_*` hook variables used in a hook that also ships for Grok Build |
| `hook-uses-grok-only-env` | hook | `GROK_PLUGIN_ROOT`, `GROK_PLUGIN_DATA` used in a hook that also ships for Claude Code |
| `frontmatter-unknown-field` | skill | Frontmatter keys no documented agent reads, usually a typo |
| `frontmatter-name-mismatch` | skill | `name:` does not match the skill's directory name |
| `frontmatter-missing-description` | skill | No `description`, so the agent falls back to the first paragraph |
| `allowed-tools-unknown-tool` | skill | A tool name no agent defines |
| `slash-command-name-collision` | plugin | A command name that shadows a built-in |

## Quality and reliability

| Suggested name | Targets | What it should catch |
|---|---|---|
| `skill-oversized` | skill | A `SKILL.md` far past the point where an agent will read it all |
| `skill-broken-reference` | skill | A relative link to a file that is not in the skill directory |
| `hook-missing-timeout` | settings | A hook with no timeout, which can hang a session |
| `mcp-absolute-user-path` | mcp, settings | A command path under `/Users/<name>` or `C:\Users\<name>`, which breaks for everyone else |
| `unquoted-variable-in-example` | skill | Documented shell commands with unquoted `$VAR`, which break on spaces |
