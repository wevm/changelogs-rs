use crate::ecosystems::{Ecosystem, EcosystemAdapter, Package, PublishResult};
use crate::error::Result;
use cargo_metadata::MetadataCommand;
use semver::Version;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use toml_edit::DocumentMut;

pub struct RustAdapter;

impl EcosystemAdapter for RustAdapter {
    fn ecosystem() -> Ecosystem {
        Ecosystem::Rust
    }

    fn discover(root: &Path) -> Result<Vec<Package>> {
        let metadata = MetadataCommand::new().current_dir(root).exec()?;

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

            packages.push(Package {
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

        Ok(packages)
    }

    fn read_version(manifest_path: &Path) -> Result<Version> {
        let content = std::fs::read_to_string(manifest_path)?;
        let doc: DocumentMut = content.parse()?;

        let version_str = doc["package"]["version"].as_str().ok_or_else(|| {
            crate::error::Error::VersionNotFound(manifest_path.display().to_string())
        })?;

        Ok(version_str.parse()?)
    }

    fn write_version(manifest_path: &Path, version: &Version) -> Result<()> {
        let content = std::fs::read_to_string(manifest_path)?;
        let mut doc: DocumentMut = content.parse()?;

        doc["package"]["version"] = toml_edit::value(version.to_string());

        std::fs::write(manifest_path, doc.to_string())?;
        Ok(())
    }

    fn update_dependency_version(
        manifest_path: &Path,
        dep_name: &str,
        new_version: &Version,
    ) -> Result<bool> {
        let content = std::fs::read_to_string(manifest_path)?;
        let mut doc: DocumentMut = content.parse()?;
        let mut modified = false;

        for section in &["dependencies", "dev-dependencies", "build-dependencies"] {
            let Some(dep) = doc.get_mut(section).and_then(|d| d.get_mut(dep_name)) else {
                continue;
            };
            modified |= Self::update_dep_version_in_item(dep, new_version);
        }

        if let Some(dep) = doc
            .get_mut("workspace")
            .and_then(|w| w.get_mut("dependencies"))
            .and_then(|d| d.get_mut(dep_name))
        {
            modified |= Self::update_dep_version_in_item(dep, new_version);
        }

        if modified {
            std::fs::write(manifest_path, doc.to_string())?;
        }

        Ok(modified)
    }

    fn is_published(name: &str, version: &Version) -> Result<bool> {
        let output = Command::new("cargo")
            .args(["search", "--limit", "1", name])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let is_published_with_same_version = stdout
            .lines()
            .next()
            .map(|line| line.contains(&format!("\"{}\"", version)))
            .unwrap_or(false);

        Ok(is_published_with_same_version)
    }

    fn publish(pkg: &Package, dry_run: bool, registry: Option<&str>) -> Result<PublishResult> {
        if dry_run {
            return Ok(PublishResult::Success);
        }

        match std::env::var("CARGO_REGISTRY_TOKEN") {
            Ok(token) if !token.is_empty() => {}
            _ => return Ok(PublishResult::Skipped),
        }

        let mut cmd = Command::new("cargo");
        cmd.arg("publish")
            .arg("--package")
            .arg(&pkg.name)
            .arg("--no-verify")
            .arg("--allow-dirty");

        if let Some(reg) = registry {
            cmd.env("CARGO_REGISTRY_DEFAULT", reg);
        }

        let output = cmd.output()?;

        if output.status.success() {
            return Ok(PublishResult::Success);
        }

        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("already uploaded") || stderr.contains("already exists") {
            return Ok(PublishResult::Success);
        }

        Err(crate::error::Error::PublishFailed(format!(
            "cargo publish failed: {}",
            stderr
        )))
    }
}

impl RustAdapter {
    fn update_dep_version_in_item(dep: &mut toml_edit::Item, new_version: &Version) -> bool {
        if let Some(table) = dep.as_inline_table_mut() {
            if table.contains_key("version") {
                table.insert("version", new_version.to_string().into());
                return true;
            }
        } else if let Some(table) = dep.as_table_mut() {
            if table.contains_key("version") {
                table["version"] = toml_edit::value(new_version.to_string());
                return true;
            }
        }
        false
    }

    pub fn update_all_dependency_versions(
        packages: &[Package],
        root: &Path,
        updates: &HashMap<String, Version>,
    ) -> Result<()> {
        for package in packages {
            for (dep_name, new_version) in updates {
                Self::update_dependency_version(&package.manifest_path, dep_name, new_version)?;
            }
        }

        let root_manifest = root.join("Cargo.toml");
        if !root_manifest.exists() {
            return Ok(());
        }

        let content = std::fs::read_to_string(&root_manifest)?;
        let mut doc: DocumentMut = content.parse()?;
        let mut modified = false;

        if let Some(deps) = doc
            .get_mut("workspace")
            .and_then(|w| w.get_mut("dependencies"))
            .and_then(|d| d.as_table_mut())
        {
            for (dep_name, new_version) in updates {
                if let Some(dep) = deps.get_mut(dep_name) {
                    modified |= Self::update_dep_version_in_item(dep, new_version);
                }
            }
        }

        if modified {
            std::fs::write(&root_manifest, doc.to_string())?;
        }

        Ok(())
    }
}
