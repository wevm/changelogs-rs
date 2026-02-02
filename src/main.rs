use anyhow::Result;
use clap::{Parser, Subcommand};

mod cli;

#[derive(Parser)]
#[command(name = "changelogs")]
#[command(about = "Manage versioning and changelogs for Cargo and Python projects")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize changelogs in this workspace
    Init,

    /// Create a new changelog
    Add {
        /// Create an empty changelog (no packages)
        #[arg(long)]
        empty: bool,

        /// Use AI to generate the changelog from git diff
        #[arg(short = 'a', long)]
        ai: Option<String>,

        /// Custom instructions for AI generation
        #[arg(short = 'i', long)]
        instructions: Option<String>,

        /// Base ref to diff against (e.g. origin/main)
        #[arg(short = 'r', long = "ref")]
        base_ref: Option<String>,
    },

    /// Show pending changelogs and releases
    Status {
        /// Show detailed changelog contents
        #[arg(long)]
        verbose: bool,
    },

    /// Apply version bumps and update changelogs
    Version,

    /// Publish unpublished packages to their registry
    Publish {
        /// Perform a dry run without actually publishing
        #[arg(long)]
        dry_run: bool,

        /// Registry to publish to
        #[arg(long)]
        tag: Option<String>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init => cli::init::run()?,
        Commands::Add { empty, ai, instructions, base_ref } => cli::add::run(empty, ai, instructions, base_ref)?,
        Commands::Status { verbose } => cli::status::run(verbose)?,
        Commands::Version => cli::version::run()?,
        Commands::Publish { dry_run, tag } => cli::publish::run(dry_run, tag)?,
    }

    Ok(())
}
