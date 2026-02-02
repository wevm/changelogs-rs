use crate::config::Config;
use crate::ecosystem::{get_ecosystem, Ecosystem, EcosystemKind, PackageInfo};
use crate::error::{Error, Result};
use crate::version_editor;
use semver::Version;
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug)]
pub struct Workspace {
    pub root: PathBuf,
    pub changelog_dir: PathBuf,
    pub packages: Vec<WorkspacePackage>,
    ecosystem: Box<dyn Ecosystem>,
}

#[derive(Debug, Clone)]
pub struct WorkspacePackage {
    pub name: String,
    pub version: Version,
    pub version_string: String,
    pub path: PathBuf,
    pub manifest_path: PathBuf,
    pub dependencies: Vec<String>,
    pub info: PackageInfo,
}

impl WorkspacePackage {
    fn from_package_info(info: PackageInfo) -> Result<Self> {
        let version = info
            .version
            .parse()
            .unwrap_or_else(|_| Version::new(0, 0, 0));

        Ok(Self {
            name: info.name.clone(),
            version,
            version_string: info.version.clone(),
            path: info.path.clone(),
            manifest_path: info.manifest_path.clone(),
            dependencies: info.dependencies.clone(),
            info,
        })
    }
}

impl Workspace {
    pub fn discover() -> Result<Self> {
        let cwd = std::env::current_dir()?;
        Self::discover_from(&cwd, None)
    }

    pub fn discover_with_config(config: &Config) -> Result<Self> {
        let cwd = std::env::current_dir()?;
        Self::discover_from(&cwd, Some(config))
    }

    fn discover_from(start: &PathBuf, config: Option<&Config>) -> Result<Self> {
        let root = Self::find_root(start)?;

        let ecosystem_kind = config
            .map(|c| c.ecosystem.into())
            .unwrap_or(EcosystemKind::Auto);

        let ecosystem =
            get_ecosystem(ecosystem_kind, &root).ok_or_else(|| Error::NoEcosystemFound)?;

        let mut package_infos = ecosystem.discover(&root)?;

        if let Some(cfg) = config {
            if let Some(ref version_file) = cfg.python.version_file {
                for info in &mut package_infos {
                    let abs_path = if version_file.is_absolute() {
                        version_file.clone()
                    } else {
                        root.join(version_file)
                    };
                    if abs_path.exists() {
                        info.version_targets
                            .push(crate::ecosystem::VersionTarget::Regex {
                                file: abs_path,
                                pattern: r#"__version__\s*=\s*["']([^"']+)["']"#.to_string(),
                            });
                    }
                }
            }
        }

        let packages: Result<Vec<_>> = package_infos
            .into_iter()
            .map(WorkspacePackage::from_package_info)
            .collect();

        let packages = packages?;
        let changelog_dir = root.join(".changelog");

        Ok(Workspace {
            root,
            changelog_dir,
            packages,
            ecosystem,
        })
    }

    fn find_root(start: &PathBuf) -> Result<PathBuf> {
        let mut current = start.clone();
        loop {
            if current.join("Cargo.toml").exists()
                || current.join("pyproject.toml").exists()
                || current.join("setup.cfg").exists()
            {
                return Ok(current);
            }

            if !current.pop() {
                return Err(Error::NoEcosystemFound);
            }
        }
    }

    pub fn load() -> Result<Self> {
        Self::discover()
    }

    pub fn changelog_dir(&self) -> PathBuf {
        self.root.join(".changelog")
    }

    pub fn get_publishable_packages(&self) -> Result<Vec<&WorkspacePackage>> {
        let mut publishable = Vec::new();

        for pkg in &self.packages {
            if !self.ecosystem.is_published(&pkg.info)? {
                publishable.push(pkg);
            }
        }

        Ok(publishable)
    }

    pub fn is_initialized(&self) -> bool {
        self.changelog_dir().exists()
    }

    pub fn get_package(&self, name: &str) -> Option<&WorkspacePackage> {
        self.packages.iter().find(|p| p.name == name)
    }

    pub fn package_names(&self) -> Vec<&str> {
        self.packages.iter().map(|p| p.name.as_str()).collect()
    }

    pub fn update_version(&self, package_name: &str, new_version: &Version) -> Result<()> {
        let package = self
            .get_package(package_name)
            .ok_or_else(|| Error::PackageNotFound(package_name.to_string()))?;

        version_editor::update_all_targets(&package.info.version_targets, &new_version.to_string())
    }

    pub fn update_dependency_versions(&self, updates: &HashMap<String, Version>) -> Result<()> {
        let string_updates: HashMap<String, String> = updates
            .iter()
            .map(|(k, v)| (k.clone(), v.to_string()))
            .collect();

        let package_infos: Vec<_> = self.packages.iter().map(|p| p.info.clone()).collect();

        self.ecosystem
            .update_dependency_versions(&self.root, &package_infos, &string_updates)
    }

    pub fn publish_package(
        &self,
        package_name: &str,
        dry_run: bool,
        tag: Option<&str>,
    ) -> Result<()> {
        let package = self
            .get_package(package_name)
            .ok_or_else(|| Error::PackageNotFound(package_name.to_string()))?;

        self.ecosystem.publish(&package.info, dry_run, tag)
    }

    pub fn ecosystem_kind(&self) -> EcosystemKind {
        self.ecosystem.kind()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_workspace_package_from_info() {
        let info = PackageInfo {
            name: "test-pkg".to_string(),
            version: "1.2.3".to_string(),
            path: PathBuf::from("/test"),
            manifest_path: PathBuf::from("/test/pyproject.toml"),
            version_targets: vec![],
            dependencies: vec!["dep1".to_string()],
        };

        let pkg = WorkspacePackage::from_package_info(info).unwrap();

        assert_eq!(pkg.name, "test-pkg");
        assert_eq!(pkg.version, Version::new(1, 2, 3));
        assert_eq!(pkg.version_string, "1.2.3");
        assert_eq!(pkg.dependencies, vec!["dep1"]);
    }

    #[test]
    fn test_workspace_package_non_semver_version() {
        let info = PackageInfo {
            name: "py-pkg".to_string(),
            version: "2024.1.post1".to_string(),
            path: PathBuf::from("/test"),
            manifest_path: PathBuf::from("/test/pyproject.toml"),
            version_targets: vec![],
            dependencies: vec![],
        };

        let pkg = WorkspacePackage::from_package_info(info).unwrap();

        assert_eq!(pkg.version, Version::new(0, 0, 0));
        assert_eq!(pkg.version_string, "2024.1.post1");
    }

    #[test]
    fn test_find_root_with_pyproject() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            "[project]\nname = \"test\"\nversion = \"1.0.0\"",
        )
        .unwrap();

        let result = Workspace::find_root(&dir.path().to_path_buf());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), dir.path());
    }

    #[test]
    fn test_find_root_with_cargo() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Cargo.toml"), "[package]\nname = \"test\"").unwrap();

        let result = Workspace::find_root(&dir.path().to_path_buf());
        assert!(result.is_ok());
    }

    #[test]
    fn test_find_root_not_found() {
        let dir = TempDir::new().unwrap();

        let result = Workspace::find_root(&dir.path().to_path_buf());
        assert!(result.is_err());
    }
}
