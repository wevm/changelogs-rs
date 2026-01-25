use crate::error::{Error, Result};
use cargo_metadata::{Metadata, MetadataCommand};
use semver::Version;
use std::collections::HashMap;
use std::path::PathBuf;
use toml_edit::DocumentMut;

#[derive(Debug, Clone)]
pub struct Workspace {
    pub root: PathBuf,
    pub packages: Vec<WorkspacePackage>,
    #[allow(dead_code)]
    metadata: Metadata,
}

#[derive(Debug, Clone)]
pub struct WorkspacePackage {
    pub name: String,
    pub version: Version,
    pub path: PathBuf,
    pub manifest_path: PathBuf,
    pub dependencies: Vec<String>,
}

impl Workspace {
    pub fn discover() -> Result<Self> {
        let metadata = MetadataCommand::new().exec()?;

        let workspace_root = metadata.workspace_root.clone().into_std_path_buf();
        let workspace_members: std::collections::HashSet<_> =
            metadata.workspace_members.iter().collect();

        let mut packages = Vec::new();

        for package in &metadata.packages {
            if !workspace_members.contains(&package.id) {
                continue;
            }

            let deps: Vec<String> = package
                .dependencies
                .iter()
                .filter_map(|dep| {
                    metadata
                        .packages
                        .iter()
                        .find(|p| p.name == dep.name && workspace_members.contains(&p.id))
                        .map(|p| p.name.clone())
                })
                .collect();

            packages.push(WorkspacePackage {
                name: package.name.clone(),
                version: package.version.clone(),
                path: package
                    .manifest_path
                    .parent()
                    .unwrap()
                    .to_path_buf()
                    .into_std_path_buf(),
                manifest_path: package.manifest_path.clone().into_std_path_buf(),
                dependencies: deps,
            });
        }

        Ok(Workspace {
            root: workspace_root,
            packages,
            metadata,
        })
    }

    pub fn changeset_dir(&self) -> PathBuf {
        self.root.join(".changeset")
    }

    pub fn is_initialized(&self) -> bool {
        self.changeset_dir().exists()
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

        let content = std::fs::read_to_string(&package.manifest_path)?;
        let mut doc: DocumentMut = content.parse()?;

        doc["package"]["version"] = toml_edit::value(new_version.to_string());

        std::fs::write(&package.manifest_path, doc.to_string())?;
        Ok(())
    }

    pub fn update_dependency_versions(&self, updates: &HashMap<String, Version>) -> Result<()> {
        for package in &self.packages {
            let content = std::fs::read_to_string(&package.manifest_path)?;
            let mut doc: DocumentMut = content.parse()?;
            let mut modified = false;

            for (dep_name, new_version) in updates {
                for section in &["dependencies", "dev-dependencies", "build-dependencies"] {
                    if let Some(deps) = doc.get_mut(section) {
                        if let Some(dep) = deps.get_mut(dep_name) {
                            if let Some(table) = dep.as_inline_table_mut() {
                                if table.contains_key("version") {
                                    table.insert("version", new_version.to_string().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.to_string());
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }

            if let Some(workspace) = doc.get_mut("workspace") {
                if let Some(deps) = workspace.get_mut("dependencies") {
                    for (dep_name, new_version) in updates {
                        if let Some(dep) = deps.get_mut(dep_name) {
                            if let Some(table) = dep.as_inline_table_mut() {
                                if table.contains_key("version") {
                                    table.insert("version", new_version.to_string().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.to_string());
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }

            if modified {
                std::fs::write(&package.manifest_path, doc.to_string())?;
            }
        }

        let root_manifest = self.root.join("Cargo.toml");
        if root_manifest.exists() {
            let content = std::fs::read_to_string(&root_manifest)?;
            let mut doc: DocumentMut = content.parse()?;
            let mut modified = false;

            if let Some(workspace) = doc.get_mut("workspace") {
                if let Some(deps) = workspace.get_mut("dependencies") {
                    for (dep_name, new_version) in updates {
                        if let Some(dep) = deps.get_mut(dep_name) {
                            if let Some(table) = dep.as_inline_table_mut() {
                                if table.contains_key("version") {
                                    table.insert("version", new_version.to_string().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.to_string());
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }

            if modified {
                std::fs::write(&root_manifest, doc.to_string())?;
            }
        }

        Ok(())
    }
}
