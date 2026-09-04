# Rule format

A rule is one directory under `rules/`:

```
rules/AG005-curl-pipe-shell/
  rule.yml
  fixtures/
    bad.sh
    good.sh
```

## rule.yml

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `AG` plus three or more digits. Never reused, even after a rule is deleted. |
| `name` | yes | kebab-case. Should read as the problem, not the fix. |
| `severity` | yes | `critical`, `high`, `medium`, `low`, `info`. |
| `message` | yes | One line, 140 characters or fewer. Shown on every finding. |
| `description` | no | Two or three sentences on why the pattern is dangerous. Goes into the SARIF report. |
| `targets` | yes | Which file kinds the rule runs against. |
| `match.any_of` | yes | The rule fires when any matcher hits. |
| `match.unless` | no | Cancels the finding when any of these also hit. |
| `fix` | no | What to do instead. |
| `references` | no | Links: docs, advisories, the extension where you saw it. |
| `tags` | no | Free-form labels used for grouping. |

## Targets

| Target | Matches |
|---|---|
| `skill` | `SKILL.md` |
| `hook` | anything under a `hooks/` directory, plus `.sh`, `.bash`, `.zsh`, `.ps1` files in extension folders |
| `mcp` | `.mcp.json`, `mcp.json`, any JSON containing `mcpServers` |
| `plugin` | `plugin.json`, `marketplace.json`, `known_marketplaces.json`, `.claude-plugin/*.json`, `.grok-plugin/*.json` |
| `settings` | `settings.json`, `settings.local.json` |
| `agentsmd` | `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `GROK.md` |
| `any` | every discovered file |

The first entry in `targets` decides how fixtures are classified, so put the main target first.

## Matchers

### regex

Matched against the raw file text. `g` and `m` are always on.

```yaml
- regex: 'curl[^|\n]{0,200}\|\s*(?:sudo\s+)?(?:ba)?sh\b'
  flags: i
```

Use single quotes in YAML so backslashes survive. Bound your quantifiers, `[^\n]{0,200}` rather than `.*`, or a long minified file will stall the scan.

### frontmatter

For `SKILL.md`. Reads the YAML block at the top of the file.

```yaml
- frontmatter: { field: model }                    # field is present
- frontmatter: { field: description, present: false }  # field is missing
- frontmatter: { field: allowed-tools, regex: '\*' }   # present and matches
```

### json

Dot path into parsed JSON. `*` matches any object key or array index.

```yaml
- json:
    path: mcpServers.*.command
    regex: '^(?:bash|sh|cmd|powershell)$'
```

```yaml
- json:
    path: plugins.*.source.url
    sibling_missing: sha        # fires when the parent object has no `sha`
```

```yaml
- json:
    path: name
    present: false              # fires when the path does not resolve
```

JSON with `//` line comments is handled.

### filename

Regex against the path relative to the scan root, POSIX separators.

```yaml
- filename: '(?:^|/)\.claude/.*\.pem$'
```

## Cutting false positives

`match.unless` runs after `any_of` and cancels the whole file's findings for that rule.

```yaml
match:
  any_of:
    - regex: 'eval\s+"?\$\('
  unless:
    - regex: 'agentguard:\s*intentional'
    - filename: '/tests?/'
```

If you find yourself adding a third `unless`, the rule is probably too broad. Narrow the `any_of` pattern instead.

## Fixtures

Every rule needs at least one `bad*` file and one `good*` file.

- `bad*` must produce at least one finding.
- `good*` must produce none, and should be the realistic near miss.

When the rule matches on the path, name fixtures `bad__<name>` and `good__<name>`. Everything after `__` is used as the scanned filename, under `.claude/skills/example/`.

`npm test` runs all of it.

## Suppression, from a user's side

Users silence findings with comments in their own files:

```
# agentguard-disable-next-line AG003
# agentguard-disable-file AG003 AG005
```

Listing no rule id suppresses every rule on that line or in that file. Rule authors do not need to do anything to support this; the engine handles it.
