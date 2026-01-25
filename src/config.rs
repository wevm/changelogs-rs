use crate::error::{Error, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_dependent_bump")]
    pub dependent_bump: DependentBump,

    #[serde(default)]
    pub changelog: ChangelogConfig,

    #[serde(default)]
    pub fixed: Vec<FixedGroup>,

    #[serde(default)]
    pub linked: Vec<LinkedGroup>,

    #[serde(default)]
    pub ignore: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum DependentBump {
    #[default]
    Patch,
    Minor,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangelogConfig {
    #[serde(default = "default_changelog_format")]
    pub format: ChangelogFormat,
}

impl Default for ChangelogConfig {
    fn default() -> Self {
        Self {
            format: default_changelog_format(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ChangelogFormat {
    #[default]
    PerCrate,
    Root,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedGroup {
    pub members: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedGroup {
    pub members: Vec<String>,
}

fn default_dependent_bump() -> DependentBump {
    DependentBump::Patch
}

fn default_changelog_format() -> ChangelogFormat {
    ChangelogFormat::PerCrate
}

impl Default for Config {
    fn default() -> Self {
        Self {
            dependent_bump: default_dependent_bump(),
            changelog: ChangelogConfig::default(),
            fixed: Vec::new(),
            linked: Vec::new(),
            ignore: Vec::new(),
        }
    }
}

impl Config {
    pub fn load(changelog_dir: &Path) -> Result<Self> {
        let config_path = changelog_dir.join("config.toml");

        if !config_path.exists() {
            return Ok(Self::default());
        }

        let content = std::fs::read_to_string(&config_path)?;
        let config: Config = toml::from_str(&content).map_err(|e| Error::ConfigParse(e.to_string()))?;

        Ok(config)
    }

    pub fn save(&self, changelog_dir: &Path) -> Result<()> {
        let config_path = changelog_dir.join("config.toml");
        let content = toml::to_string_pretty(self).map_err(|e| Error::ConfigParse(e.to_string()))?;
        std::fs::write(config_path, content)?;
        Ok(())
    }

    pub fn default_toml() -> &'static str {
        r#"# How to bump packages that depend on changed packages
# "patch" | "minor" | "none"
dependent_bump = "patch"

[changelog]
# "per-crate" - CHANGELOG.md in each crate
# "root" - Single CHANGELOG.md at workspace root
format = "per-crate"

# Fixed groups: all crates always share the same version
# [[fixed]]
# members = ["crate-a", "crate-b"]

# Linked groups: versions sync when released together
# [[linked]]
# members = ["sdk-core", "sdk-macros"]

# Packages to ignore
ignore = []
"#
    }
}
