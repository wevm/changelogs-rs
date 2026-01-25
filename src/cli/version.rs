use changesets::changelog;
use changesets::changeset;
use changesets::config::Config;
use changesets::error::Error;
use changesets::plan;
use changesets::workspace::Workspace;
use anyhow::Result;
use console::style;
use semver::Version;
use std::collections::HashMap;

pub fn run() -> Result<()> {
    let workspace = Workspace::discover().map_err(|_| Error::NotInWorkspace)?;

    if !workspace.is_initialized() {
        return Err(Error::NotInitialized.into());
    }

    let changeset_dir = workspace.changeset_dir();
    let changesets = changeset::read_all(&changeset_dir)?;

    if changesets.is_empty() {
        println!("{} No changesets found", style("ℹ").blue().bold());
        return Ok(());
    }

    let config = Config::load(&changeset_dir)?;
    let release_plan = plan::assemble(&workspace, changesets.clone(), &config);

    if release_plan.releases.is_empty() {
        println!("{} No packages to release", style("ℹ").blue().bold());
        return Ok(());
    }

    println!("{} Updating versions...\n", style("→").blue().bold());

    let mut version_updates: HashMap<String, Version> = HashMap::new();

    for release in &release_plan.releases {
        workspace.update_version(&release.name, &release.new_version)?;
        version_updates.insert(release.name.clone(), release.new_version.clone());

        println!(
            "  {} {} {} → {}",
            style("✓").green(),
            style(&release.name).cyan(),
            style(&release.old_version.to_string()).dim(),
            style(&release.new_version.to_string()).green()
        );
    }

    workspace.update_dependency_versions(&version_updates)?;

    println!("\n{} Updating changelogs...\n", style("→").blue().bold());

    changelog::write_changelogs(
        &workspace,
        &release_plan.releases,
        &changesets,
        config.changelog.format,
    )?;

    for release in &release_plan.releases {
        println!(
            "  {} Updated CHANGELOG.md for {}",
            style("✓").green(),
            style(&release.name).cyan()
        );
    }

    println!("\n{} Removing changesets...\n", style("→").blue().bold());

    for cs in &changesets {
        changeset::delete(&changeset_dir, &cs.id)?;
        println!(
            "  {} Deleted {}",
            style("✓").green(),
            style(format!("{}.md", cs.id)).dim()
        );
    }

    println!(
        "\n{} {} package(s) updated",
        style("✓").green().bold(),
        release_plan.releases.len()
    );

    Ok(())
}
