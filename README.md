<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset=".github/banner-light.svg">
    <img alt="changelogs" src=".github/banner-light.svg" width="100%">
  </picture>
</p>

<p align="center">
  Changelog management for Rust, Python, and TypeScript¹ workspaces.
  <br>
  <sub>¹ TypeScript support is coming soon.</sub>
</p>

## Quick Start

```bash
# Install changelogs
curl -sSL changelogs.sh | sh

# Initialize changelogs in your workspace
changelogs init

# Add a changelog for your changes
changelogs add

# See what would be released
changelogs status

# Apply version bumps and generate changelogs
changelogs version
```

## Workflows

```mermaid
flowchart LR
    subgraph Development
        A[Make Changes] --> B[Open PR]
        B --> C{AI generates<br/>changelog}
        C --> D[Merge PR]
    end
    subgraph Release
        D --> E[/RC PR created with changelog/]
        E --> F[Merge RC PR]
        F --> G[/📦 Packages released/]
    end
```

### Development

| # | Step | Example |
|:-:|:-----|--------:|
| 1 | Implement feature & make changes to your code | |
| 2 | Open a PR to propose your changes | [PR #20](https://github.com/wevm/changelogs-rs/pull/20) |
| → | Changelogs are auto-generated via AI | [Action](https://github.com/wevm/changelogs-rs/actions/runs/21611102210/job/62279809755) · [Generated](https://github.com/wevm/changelogs-rs/pull/20/files#diff-29deee10b009554f662a4a8a0579ad9c514f5458f91c61503fef5c49a50ee915) |
| 3 | Merge the PR – changelogs get staged | [`.changelog/`](https://github.com/wevm/changelogs-rs/tree/2b98da3f2e2f89549e324f98145ce64cb68f287b/.changelog) |

### Release (Candidate)

| # | Step | Example |
|:-:|:-----|--------:|
| 1 | Push to main triggers the Release Candidate workflow | [Action](https://github.com/wevm/changelogs-rs/actions/runs/21611161512/job/62280000547) |
| 2 | Workflow creates or updates a Release Candidate PR | [PR&nbsp;#21](https://github.com/wevm/changelogs-rs/pull/21) |
| 3 | Merge the PR to release packages and publish the changelog | [`v0.4.0`&nbsp;release](https://github.com/wevm/changelogs-rs/releases/tag/changelogs%400.4.0) |

## Installation

### Pre-built binaries (recommended)

```bash
curl -sSL https://changelogs.sh | sh
```

Or download directly from [GitHub Releases](https://github.com/wevm/changelogs-rs/releases):

| Platform | Download |
|----------|----------|
| Linux (x86_64) | [changelogs-linux-amd64](https://github.com/wevm/changelogs-rs/releases/latest/download/changelogs-linux-amd64) |
| macOS (Intel) | [changelogs-darwin-amd64](https://github.com/wevm/changelogs-rs/releases/latest/download/changelogs-darwin-amd64) |
| macOS (Apple Silicon) | [changelogs-darwin-arm64](https://github.com/wevm/changelogs-rs/releases/latest/download/changelogs-darwin-arm64) |

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize `.changelog/` directory |
| `add` | Create a new changelog interactively |
| `add --ai "<command>"` | Generate changelog using AI (see [Supported AI Providers](#supported-ai-providers)) |
| `status` | Show pending changelogs and releases |
| `version` | Apply version bumps and update changelogs |
| `publish` | Publish unpublished packages to crates.io |

## Configuration

`.changelog/config.toml`:

```toml
# How to bump packages that depend on changed packages
dependent_bump = "patch"  # patch, minor, or none

[changelog]
format = "per-crate"  # or "root"

# Fixed groups: all always share the same version
[[fixed]]
members = ["crate-a", "crate-b"]

# Linked groups: versions sync when released together  
[[linked]]
members = ["sdk-core", "sdk-macros"]

# Packages to ignore
ignore = []
```

## Changelog Format

`.changelog/brave-lions-dance.md`:

```markdown
---
my-crate: minor
other-crate: patch
---

Added new feature X that does Y.

Fixed bug Z in the parser.
```

## Supported AI Providers

The `--ai` flag and GitHub Action `ai` input accept any CLI command that reads from stdin and outputs text. The diff is piped to the command, and the output becomes the changelog entry.

| Provider | Command | Required Secret | Install |
|----------|---------|-----------------|---------|
| Amp | `amp -x` | `AMP_API_KEY` | `npm install -g @sourcegraph/amp` |
| Claude Code | `claude -p` | `ANTHROPIC_API_KEY` | `npm install -g @anthropic-ai/claude-code` |
| OpenAI | `openai api chat.completions.create -m gpt-4o` | `OPENAI_API_KEY` | `pip install openai` |
| Gemini | `gemini` | `GOOGLE_API_KEY` | `npm install -g @anthropic-ai/gemini-cli` |


### Examples

```bash
# Using Amp
changelogs add --ai "amp -x"

# Using Claude
changelogs add --ai "claude -p"

```

## GitHub Actions

### Check Changelogs on PRs

Comments on PRs with changelog status. If no changelog exists and `ai` is provided, generates one and pre-fills the "Add changelog" link.

```yaml
name: Changelog

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  changelog:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - run: npm install -g @sourcegraph/amp

      - uses: wevm/changelogs-rs/check@master
        with:
          ai: 'amp -x'
        env:
          AMP_API_KEY: ${{ secrets.AMP_API_KEY }}
```

### Create RC PR or Release

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: wevm/changelogs-rs@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**The release action automatically handles both versioning and publishing:**

1. **If changelogs exist** → Creates/updates a "Version Packages" PR
2. **If no changelogs** (PR was just merged) → Publishes unpublished packages to crates.io

### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `branch` | Branch name for the version PR | `changelog-release/main` |
| `commit` | Commit message for version bump | `Version Packages` |
| `conventional-commit` | Use conventional commit format | `false` |
| `crate-token` | Crates.io API token for publishing (Rust) | - |
| `pypi-token` | PyPI API token for publishing (Python) | - |

### Action Outputs

| Output | Description |
|--------|-------------|
| `hasChangelogs` | Whether there are pending changelogs |
| `pullRequestNumber` | The PR number if created/updated |
| `published` | Whether packages were published |
| `publishedPackages` | JSON array of published packages |

## Ecosystem Notes

### Python

Changelogs supports Python packages using PEP 621 `pyproject.toml` files.

**Requirements:**
- `pyproject.toml` with `[project]` section containing `name` and `version`
- Static version (dynamic versions not supported)
- Semantic versioning (no PEP 440 epochs or local versions)
- `python -m build` and `twine` installed (`pip install build twine`)

**Limitations:**
- Single-package repos only (no Python monorepo support)
- PEP 621 only (no `setup.py` or `setup.cfg`)

## License

MIT OR Apache-2.0
