use changesets::changeset;
use changesets::error::Error;
use changesets::workspace::Workspace;
use changesets::{BumpType, Changeset, Release};
use anyhow::Result;
use console::style;
use dialoguer::{theme::ColorfulTheme, Editor, MultiSelect, Select};

pub fn run(empty: bool) -> Result<()> {
    let workspace = Workspace::discover().map_err(|_| Error::NotInWorkspace)?;

    if !workspace.is_initialized() {
        return Err(Error::NotInitialized.into());
    }

    let changeset_dir = workspace.changeset_dir();

    if empty {
        let id = changeset::generate_id();
        let cs = Changeset {
            id: id.clone(),
            summary: String::new(),
            releases: Vec::new(),
        };
        changeset::write(&changeset_dir, &cs)?;

        println!(
            "{} Created empty changeset: {}",
            style("✓").green().bold(),
            style(format!(".changeset/{}.md", id)).cyan()
        );
        return Ok(());
    }

    let package_names: Vec<String> = workspace.package_names().iter().map(|s| s.to_string()).collect();

    if package_names.is_empty() {
        println!("{} No packages found in workspace", style("!").yellow().bold());
        return Ok(());
    }

    let theme = ColorfulTheme::default();

    println!("{}", style("Which packages would you like to include?").bold());

    let selected_indices = MultiSelect::with_theme(&theme)
        .items(&package_names)
        .interact()?;

    if selected_indices.is_empty() {
        return Err(Error::NoPackagesSelected.into());
    }

    let bump_options = ["patch", "minor", "major"];
    let mut releases = Vec::new();

    for idx in selected_indices {
        let package = &package_names[idx];

        println!(
            "\n{} {}",
            style("Bump type for").bold(),
            style(package).cyan()
        );

        let bump_idx = Select::with_theme(&theme)
            .items(&bump_options)
            .default(0)
            .interact()?;

        let bump = match bump_idx {
            0 => BumpType::Patch,
            1 => BumpType::Minor,
            2 => BumpType::Major,
            _ => unreachable!(),
        };

        releases.push(Release {
            package: package.clone(),
            bump,
        });
    }

    println!("\n{}", style("Please enter a summary for this changeset:").bold());
    println!("{}", style("(Opens your default editor)").dim());

    let summary = Editor::new()
        .extension(".md")
        .edit("")?
        .unwrap_or_default()
        .trim()
        .to_string();

    if summary.is_empty() {
        println!("{} Empty summary, changeset not created", style("!").yellow().bold());
        return Ok(());
    }

    let id = changeset::generate_id();
    let cs = Changeset {
        id: id.clone(),
        summary,
        releases,
    };

    changeset::write(&changeset_dir, &cs)?;

    println!(
        "\n{} Created changeset: {}",
        style("✓").green().bold(),
        style(format!(".changeset/{}.md", id)).cyan()
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
