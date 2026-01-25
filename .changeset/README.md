# Changesets

This folder contains changeset files that describe changes to be released.

## Adding a changeset

Run `changesets add` to create a new changeset file.

## File format

Changeset files are markdown with YAML frontmatter:

```markdown
---
package-name: minor
other-package: patch
---

Description of the changes made.
```

## Releasing

Run `changesets version` to apply version bumps and generate changelogs.
