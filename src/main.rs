use anyhow::Result;
use clap::{Parser, Subcommand};

mod cli;

#[derive(Parser)]
#[command(name = "changesets")]
#[command(about = "Manage versioning and changelogs for Cargo workspaces")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize changesets in this workspace
    Init,

    /// Create a new changeset
    Add {
        /// Create an empty changeset (no packages)
        #[arg(long)]
        empty: bool,
    },

    /// Show pending changesets and releases
    Status {
        /// Show detailed changeset contents
        #[arg(long)]
        verbose: bool,
    },

    /// Apply version bumps and update changelogs
    Version,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init => cli::init::run()?,
        Commands::Add { empty } => cli::add::run(empty)?,
        Commands::Status { verbose } => cli::status::run(verbose)?,
        Commands::Version => cli::version::run()?,
    }

    Ok(())
}
