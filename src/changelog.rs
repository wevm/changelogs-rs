use crate::changeset::Changeset;
use crate::config::ChangelogFormat;
use crate::error::Result;
use crate::plan::PackageRelease;
use crate::workspace::Workspace;
use crate::BumpType;
use chrono::Utc;
use std::path::Path;

pub fn generate_entry(release: &PackageRelease, changesets: &[Changeset]) -> String {
    let date = Utc::now().format("%Y-%m-%d");
    let mut entry = format!("## {} ({})\n\n", release.new_version, date);

    let mut major_changes = Vec::new();
    let mut minor_changes = Vec::new();
    let mut patch_changes = Vec::new();

    for changeset in changesets {
        if !release.changeset_ids.contains(&changeset.id) {
            continue;
        }

        for rel in &changeset.releases {
            if rel.package != release.name {
                continue;
            }

            let summary = changeset.summary.trim();
            match rel.bump {
                BumpType::Major => major_changes.push(summary.to_string()),
                BumpType::Minor => minor_changes.push(summary.to_string()),
                BumpType::Patch => patch_changes.push(summary.to_string()),
            }
        }
    }

    if !major_changes.is_empty() {
        entry.push_str("### Major Changes\n\n");
        for change in major_changes {
            for line in change.lines() {
                if line.starts_with('-') || line.starts_with('*') {
                    entry.push_str(&format!("{}\n", line));
                } else if !line.is_empty() {
                    entry.push_str(&format!("- {}\n", line));
                }
            }
        }
        entry.push('\n');
    }

    if !minor_changes.is_empty() {
        entry.push_str("### Minor Changes\n\n");
        for change in minor_changes {
            for line in change.lines() {
                if line.starts_with('-') || line.starts_with('*') {
                    entry.push_str(&format!("{}\n", line));
                } else if !line.is_empty() {
                    entry.push_str(&format!("- {}\n", line));
                }
            }
        }
        entry.push('\n');
    }

    if !patch_changes.is_empty() {
        entry.push_str("### Patch Changes\n\n");
        for change in patch_changes {
            for line in change.lines() {
                if line.starts_with('-') || line.starts_with('*') {
                    entry.push_str(&format!("{}\n", line));
                } else if !line.is_empty() {
                    entry.push_str(&format!("- {}\n", line));
                }
            }
        }
        entry.push('\n');
    }

    entry
}

pub fn update_changelog(path: &Path, new_entry: &str) -> Result<()> {
    let existing = if path.exists() {
        std::fs::read_to_string(path)?
    } else {
        String::new()
    };

    let new_content = if existing.starts_with("# Changelog") {
        let rest = existing.strip_prefix("# Changelog").unwrap_or(&existing);
        let rest = rest.trim_start_matches('\n');
        format!("# Changelog\n\n{}{}", new_entry, rest)
    } else if existing.is_empty() {
        format!("# Changelog\n\n{}", new_entry)
    } else {
        format!("# Changelog\n\n{}{}", new_entry, existing)
    };

    std::fs::write(path, new_content)?;
    Ok(())
}

pub fn write_changelogs(
    workspace: &Workspace,
    releases: &[PackageRelease],
    changesets: &[Changeset],
    format: ChangelogFormat,
) -> Result<()> {
    match format {
        ChangelogFormat::PerCrate => {
            for release in releases {
                if let Some(package) = workspace.get_package(&release.name) {
                    let entry = generate_entry(release, changesets);
                    let changelog_path = package.path.join("CHANGELOG.md");
                    update_changelog(&changelog_path, &entry)?;
                }
            }
        }
        ChangelogFormat::Root => {
            let mut combined_entry = String::new();
            let date = Utc::now().format("%Y-%m-%d");

            combined_entry.push_str(&format!("## {} Releases\n\n", date));

            for release in releases {
                combined_entry.push_str(&format!(
                    "### {} v{}\n\n",
                    release.name, release.new_version
                ));

                let entry = generate_entry(release, changesets);
                let entry_body = entry
                    .lines()
                    .skip(2)
                    .collect::<Vec<_>>()
                    .join("\n");
                combined_entry.push_str(&entry_body);
                combined_entry.push('\n');
            }

            let changelog_path = workspace.root.join("CHANGELOG.md");
            update_changelog(&changelog_path, &combined_entry)?;
        }
    }

    Ok(())
}
