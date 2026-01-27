use anyhow::Result;
use changelogs::{Workspace, Config};
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
        
        if dry_run {
            println!("(dry-run)");
            published.push(pkg);
            continue;
        }

        let mut cmd = Command::new("cargo");
        cmd.arg("publish")
            .arg("--package")
            .arg(&pkg.name)
            .arg("--no-verify")
            .arg("--allow-dirty");
        
        if let Some(ref t) = tag {
            cmd.env("CARGO_REGISTRY_DEFAULT", t);
        }

        let output = cmd.output()?;
        
        if output.status.success() {
            println!("✓");
            published.push(pkg);
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stderr.contains("already uploaded") || stderr.contains("already exists") {
                println!("(already published)");
            } else {
                println!("✗");
                for line in stdout.lines().chain(stderr.lines()) {
                    eprintln!("    {}", line);
                }
                failed.push(pkg);
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
        println!("Dry run complete. {} package(s) would be published.", published.len());
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
