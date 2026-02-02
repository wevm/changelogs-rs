use crate::ecosystem::EcosystemKind;
use crate::error::{Error, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub ecosystem: EcosystemType,

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

    #[serde(default)]
    pub ai: AiConfig,

    #[serde(default)]
    pub python: PythonConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum EcosystemType {
    #[default]
    Auto,
    Cargo,
    Python,
}

impl From<EcosystemType> for EcosystemKind {
    fn from(t: EcosystemType) -> Self {
        match t {
            EcosystemType::Auto => EcosystemKind::Auto,
            EcosystemType::Cargo => EcosystemKind::Cargo,
            EcosystemType::Python => EcosystemKind::Python,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PythonConfig {
    pub version_file: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiConfig {
    pub command: Option<String>,
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
    PerPkg,
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
    ChangelogFormat::PerPkg
}

impl Default for Config {
    fn default() -> Self {
        Self {
            ecosystem: EcosystemType::default(),
            dependent_bump: default_dependent_bump(),
            changelog: ChangelogConfig::default(),
            fixed: Vec::new(),
            linked: Vec::new(),
            ignore: Vec::new(),
            ai: AiConfig::default(),
            python: PythonConfig::default(),
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
        r#"# Ecosystem detection: "auto" | "cargo" | "python"
# Auto-detects based on Cargo.toml, pyproject.toml, or setup.cfg
ecosystem = "auto"

# How to bump packages that depend on changed packages
# "patch" | "minor" | "none"
dependent_bump = "patch"

[changelog]
# "per-pkg" - CHANGELOG.md in each package
# "root" - Single CHANGELOG.md at workspace root
format = "per-pkg"

# Fixed groups: all packages always share the same version
# [[fixed]]
# members = ["pkg-a", "pkg-b"]

# Linked groups: versions sync when released together
# [[linked]]
# members = ["sdk-core", "sdk-macros"]

# Packages to ignore
ignore = []

# AI-assisted changelog generation
# [ai]
# command = "amp ask"  # or "gh copilot suggest -t shell"

# Python-specific settings
# [python]
# version_file = "src/mypackage/__init__.py"  # Additional file to update with version
"#
    }
}
