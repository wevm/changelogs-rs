use crate::ecosystems::{Ecosystem, EcosystemAdapter, Package};
use crate::error::{Error, Result};
use semver::Version;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;

pub struct TypeScriptAdapter;

#[derive(Debug, Deserialize)]
struct PackageJson {
    name: Option<String>,
    version: Option<String>,
    #[serde(default)]
    dependencies: HashMap<String, String>,
    #[serde(rename = "devDependencies", default)]
    dev_dependencies: HashMap<String, String>,
    #[serde(rename = "peerDependencies", default)]
    peer_dependencies: HashMap<String, String>,
    #[serde(default)]
    workspaces: Workspaces,
    #[serde(default)]
    private: bool,
}

#[derive(Debug, Deserialize, Default)]
#[serde(untagged)]
enum Workspaces {
    #[default]
    None,
    Array(Vec<String>),
    Object {
        packages: Vec<String>,
    },
}

impl Workspaces {
    fn patterns(&self) -> Vec<&str> {
        match self {
            Workspaces::None => vec![],
            Workspaces::Array(arr) => arr.iter().map(|s| s.as_str()).collect(),
            Workspaces::Object { packages } => packages.iter().map(|s| s.as_str()).collect(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct PnpmWorkspace {
    packages: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackageManager {
    Npm,
    Pnpm,
    Yarn,
    Bun,
}

impl PackageManager {
    fn detect(root: &Path) -> Self {
        if root.join("bun.lockb").exists() || root.join("bun.lock").exists() {
            PackageManager::Bun
        } else if root.join("pnpm-lock.yaml").exists() {
            PackageManager::Pnpm
        } else if root.join("yarn.lock").exists() {
            PackageManager::Yarn
        } else {
            PackageManager::Npm
        }
    }

    fn publish_command(&self) -> (&str, Vec<&str>) {
        match self {
            PackageManager::Npm => ("npm", vec!["publish"]),
            PackageManager::Pnpm => ("pnpm", vec!["publish"]),
            PackageManager::Yarn => ("yarn", vec!["npm", "publish"]),
            PackageManager::Bun => ("bun", vec!["publish"]),
        }
    }
}

impl EcosystemAdapter for TypeScriptAdapter {
    fn ecosystem() -> Ecosystem {
        Ecosystem::TypeScript
    }

    fn discover(root: &Path) -> Result<Vec<Package>> {
        let package_json_path = root.join("package.json");

        if !package_json_path.exists() {
            return Err(Error::TypeScriptProjectNotFound(format!(
                "No package.json found at {}",
                root.display()
            )));
        }

        let workspace_patterns = Self::get_workspace_patterns(root)?;

        if workspace_patterns.is_empty() {
            return Self::discover_single_package(root, &package_json_path);
        }

        Self::discover_workspace_packages(root, &workspace_patterns)
    }

    fn read_version(manifest_path: &Path) -> Result<Version> {
        let content = fs::read_to_string(manifest_path)?;
        let pkg: PackageJson = serde_json::from_str(&content)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        let version_str = pkg.version.ok_or_else(|| {
            Error::VersionNotFound(manifest_path.display().to_string())
        })?;

        Ok(version_str.parse()?)
    }

    fn write_version(manifest_path: &Path, version: &Version) -> Result<()> {
        let content = fs::read_to_string(manifest_path)?;
        let mut json: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        json["version"] = serde_json::Value::String(version.to_string());

        let new_content = serde_json::to_string_pretty(&json)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        fs::write(manifest_path, new_content + "\n")?;
        Ok(())
    }

    fn update_dependency_version(
        manifest_path: &Path,
        dep_name: &str,
        new_version: &Version,
    ) -> Result<bool> {
        let content = fs::read_to_string(manifest_path)?;
        let mut json: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        let mut modified = false;
        let version_str = format!("^{}", new_version);

        for section in ["dependencies", "devDependencies", "peerDependencies"] {
            if let Some(deps) = json.get_mut(section).and_then(|d| d.as_object_mut()) {
                if deps.contains_key(dep_name) {
                    deps.insert(dep_name.to_string(), serde_json::Value::String(version_str.clone()));
                    modified = true;
                }
            }
        }

        if modified {
            let new_content = serde_json::to_string_pretty(&json)
                .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;
            fs::write(manifest_path, new_content + "\n")?;
        }

        Ok(modified)
    }

    fn is_published(name: &str, version: &Version) -> Result<bool> {
        let encoded_name = name.replace('/', "%2F");
        let url = format!("https://registry.npmjs.org/{}/{}", encoded_name, version);

        match ureq::get(&url).call() {
            Ok(_) => Ok(true),
            Err(ureq::Error::Status(404, _)) => Ok(false),
            Err(e) => Err(Error::NpmCheckFailed(e.to_string())),
        }
    }

    fn publish(pkg: &Package, dry_run: bool, registry: Option<&str>) -> Result<bool> {
        if dry_run {
            return Ok(true);
        }

        let root = pkg.path.parent().unwrap_or(&pkg.path);
        let pm = PackageManager::detect(root);
        let (cmd, base_args) = pm.publish_command();

        let mut command = Command::new(cmd);
        command.args(&base_args);
        command.current_dir(&pkg.path);

        if pkg.name.starts_with('@') {
            command.arg("--access").arg("public");
        }

        if let Some(reg) = registry {
            command.arg("--registry").arg(reg);
        }

        let output = command.output()?;

        if output.status.success() {
            return Ok(true);
        }

        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("already exists")
            || stderr.contains("cannot publish over")
            || stderr.contains("You cannot publish over the previously published versions")
        {
            return Ok(true);
        }

        Err(Error::PublishFailed(format!(
            "{} publish failed: {}",
            cmd, stderr
        )))
    }
}

impl TypeScriptAdapter {
    fn get_workspace_patterns(root: &Path) -> Result<Vec<String>> {
        let pnpm_workspace = root.join("pnpm-workspace.yaml");
        if pnpm_workspace.exists() {
            let content = fs::read_to_string(&pnpm_workspace)?;
            let workspace: PnpmWorkspace = serde_yaml::from_str(&content)?;
            return Ok(workspace.packages);
        }

        let package_json_path = root.join("package.json");
        if package_json_path.exists() {
            let content = fs::read_to_string(&package_json_path)?;
            let pkg: PackageJson = serde_json::from_str(&content)
                .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;
            return Ok(pkg.workspaces.patterns().into_iter().map(String::from).collect());
        }

        Ok(vec![])
    }

    fn discover_single_package(root: &Path, package_json_path: &Path) -> Result<Vec<Package>> {
        let content = fs::read_to_string(package_json_path)?;
        let pkg: PackageJson = serde_json::from_str(&content)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        let name = pkg.name.ok_or_else(|| {
            Error::InvalidPackageJson("missing 'name' field".to_string())
        })?;

        let version_str = pkg.version.ok_or_else(|| {
            Error::VersionNotFound(package_json_path.display().to_string())
        })?;

        let version: Version = version_str.parse()?;

        Ok(vec![Package {
            name,
            version,
            path: root.to_path_buf(),
            manifest_path: package_json_path.to_path_buf(),
            dependencies: vec![],
        }])
    }

    fn discover_workspace_packages(root: &Path, patterns: &[String]) -> Result<Vec<Package>> {
        let mut packages = Vec::new();
        let mut all_package_names: std::collections::HashSet<String> = std::collections::HashSet::new();

        for pattern in patterns {
            let full_pattern = root.join(pattern).join("package.json");
            let pattern_str = full_pattern.to_string_lossy();

            let paths = glob::glob(&pattern_str)
                .map_err(|e| Error::InvalidPackageJson(format!("invalid glob pattern: {}", e)))?;

            for entry in paths.flatten() {
                if let Some(pkg) = Self::parse_package(&entry, &mut all_package_names)? {
                    packages.push(pkg);
                }
            }
        }

        Self::resolve_internal_dependencies(&mut packages, &all_package_names);

        Ok(packages)
    }

    fn parse_package(
        manifest_path: &Path,
        all_names: &mut std::collections::HashSet<String>,
    ) -> Result<Option<Package>> {
        let content = fs::read_to_string(manifest_path)?;
        let pkg: PackageJson = serde_json::from_str(&content)
            .map_err(|e| Error::InvalidPackageJson(e.to_string()))?;

        let Some(name) = pkg.name else {
            return Ok(None);
        };

        if pkg.private {
            all_names.insert(name);
            return Ok(None);
        }

        let version_str = match pkg.version {
            Some(v) => v,
            None => return Ok(None),
        };

        let version: Version = match version_str.parse() {
            Ok(v) => v,
            Err(_) => return Ok(None),
        };

        let path = manifest_path.parent().unwrap().to_path_buf();

        all_names.insert(name.clone());

        Ok(Some(Package {
            name,
            version,
            path,
            manifest_path: manifest_path.to_path_buf(),
            dependencies: vec![],
        }))
    }

    fn resolve_internal_dependencies(
        packages: &mut [Package],
        all_package_names: &std::collections::HashSet<String>,
    ) {
        for package in packages.iter_mut() {
            let content = match fs::read_to_string(&package.manifest_path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let pkg: PackageJson = match serde_json::from_str(&content) {
                Ok(p) => p,
                Err(_) => continue,
            };

            let mut deps = Vec::new();
            for dep_name in pkg.dependencies.keys() {
                if all_package_names.contains(dep_name) {
                    deps.push(dep_name.clone());
                }
            }
            for dep_name in pkg.dev_dependencies.keys() {
                if all_package_names.contains(dep_name) && !deps.contains(dep_name) {
                    deps.push(dep_name.clone());
                }
            }
            for dep_name in pkg.peer_dependencies.keys() {
                if all_package_names.contains(dep_name) && !deps.contains(dep_name) {
                    deps.push(dep_name.clone());
                }
            }

            package.dependencies = deps;
        }
    }

    pub fn update_all_dependency_versions(
        packages: &[Package],
        _root: &Path,
        updates: &HashMap<String, Version>,
    ) -> Result<()> {
        for package in packages {
            for (dep_name, new_version) in updates {
                Self::update_dependency_version(&package.manifest_path, dep_name, new_version)?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_package_json(dir: &Path, content: &str) -> std::path::PathBuf {
        let path = dir.join("package.json");
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn discover_single_package() {
        let tmp = TempDir::new().unwrap();
        create_package_json(
            tmp.path(),
            r#"{
  "name": "my-package",
  "version": "1.0.0"
}"#,
        );

        let packages = TypeScriptAdapter::discover(tmp.path()).unwrap();
        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "my-package");
        assert_eq!(packages[0].version.to_string(), "1.0.0");
    }

    #[test]
    fn discover_scoped_package() {
        let tmp = TempDir::new().unwrap();
        create_package_json(
            tmp.path(),
            r#"{
  "name": "@org/my-package",
  "version": "2.0.0"
}"#,
        );

        let packages = TypeScriptAdapter::discover(tmp.path()).unwrap();
        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "@org/my-package");
    }

    #[test]
    fn read_and_write_version() {
        let tmp = TempDir::new().unwrap();
        let path = create_package_json(
            tmp.path(),
            r#"{
  "name": "my-package",
  "version": "1.0.0"
}"#,
        );

        let version = TypeScriptAdapter::read_version(&path).unwrap();
        assert_eq!(version.to_string(), "1.0.0");

        let new_version: Version = "2.0.0".parse().unwrap();
        TypeScriptAdapter::write_version(&path, &new_version).unwrap();

        let updated = TypeScriptAdapter::read_version(&path).unwrap();
        assert_eq!(updated.to_string(), "2.0.0");
    }

    #[test]
    fn update_dependency_version() {
        let tmp = TempDir::new().unwrap();
        let path = create_package_json(
            tmp.path(),
            r#"{
  "name": "my-package",
  "version": "1.0.0",
  "dependencies": {
    "other-pkg": "^1.0.0"
  }
}"#,
        );

        let new_version: Version = "2.0.0".parse().unwrap();
        let modified =
            TypeScriptAdapter::update_dependency_version(&path, "other-pkg", &new_version).unwrap();
        assert!(modified);

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("\"other-pkg\": \"^2.0.0\""));
    }

    #[test]
    fn discover_npm_workspaces() {
        let tmp = TempDir::new().unwrap();

        create_package_json(
            tmp.path(),
            r#"{
  "name": "root",
  "private": true,
  "workspaces": ["packages/*"]
}"#,
        );

        let pkg_a = tmp.path().join("packages/pkg-a");
        fs::create_dir_all(&pkg_a).unwrap();
        create_package_json(
            &pkg_a,
            r#"{
  "name": "@test/pkg-a",
  "version": "1.0.0"
}"#,
        );

        let pkg_b = tmp.path().join("packages/pkg-b");
        fs::create_dir_all(&pkg_b).unwrap();
        create_package_json(
            &pkg_b,
            r#"{
  "name": "@test/pkg-b",
  "version": "1.0.0",
  "dependencies": {
    "@test/pkg-a": "^1.0.0"
  }
}"#,
        );

        let packages = TypeScriptAdapter::discover(tmp.path()).unwrap();
        assert_eq!(packages.len(), 2);

        let pkg_b = packages.iter().find(|p| p.name == "@test/pkg-b").unwrap();
        assert!(pkg_b.dependencies.contains(&"@test/pkg-a".to_string()));
    }

