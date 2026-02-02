use crate::changelog_entry::{self, Changelog};
use crate::config::ChangelogFormat;
use crate::error::Result;
use crate::plan::PackageRelease;
use crate::workspace::Workspace;
use crate::BumpType;
use chrono::Utc;
use std::path::Path;
use std::process::Command;

fn get_github_url() -> Option<String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .output()
        .ok()?;
    
    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    if url.starts_with("git@github.com:") {
        let repo = url.strip_prefix("git@github.com:")?.strip_suffix(".git").unwrap_or(&url);
        Some(format!("https://github.com/{}", repo))
    } else if url.starts_with("https://github.com/") {
        Some(url.strip_suffix(".git").unwrap_or(&url).to_string())
    } else {
        None
    }
}

struct ChangeWithMeta {
    summary: String,
    link: Option<(String, String)>, // (url, display_text)
    authors: Vec<String>,
}

pub fn generate_entry(release: &PackageRelease, changelogs: &[Changelog], changelog_dir: &Path) -> String {
    let date = Utc::now().format("%Y-%m-%d");
    let mut entry = format!("## {} ({})\n\n", release.new_version, date);

    let github_url = get_github_url();

    let mut major_changes = Vec::new();
    let mut minor_changes = Vec::new();
    let mut patch_changes = Vec::new();

    for changelog in changelogs {
        if !release.changelog_ids.contains(&changelog.id) {
            continue;
        }

        for rel in &changelog.releases {
            if rel.package != release.name {
                continue;
            }

            let summary = changelog.summary.trim().to_string();
            
            let (link_info, authors) = github_url.as_ref()
                .and_then(|base| {
                    let info = changelog_entry::get_commit_info(changelog_dir, &changelog.id)?;
                    
                    let link_info = if let Some(pr) = info.pr_number {
                        Some((format!("{}/pull/{}", base, pr), format!("#{}", pr)))
                    } else {
                        let short_sha = &info.commit_sha[..7.min(info.commit_sha.len())];
                        Some((format!("{}/commit/{}", base, short_sha), short_sha.to_string()))
                    };
                    
                    Some((link_info, info.authors))
                })
                .unwrap_or((None, Vec::new()));

            let change = ChangeWithMeta { summary, link: link_info, authors };
            match rel.bump {
                BumpType::Major => major_changes.push(change),
                BumpType::Minor => minor_changes.push(change),
                BumpType::Patch => patch_changes.push(change),
            }
        }
    }

    if !major_changes.is_empty() {
        entry.push_str("### Major Changes\n\n");
        for change in major_changes {
            write_change_lines(&mut entry, &change);
        }
        entry.push('\n');
    }

    if !minor_changes.is_empty() {
        entry.push_str("### Minor Changes\n\n");
        for change in minor_changes {
            write_change_lines(&mut entry, &change);
        }
        entry.push('\n');
    }

    if !patch_changes.is_empty() {
        entry.push_str("### Patch Changes\n\n");
        for change in patch_changes {
            write_change_lines(&mut entry, &change);
        }
        entry.push('\n');
    }

    entry
}

fn write_change_lines(entry: &mut String, change: &ChangeWithMeta) {
    let mut suffix_parts = Vec::new();
    
    if !change.authors.is_empty() {
        let authors_str = change.authors
            .iter()
            .map(|a| format!("@{}", a.replace(' ', "")))
            .collect::<Vec<_>>()
            .join(", ");
        suffix_parts.push(format!("by {}", authors_str));
    }
    
    if let Some((ref url, ref display)) = change.link {
        suffix_parts.push(format!("[{}]({})", display, url));
    }
    
    let suffix = if suffix_parts.is_empty() {
        String::new()
    } else {
        format!(" ({})", suffix_parts.join(", "))
    };
    
    let lines: Vec<&str> = change.summary.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        let is_last = i == lines.len() - 1;
        let line_suffix = if is_last { &suffix } else { "" };
        
        if line.starts_with('-') || line.starts_with('*') {
            entry.push_str(&format!("{}{}\n", line, line_suffix));
        } else if !line.is_empty() {
            entry.push_str(&format!("- {}{}\n", line, line_suffix));
        }
    }
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
    changelogs: &[Changelog],
    format: ChangelogFormat,
) -> Result<()> {
    let changelog_dir = &workspace.changelog_dir;
    
    match format {
        ChangelogFormat::PerPkg => {
            for release in releases {
                if let Some(package) = workspace.get_package(&release.name) {
                    let entry = generate_entry(release, changelogs, changelog_dir);
                    let changelog_path = package.path.join("CHANGELOG.md");
                    update_changelog(&changelog_path, &entry)?;
                }
            }
        }
        ChangelogFormat::Root => {
            let mut combined_entry = String::new();

            for release in releases {
                combined_entry.push_str(&format!(
                    "## `{}@{}`\n\n",
                    release.name, release.new_version
                ));

                let entry = generate_entry(release, changelogs, changelog_dir);
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
