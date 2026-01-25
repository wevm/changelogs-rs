use changesets::changeset;
use changesets::config::Config;
use changesets::error::Error;
use changesets::plan;
use changesets::workspace::Workspace;
use changesets::BumpType;
use anyhow::Result;
use console::style;

pub fn run(verbose: bool) -> Result<()> {
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

    println!(
        "{} {} changeset(s) found\n",
        style("ℹ").blue().bold(),
        changesets.len()
    );

    if verbose {
        println!("{}", style("Changesets:").bold().underlined());
        for cs in &changesets {
            println!("\n  {} {}", style("•").dim(), style(&cs.id).cyan());
            for release in &cs.releases {
                println!(
                    "    {} {} ({})",
                    style("→").dim(),
                    release.package,
                    style(release.bump.to_string()).yellow()
                );
            }
            if !cs.summary.is_empty() {
                println!("    {}", style(&cs.summary).dim());
            }
        }
        println!();
    }

    if release_plan.releases.is_empty() {
        println!("{} No packages will be released", style("ℹ").blue().bold());
        return Ok(());
    }

    println!("{}", style("Releases:").bold().underlined());
    for release in &release_plan.releases {
        let bump_style = match release.bump {
            BumpType::Major => style(release.bump.to_string()).red().bold(),
            BumpType::Minor => style(release.bump.to_string()).yellow(),
            BumpType::Patch => style(release.bump.to_string()).dim(),
        };

        println!(
            "  {} {} {} → {} ({})",
            style("•").dim(),
            style(&release.name).cyan(),
            style(&release.old_version.to_string()).dim(),
            style(&release.new_version.to_string()).green(),
            bump_style
        );
    }

    Ok(())
}
