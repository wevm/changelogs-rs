use changelogs::changelog_entry;
use changelogs::error::Error;
use changelogs::workspace::Workspace;
use changelogs::{BumpType, Changelog, Release};
use anyhow::Result;
use console::style;
use inquire::{MultiSelect, Select, Text};

pub fn run(empty: bool) -> Result<()> {
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
        };
        changelog_entry::write(&changelog_dir, &cs)?;

        println!(
            "{} Created empty changelog: {}",
            style("✓").green().bold(),
            style(format!(".changelog/{}.md", id)).cyan()
        );
        return Ok(());
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
