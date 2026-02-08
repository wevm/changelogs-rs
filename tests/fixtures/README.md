# Golden File Integration Tests

Each subdirectory is a self-contained test case. The test runner in `tests/golden.rs` auto-runs each fixture through the full pipeline: changelog parsing → plan assembly → CHANGELOG generation.

## Adding a new test

1. Create a directory under `tests/fixtures/<name>/`
2. Add the required files (see structure below)
3. Add a one-line test function in `tests/golden.rs`:
   ```rust
   #[test]
   fn golden_my_new_test() {
       run_golden_test("my-new-test");
   }
   ```
4. Run `cargo test --test golden` to verify

## Fixture structure

```
tests/fixtures/<name>/
├── packages.toml          # required — defines workspace packages
├── changelog/             # required — changeset .md files (frontmatter + summary)
│   └── my-change.md
├── config.toml            # optional — changelogs config (fixed groups, ignore, etc.)
└── expected/              # golden outputs to diff against
    ├── releases.txt       # optional — expected release plan (one line per package)
    └── CHANGELOG.md       # optional — expected changelog output
```

### packages.toml

```toml
[[packages]]
name = "my-crate"
version = "1.0.0"
deps = ["other-crate"]  # optional
```

### changelog/*.md

Standard changeset format:

```markdown
---
my-crate: minor
---

Description of the change.
```

### expected/releases.txt

One release per line, sorted by package name:

```
my-crate: 1.0.0 -> 1.1.0 (minor)
```

### expected/*CHANGELOG.md

For per-crate format with multiple packages, name files `<pkg>-CHANGELOG.md` (e.g. `core-CHANGELOG.md`). For single-crate or root format, use `CHANGELOG.md`.
