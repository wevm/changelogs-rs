use super::{Ecosystem, EcosystemKind, PackageInfo, VersionTarget};
use crate::error::{Error, Result};
use cargo_metadata::MetadataCommand;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use toml_edit::DocumentMut;

#[derive(Debug)]
pub struct CargoEcosystem;

impl CargoEcosystem {
    pub fn detect(root: &Path) -> bool {
        root.join("Cargo.toml").exists()
    }
}

impl Ecosystem for CargoEcosystem {
    fn kind(&self) -> EcosystemKind {
        EcosystemKind::Cargo
    }

    fn discover(&self, root: &Path) -> Result<Vec<PackageInfo>> {
        let metadata = MetadataCommand::new()
            .manifest_path(root.join("Cargo.toml"))
            .exec()?;

        let workspace_members: std::collections::HashSet<_> =
            metadata.workspace_members.iter().collect();

        let mut packages = Vec::new();

        for package in &metadata.packages {
            if !workspace_members.contains(&package.id) {
                continue;
            }

            let manifest_path = package.manifest_path.clone().into_std_path_buf();
            let path = package
                .manifest_path
                .parent()
                .unwrap()
                .to_path_buf()
                .into_std_path_buf();

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

            let version_targets = vec![VersionTarget::TomlKey {
                file: manifest_path.clone(),
                key_path: vec!["package".to_string(), "version".to_string()],
            }];

            packages.push(PackageInfo {
                name: package.name.clone(),
                version: package.version.to_string(),
                path,
                manifest_path,
                version_targets,
                dependencies: deps,
            });
        }

        Ok(packages)
    }

    fn update_dependency_versions(
        &self,
        root: &Path,
        packages: &[PackageInfo],
        updates: &HashMap<String, String>,
    ) -> Result<()> {
        for package in packages {
            let content = std::fs::read_to_string(&package.manifest_path)?;
            let mut doc: DocumentMut = content.parse()?;
            let mut modified = false;

            for (dep_name, new_version) in updates {
                for section in &["dependencies", "dev-dependencies", "build-dependencies"] {
                    if let Some(deps) = doc.get_mut(section) {
                        if let Some(dep) = deps.get_mut(dep_name) {
                            if let Some(table) = dep.as_inline_table_mut() {
                                if table.contains_key("version") {
                                    table.insert("version", new_version.as_str().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.as_str());
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
                                    table.insert("version", new_version.as_str().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.as_str());
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

        let root_manifest = root.join("Cargo.toml");
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
                                    table.insert("version", new_version.as_str().into());
                                    modified = true;
                                }
                            } else if let Some(table) = dep.as_table_mut() {
                                if table.contains_key("version") {
                                    table["version"] = toml_edit::value(new_version.as_str());
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

    fn is_published(&self, pkg: &PackageInfo) -> Result<bool> {
        let output = Command::new("cargo")
            .args(["search", "--limit", "1", &pkg.name])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let is_published_with_same_version = stdout
            .lines()
            .next()
            .map(|line| line.contains(&format!("\"{}\"", pkg.version)))
            .unwrap_or(false);

        Ok(is_published_with_same_version)
    }

    fn publish(&self, pkg: &PackageInfo, dry_run: bool, tag: Option<&str>) -> Result<()> {
        let mut cmd = Command::new("cargo");
        cmd.args(["publish", "-p", &pkg.name]);

        if dry_run {
            cmd.arg("--dry-run");
        }

        if let Some(tag) = tag {
            cmd.args(["--registry", tag]);
        }

        let status = cmd.status()?;

        if !status.success() {
            return Err(Error::PublishFailed(pkg.name.clone()));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_detect_cargo_workspace() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("Cargo.toml"),
            r#"
[workspace]
members = ["crates/*"]
"#,
        )
        .unwrap();

        assert!(CargoEcosystem::detect(dir.path()));
    }

    #[test]
    fn test_detect_no_cargo() {
        let dir = TempDir::new().unwrap();
        assert!(!CargoEcosystem::detect(dir.path()));
    }

    #[test]
    fn test_version_target_structure() {
        let target = VersionTarget::TomlKey {
            file: PathBuf::from("/test/Cargo.toml"),
            key_path: vec!["package".to_string(), "version".to_string()],
        };

        match target {
            VersionTarget::TomlKey { file, key_path } => {
                assert_eq!(file, PathBuf::from("/test/Cargo.toml"));
                assert_eq!(key_path, vec!["package", "version"]);
            }
            _ => panic!("Expected TomlKey variant"),
        }
    }
}
