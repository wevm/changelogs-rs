pub mod cargo;
pub mod python;

use crate::error::Result;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub enum VersionTarget {
    TomlKey {
        file: PathBuf,
        key_path: Vec<String>,
    },
    IniKey {
        file: PathBuf,
        section: String,
        key: String,
    },
    Regex {
        file: PathBuf,
        pattern: String,
    },
}

#[derive(Debug, Clone)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub path: PathBuf,
    pub manifest_path: PathBuf,
    pub version_targets: Vec<VersionTarget>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EcosystemKind {
    #[default]
    Auto,
    Cargo,
    Python,
}

pub trait Ecosystem: Send + Sync + std::fmt::Debug {
    fn kind(&self) -> EcosystemKind;

    fn discover(&self, root: &Path) -> Result<Vec<PackageInfo>>;

    fn update_dependency_versions(
        &self,
        root: &Path,
        packages: &[PackageInfo],
        updates: &HashMap<String, String>,
    ) -> Result<()>;

    fn is_published(&self, pkg: &PackageInfo) -> Result<bool>;

    fn publish(&self, pkg: &PackageInfo, dry_run: bool, tag: Option<&str>) -> Result<()>;
}

pub fn detect_ecosystem(root: &Path) -> Option<Box<dyn Ecosystem>> {
    if cargo::CargoEcosystem::detect(root) {
        return Some(Box::new(cargo::CargoEcosystem));
    }
    if python::PythonEcosystem::detect(root) {
        return Some(Box::new(python::PythonEcosystem::default()));
    }
    None
}

pub fn get_ecosystem(kind: EcosystemKind, root: &Path) -> Option<Box<dyn Ecosystem>> {
    match kind {
        EcosystemKind::Auto => detect_ecosystem(root),
        EcosystemKind::Cargo => {
            if cargo::CargoEcosystem::detect(root) {
                Some(Box::new(cargo::CargoEcosystem))
            } else {
                None
            }
        }
        EcosystemKind::Python => {
            if python::PythonEcosystem::detect(root) {
                Some(Box::new(python::PythonEcosystem::default()))
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_detect_cargo_ecosystem() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Cargo.toml"), "[workspace]\nmembers = []").unwrap();

        let ecosystem = detect_ecosystem(dir.path());
        assert!(ecosystem.is_some());
        assert_eq!(ecosystem.unwrap().kind(), EcosystemKind::Cargo);
    }

    #[test]
    fn test_detect_python_ecosystem() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            "[project]\nname = \"test\"\nversion = \"1.0.0\"",
        )
        .unwrap();

        let ecosystem = detect_ecosystem(dir.path());
        assert!(ecosystem.is_some());
        assert_eq!(ecosystem.unwrap().kind(), EcosystemKind::Python);
    }

    #[test]
    fn test_detect_no_ecosystem() {
        let dir = TempDir::new().unwrap();
        let ecosystem = detect_ecosystem(dir.path());
        assert!(ecosystem.is_none());
    }

    #[test]
    fn test_cargo_takes_precedence() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Cargo.toml"), "[workspace]\nmembers = []").unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            "[project]\nname = \"test\"",
        )
        .unwrap();

        let ecosystem = detect_ecosystem(dir.path());
        assert!(ecosystem.is_some());
        assert_eq!(ecosystem.unwrap().kind(), EcosystemKind::Cargo);
    }
}
