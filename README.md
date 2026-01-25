# changelogs

A Rust rewrite of [changesets](https://github.com/changesets/changesets) for Cargo workspaces.

## Installation

```bash
cargo install changelogs
```

## Quick Start

```bash
# Initialize changelogs in your workspace
changelogs init

# Add a changelog for your changes
changelogs add

# See what would be released
changelogs status

# Apply version bumps and generate changelogs
changelogs version
```

## Workflow

1. **Make changes** to your code
2. **Run `changelogs add`** to describe your changes
3. **Commit** the changelog file with your PR
4. **Merge** your PR
5. **Run `changelogs version`** (or let the GitHub Action do it)
6. **Merge** the "Version Packages" PR

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize `.changelog/` directory |
| `add` | Create a new changelog interactively |
| `status` | Show pending changelogs and releases |
| `version` | Apply version bumps and update changelogs |

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
      - uses: wevm/changelogs-rs@v1
        with:
          version: changelogs version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The action will:
1. Check for pending changelogs
2. Run `changelogs version` to bump versions
3. Create/update a "Version Packages" PR
4. When merged, versions are updated

## License

MIT OR Apache-2.0
