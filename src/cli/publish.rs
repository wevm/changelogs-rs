use anyhow::Result;
use changelogs::{Config, Workspace};
use std::process::Command;

pub fn run(dry_run: bool, tag: Option<String>) -> Result<()> {
    let workspace = Workspace::load()?;
    let _config = Config::load(&workspace.changelog_dir)?;

    let packages = workspace.get_publishable_packages()?;

    if packages.is_empty() {
        println!("No unpublished packages found");
        return Ok(());
    }

    println!("🚀 Publishing {} package(s)...\n", packages.len());

    let mut published: Vec<&changelogs::Package> = Vec::new();
    let mut failed: Vec<&changelogs::Package> = Vec::new();

    for pkg in packages {
        print!("  {} v{} ... ", pkg.name, pkg.version);

        match workspace.publish_package(&pkg.name, dry_run, tag.as_deref()) {
            Ok(()) => {
                if dry_run {
                    println!("(dry-run)");
                } else {
                    println!("✓");
                }
                published.push(pkg);
            }
            Err(e) => {
                let err_msg = e.to_string();
                if err_msg.contains("already uploaded") || err_msg.contains("already exists") {
                    println!("(already published)");
                } else {
                    println!("✗");
                    eprintln!("    {}", err_msg);
                    failed.push(pkg);
                }
            }
        }
    }

    println!();

    if !published.is_empty() && !dry_run {
        create_git_tags(&published)?;
    }

    if !failed.is_empty() {
        anyhow::bail!("{} package(s) failed to publish", failed.len());
    }

    if dry_run {
        println!(
            "Dry run complete. {} package(s) would be published.",
            published.len()
        );
    } else {
        println!("Successfully published {} package(s)", published.len());
    }

    Ok(())
}

fn create_git_tags(packages: &[&changelogs::Package]) -> Result<()> {
    for pkg in packages {
        let tag = format!("{}@{}", pkg.name, pkg.version);

        let status = Command::new("git")
            .args(["tag", "-a", &tag, "-m", &format!("Release {}", tag)])
            .status()?;

        if status.success() {
            println!("Created git tag: {}", tag);
        }
    }

    println!("\nDon't forget to push tags: git push --follow-tags");
    Ok(())
}
