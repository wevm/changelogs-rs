use anyhow::Result;
use changelogs::{Config, Ecosystem, Package, PublishResult, Workspace};
use std::process::Command;

pub fn run_with_ecosystem(
    dry_run: bool,
    tag: Option<String>,
    ecosystem: Option<Ecosystem>,
) -> Result<()> {
    let workspace = Workspace::load_with_ecosystem(ecosystem)?;
    let _config = Config::load(&workspace.changelog_dir)?;

    let packages = workspace.get_publishable_packages()?;

    if packages.is_empty() {
        println!("No unpublished packages found");
        return Ok(());
    }

    println!("🚀 Publishing {} package(s)...\n", packages.len());

    let mut published: Vec<&Package> = Vec::new();
    let mut skipped: Vec<&Package> = Vec::new();
    let mut failed: Vec<&Package> = Vec::new();

    for pkg in packages {
        print!("  {} v{} ... ", pkg.name, pkg.version);

        match workspace.publish_package(pkg, dry_run, tag.as_deref()) {
            Ok(PublishResult::Success) => {
                if dry_run {
                    println!("(dry-run)");
                } else {
                    println!("✓");
                }
                published.push(pkg);
            }
            Ok(PublishResult::Skipped) => {
                println!("⊘ (no token)");
                skipped.push(pkg);
            }
            Ok(PublishResult::Failed) => {
                println!("✗");
                failed.push(pkg);
            }
            Err(e) => {
                println!("✗");
                eprintln!("    {}", e);
                failed.push(pkg);
            }
        }
    }

    println!();

    if !dry_run {
        let taggable: Vec<&Package> = published.iter().chain(skipped.iter()).copied().collect();
        if !taggable.is_empty() {
            create_git_tags(&workspace, &taggable)?;
        }
    }

    if !failed.is_empty() {
        anyhow::bail!("{} package(s) failed to publish", failed.len());
    }

    if dry_run {
        println!(
            "Dry run complete. {} package(s) would be published.",
            published.len()
        );
    } else if !skipped.is_empty() && published.is_empty() {
        println!(
            "No packages published (no token), but {} git tag(s) created",
            skipped.len()
        );
    } else {
        println!("Successfully published {} package(s)", published.len());
    }

    Ok(())
}

fn create_git_tags(workspace: &Workspace, packages: &[&Package]) -> Result<()> {
    for pkg in packages {
        let tag = workspace.tag_name(pkg);

        let output = Command::new("git")
            .args(["tag", "-a", &tag, "-m", &format!("Release {}", tag)])
            .output()
            .map_err(|e| anyhow::anyhow!("failed to run 'git tag': {}", e))?;

        if output.status.success() {
            println!("Created git tag: {}", tag);
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!("Failed to create git tag {}: {}", tag, stderr.trim());
        }
    }

    println!("\nDon't forget to push tags: git push --follow-tags");
    Ok(())
}
