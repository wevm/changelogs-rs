use crate::ecosystems::{self, Ecosystem, Package};
use crate::error::{Error, Result};
use semver::Version;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct Workspace {
    pub root: PathBuf,
    pub changelog_dir: PathBuf,
    pub packages: Vec<Package>,
    pub ecosystem: Ecosystem,
}

pub type WorkspacePackage = Package;

impl Workspace {
    pub fn discover() -> Result<Self> {
        Self::discover_with_ecosystem(None)
    }

    pub fn discover_with_ecosystem(ecosystem: Option<Ecosystem>) -> Result<Self> {
        let cwd = std::env::current_dir()?;

        let ecosystem = ecosystem
            .or_else(|| ecosystems::detect_ecosystem(&cwd))
            .ok_or(Error::NotInWorkspace)?;

        let root = Self::find_root(&cwd, ecosystem)?;
        let packages = ecosystems::discover_packages(ecosystem, &root)?;

        if packages.is_empty() {
            return Err(Error::NotInWorkspace);
        }

        let changelog_dir = root.join(".changelog");

        Ok(Workspace {
            root,
            changelog_dir,
            packages,
            ecosystem,
        })
    }

    fn find_root(start: &Path, ecosystem: Ecosystem) -> Result<PathBuf> {
        let manifest_name = match ecosystem {
            Ecosystem::Rust => "Cargo.toml",
            Ecosystem::Python => "pyproject.toml",
            Ecosystem::TypeScript => "package.json",
        };

        let mut current = start.to_path_buf();

        loop {
            let manifest = current.join(manifest_name);
            if manifest.exists() {
                if ecosystem == Ecosystem::Rust {
                    if let Ok(content) = std::fs::read_to_string(&manifest) {
                        if content.contains("[workspace]") {
                            return Ok(current);
                        }
                    }
                }

                let parent = current.parent();
                if parent.is_none() {
                    return Ok(current);
                }

                let parent_manifest = parent.unwrap().join(manifest_name);
                if !parent_manifest.exists() {
                    return Ok(current);
                }

                if ecosystem == Ecosystem::Rust {
                    if let Ok(content) = std::fs::read_to_string(&parent_manifest) {
                        if content.contains("[workspace]") {
                            current = parent.unwrap().to_path_buf();
                            continue;
                        }
                    }
                }

                return Ok(current);
            }

            match current.parent() {
                Some(parent) => current = parent.to_path_buf(),
                None => return Err(Error::NotInWorkspace),
            }
        }
    }

    pub fn load() -> Result<Self> {
        Self::discover()
    }

    pub fn load_with_ecosystem(ecosystem: Option<Ecosystem>) -> Result<Self> {
        Self::discover_with_ecosystem(ecosystem)
    }

    pub fn changelog_dir(&self) -> PathBuf {
        self.root.join(".changelog")
    }

    pub fn get_publishable_packages(&self) -> Result<Vec<&Package>> {
        let mut publishable = Vec::new();

        for pkg in &self.packages {
            let is_published = ecosystems::is_published(self.ecosystem, &pkg.name, &pkg.version)?;

            if !is_published {
                publishable.push(pkg);
            }
        }

        Ok(publishable)
    }

    pub fn is_initialized(&self) -> bool {
        self.changelog_dir().exists()
    }

    pub fn get_package(&self, name: &str) -> Option<&Package> {
        self.packages.iter().find(|p| p.name == name)
    }

    pub fn package_names(&self) -> Vec<&str> {
        self.packages.iter().map(|p| p.name.as_str()).collect()
    }

    pub fn update_version(&self, package_name: &str, new_version: &Version) -> Result<()> {
        let package = self
            .get_package(package_name)
            .ok_or_else(|| Error::PackageNotFound(package_name.to_string()))?;

        ecosystems::write_version(self.ecosystem, &package.manifest_path, new_version)
    }

    pub fn update_dependency_versions(&self, updates: &HashMap<String, Version>) -> Result<()> {
        ecosystems::update_dependency_versions(self.ecosystem, &self.packages, &self.root, updates)
    }

    pub fn publish_package(
        &self,
        pkg: &Package,
        dry_run: bool,
        registry: Option<&str>,
    ) -> Result<bool> {
        ecosystems::publish(self.ecosystem, pkg, dry_run, registry)
    }

    pub fn tag_name(&self, pkg: &Package) -> String {
        ecosystems::tag_name(self.ecosystem, pkg)
    }
}