    #[test]
    fn discover_pnpm_workspaces() {
        let tmp = TempDir::new().unwrap();

        create_package_json(
            tmp.path(),
            r#"{
  "name": "root",
  "private": true
}"#,
        );

        fs::write(
            tmp.path().join("pnpm-workspace.yaml"),
            "packages:\n  - 'packages/*'\n",
        )
        .unwrap();

        let pkg_a = tmp.path().join("packages/pkg-a");
        fs::create_dir_all(&pkg_a).unwrap();
        create_package_json(
            &pkg_a,
            r#"{
  "name": "pkg-a",
  "version": "1.0.0"
}"#,
        );

        let packages = TypeScriptAdapter::discover(tmp.path()).unwrap();
        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "pkg-a");
    }

    #[test]
    fn package_manager_detection() {
        let tmp = TempDir::new().unwrap();

        assert_eq!(PackageManager::detect(tmp.path()), PackageManager::Npm);

        fs::write(tmp.path().join("pnpm-lock.yaml"), "").unwrap();
        assert_eq!(PackageManager::detect(tmp.path()), PackageManager::Pnpm);

        fs::remove_file(tmp.path().join("pnpm-lock.yaml")).unwrap();
        fs::write(tmp.path().join("yarn.lock"), "").unwrap();
        assert_eq!(PackageManager::detect(tmp.path()), PackageManager::Yarn);

        fs::remove_file(tmp.path().join("yarn.lock")).unwrap();
        fs::write(tmp.path().join("bun.lockb"), "").unwrap();
        assert_eq!(PackageManager::detect(tmp.path()), PackageManager::Bun);
    }
}
