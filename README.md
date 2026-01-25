# changesets-rs

A Rust rewrite of [changesets](https://github.com/changesets/changesets) for Cargo workspaces.

## Installation

```bash
cargo install changesets
```

## Quick Start

```bash
# Initialize changesets in your workspace
changesets init

# Add a changeset for your changes
changesets add

# See what would be released
changesets status

# Apply version bumps and generate changelogs
changesets version
```

## Workflow

1. **Make changes** to your code
2. **Run `changesets add`** to describe your changes
3. **Commit** the changeset file with your PR
4. **Merge** your PR
5. **Run `changesets version`** (or let the GitHub Action do it)
6. **Merge** the "Version Packages" PR

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize `.changeset/` directory |
| `add` | Create a new changeset interactively |
| `status` | Show pending changesets and releases |
| `version` | Apply version bumps and update changelogs |

## Configuration

`.changeset/config.toml`:

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

## Changeset Format

`.changeset/brave-lions-dance.md`:

```markdown
---
my-crate: minor
other-crate: patch
---

Added new feature X that does Y.

Fixed bug Z in the parser.
```

## GitHub Action

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
      - uses: wevm/changesets-rs@v1
        with:
          version: changesets version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The action will:
1. Check for pending changesets
2. Run `changesets version` to bump versions
3. Create/update a "Version Packages" PR
4. When merged, versions are updated

## License

MIT OR Apache-2.0
