use changesets::config::Config;
use changesets::error::Error;
use changesets::workspace::Workspace;
use anyhow::Result;
use console::style;

pub fn run() -> Result<()> {
    let workspace = Workspace::discover().map_err(|_| Error::NotInWorkspace)?;

    if workspace.is_initialized() {
        return Err(Error::AlreadyInitialized.into());
    }

    let changeset_dir = workspace.changeset_dir();
    std::fs::create_dir_all(&changeset_dir)?;

    std::fs::write(changeset_dir.join("config.toml"), Config::default_toml())?;

    std::fs::write(
        changeset_dir.join("README.md"),
        r#"# Changesets

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
"#,
    )?;

    println!(
        "{} Initialized changesets in {}",
        style("✓").green().bold(),
        changeset_dir.display()
    );

    println!("\nNext steps:");
    println!("  1. Run {} to create your first changeset", style("changesets add").cyan());
    println!("  2. Commit the changeset file with your PR");
    println!("  3. Run {} to apply versions", style("changesets version").cyan());

    Ok(())
}
