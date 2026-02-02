pub mod changelog_entry;
pub mod changelog_writer;
pub mod config;
pub mod ecosystem;
pub mod error;
pub mod graph;
pub mod plan;
pub mod version_editor;
pub mod workspace;

use serde::{Deserialize, Serialize};

pub use changelog_entry::{Changelog, Release};
pub use config::Config;
pub use plan::{PackageRelease, ReleasePlan};
pub use workspace::{Workspace, WorkspacePackage as Package};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BumpType {
    Patch,
    Minor,
    Major,
}

impl std::fmt::Display for BumpType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BumpType::Patch => write!(f, "patch"),
            BumpType::Minor => write!(f, "minor"),
            BumpType::Major => write!(f, "major"),
        }
    }
}

impl std::str::FromStr for BumpType {
    type Err = error::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "patch" => Ok(BumpType::Patch),
            "minor" => Ok(BumpType::Minor),
            "major" => Ok(BumpType::Major),
            _ => Err(error::Error::InvalidBumpType(s.to_string())),
        }
    }
}
