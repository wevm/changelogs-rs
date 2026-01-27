use changelogs::changelog_entry;
use changelogs::error::Error;
use changelogs::workspace::Workspace;
use changelogs::{BumpType, Changelog, Release};
use anyhow::Result;
use console::style;
use inquire::{MultiSelect, Select, Text};
use std::io::Write;
use std::process::{Command, Stdio};

pub fn run(empty: bool, ai: Option<String>, instructions: Option<String>, base_ref: Option<String>) -> Result<()> {
    let workspace = Workspace::discover().map_err(|_| Error::NotInWorkspace)?;

    if !workspace.is_initialized() {
        return Err(Error::NotInitialized.into());
    }

    let changelog_dir = workspace.changelog_dir();

    if empty {
        let id = changelog_entry::generate_id();
        let cs = Changelog {
            id: id.clone(),
            summary: String::new(),
            releases: Vec::new(),
            commit: None,
        };
        changelog_entry::write(&changelog_dir, &cs)?;

        println!(
            "{} Created empty changelog: {}",
            style("✓").green().bold(),
            style(format!(".changelog/{}.md", id)).cyan()
        );
        return Ok(());
    }

    if let Some(ai_command) = ai {
        return run_ai_generation(&workspace, &changelog_dir, &ai_command, instructions.as_deref(), base_ref.as_deref());
    }

    let package_names: Vec<String> = workspace.package_names().iter().map(|s| s.to_string()).collect();

    if package_names.is_empty() {
        println!("{} No packages found in workspace", style("!").yellow().bold());
        return Ok(());
    }

    let selected_packages = if package_names.len() == 1 {
        package_names.clone()
    } else {
        let selected = MultiSelect::new("Which packages would you like to include?", package_names.clone())
            .prompt()?;

        if selected.is_empty() {
            return Err(Error::NoPackagesSelected.into());
        }
        selected
    };

    let bump_options = vec!["patch", "minor", "major"];
    let mut releases = Vec::new();

    for package in &selected_packages {
        let bump_str = Select::new(
            &format!("Bump type for {}:", package),
            bump_options.clone(),
        )
        .prompt()?;

        let bump = match bump_str {
            "patch" => BumpType::Patch,
            "minor" => BumpType::Minor,
            "major" => BumpType::Major,
            _ => unreachable!(),
        };

        releases.push(Release {
            package: package.clone(),
            bump,
        });
    }

    let inline = Text::new("Summary (leave empty for vim):")
        .prompt()?;

    let summary = if inline.trim().is_empty() {
        let temp_file = std::env::temp_dir().join(format!("changelog-{}.md", changelog_entry::generate_id()));
        std::fs::write(&temp_file, "")?;
        
        std::process::Command::new("vim")
            .arg(&temp_file)
            .status()?;
        
        let content = std::fs::read_to_string(&temp_file)?;
        std::fs::remove_file(&temp_file).ok();
        content
    } else {
        inline
    };

    if summary.trim().is_empty() {
        println!("{} Empty summary, changelog not created", style("!").yellow().bold());
        return Ok(());
    }

    let id = changelog_entry::generate_id();
    let cs = Changelog {
        id: id.clone(),
        summary: summary.trim().to_string(),
        releases,
        commit: None,
    };

    changelog_entry::write(&changelog_dir, &cs)?;

    println!(
        "\n{} Created changelog: {}",
        style("✓").green().bold(),
        style(format!(".changelog/{}.md", id)).cyan()
    );

    println!("\nPackages to be released:");
    for release in &cs.releases {
        println!(
            "  {} {} ({})",
            style("•").dim(),
            release.package,
            style(release.bump.to_string()).yellow()
        );
    }

    Ok(())
}

const DEFAULT_INSTRUCTIONS: &str = r#"Generate a changelog entry for this git diff. 

Available packages: {packages}

Respond with ONLY a markdown file in this exact format (no explanation, no code fences):

---
<package-name>: patch
<another-package>: minor
---

Brief description of changes.

Rules:
- Replace <package-name> with actual package names from the list above
- Include ALL packages that were modified in the frontmatter
- Use "patch" for bug fixes, "minor" for features, "major" for breaking changes
- Keep the summary concise (1-3 sentences)
- Use past tense (e.g. "Added", "Fixed", "Removed")

Git diff:
{diff}"#;

fn run_ai_generation(
    workspace: &Workspace,
    changelog_dir: &std::path::Path,
    ai_command: &str,
    instructions: Option<&str>,
    base_ref: Option<&str>,
) -> Result<()> {

    println!("{} Generating changelog with AI...", style("→").cyan().bold());

    let diff_to_use = if let Some(base) = base_ref {
        // Diff against base ref (for CI/PR workflows)
        let diff = Command::new("git")
            .args(["diff", &format!("{}...HEAD", base)])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();
        
        if diff.is_empty() {
            return Err(anyhow::anyhow!("No changes detected between {} and HEAD.", base));
        }
        diff
    } else {
        // Try staged changes first
        let staged = Command::new("git")
            .args(["diff", "--cached"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();

        if !staged.is_empty() {
            staged
        } else {
            // Try unstaged changes
            let unstaged = Command::new("git")
                .args(["diff"])
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                .unwrap_or_default();
            
            if unstaged.is_empty() {
                return Err(anyhow::anyhow!("No changes detected. Stage your changes with `git add` first, or use --ref to diff against a branch."));
            }
            unstaged
        }
    };

    let package_names = workspace.package_names().join(", ");

    let template = instructions.unwrap_or(DEFAULT_INSTRUCTIONS);
    let prompt = template
        .replace("{packages}", &package_names)
        .replace("{diff}", &diff_to_use);

    let parts: Vec<&str> = ai_command.split_whitespace().collect();
    let (cmd, args) = parts.split_first().ok_or_else(|| anyhow::anyhow!("Invalid AI command"))?;

    let mut child = Command::new(cmd)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(prompt.as_bytes())?;
    }

    let output = child.wait_with_output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(anyhow::anyhow!(
            "AI command failed (exit code {:?}):\nstderr: {}\nstdout: {}",
            output.status.code(),
            stderr,
            stdout
        ));
    }

    let response = String::from_utf8_lossy(&output.stdout).to_string();
    
    let cleaned = response
        .trim()
        .trim_start_matches("```markdown")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let changelog = changelogs::changelog_entry::parse("ai-generated", cleaned)?;
    
    let id = changelog_entry::generate_id();
    let cs = Changelog {
        id: id.clone(),
        summary: changelog.summary,
        releases: changelog.releases,
        commit: None,
    };

    changelog_entry::write(changelog_dir, &cs)?;

    println!(
        "\n{} Created changelog: {}",
        style("✓").green().bold(),
        style(format!(".changelog/{}.md", id)).cyan()
    );

    println!("\nPackages to be released:");
    for release in &cs.releases {
        println!(
            "  {} {} ({})",
            style("•").dim(),
            release.package,
            style(release.bump.to_string()).yellow()
        );
    }

    println!("\nSummary:\n{}", cs.summary);

    Ok(())
}
