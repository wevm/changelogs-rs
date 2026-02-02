use super::{Ecosystem, EcosystemKind, PackageInfo, VersionTarget};
use crate::error::{Error, Result};
use regex::Regex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use toml_edit::DocumentMut;

#[derive(Debug, Clone, Default)]
pub struct PythonEcosystem {
    pub version_file_override: Option<PathBuf>,
}

impl PythonEcosystem {
    pub fn detect(root: &Path) -> bool {
        root.join("pyproject.toml").exists()
            || root.join("setup.cfg").exists()
            || root.join("setup.py").exists()
    }

    pub fn with_version_file(version_file: PathBuf) -> Self {
        Self {
            version_file_override: Some(version_file),
        }
    }

    fn discover_from_pyproject(root: &Path) -> Result<Option<PackageInfo>> {
        let pyproject_path = root.join("pyproject.toml");
        if !pyproject_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&pyproject_path)?;
        let doc: DocumentMut = content.parse()?;

        let mut name = None;
        let mut version = None;
        let mut version_key_path = None;
        let mut is_dynamic = false;

        if let Some(project) = doc.get("project") {
            if let Some(dynamic) = project.get("dynamic") {
                if let Some(arr) = dynamic.as_array() {
                    is_dynamic = arr.iter().any(|v| v.as_str() == Some("version"));
                }
            }

            if !is_dynamic {
                if let Some(v) = project.get("version") {
                    version = v.as_str().map(String::from);
                    version_key_path = Some(vec!["project".to_string(), "version".to_string()]);
                }
            }

            if let Some(n) = project.get("name") {
                name = n.as_str().map(String::from);
            }
        }

        if version.is_none() || name.is_none() {
            if let Some(tool) = doc.get("tool") {
                if let Some(poetry) = tool.get("poetry") {
                    if name.is_none() {
                        if let Some(n) = poetry.get("name") {
                            name = n.as_str().map(String::from);
                        }
                    }
                    if version.is_none() {
                        if let Some(v) = poetry.get("version") {
                            version = v.as_str().map(String::from);
                            version_key_path = Some(vec![
                                "tool".to_string(),
                                "poetry".to_string(),
                                "version".to_string(),
                            ]);
                        }
                    }
                }
            }
        }

        let (name, version, key_path) = match (name, version, version_key_path) {
            (Some(n), Some(v), Some(kp)) => (n, v, kp),
            _ => {
                if is_dynamic {
                    return Err(Error::DynamicVersion(
                        "pyproject.toml has dynamic version - configure version_file in .changelog/config.toml".to_string(),
                    ));
                }
                return Ok(None);
            }
        };

        let version_targets = vec![VersionTarget::TomlKey {
            file: pyproject_path.clone(),
            key_path,
        }];

        let dependencies = Self::parse_pyproject_dependencies(&doc);

        Ok(Some(PackageInfo {
            name,
            version,
            path: root.to_path_buf(),
            manifest_path: pyproject_path,
            version_targets,
            dependencies,
        }))
    }

    fn parse_pyproject_dependencies(doc: &DocumentMut) -> Vec<String> {
        let mut deps = Vec::new();

        if let Some(project) = doc.get("project") {
            if let Some(dependencies) = project.get("dependencies") {
                if let Some(arr) = dependencies.as_array() {
                    for dep in arr.iter() {
                        if let Some(s) = dep.as_str() {
                            if let Some(name) = Self::parse_dependency_name(s) {
                                deps.push(name);
                            }
                        }
                    }
                }
            }
        }

        if let Some(tool) = doc.get("tool") {
            if let Some(poetry) = tool.get("poetry") {
                if let Some(dependencies) = poetry.get("dependencies") {
                    if let Some(table) = dependencies.as_table() {
                        for (name, _) in table.iter() {
                            if name != "python" {
                                deps.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }

        deps
    }

    fn parse_dependency_name(dep_spec: &str) -> Option<String> {
        let re = Regex::new(r"^([a-zA-Z0-9_-]+)").ok()?;
        re.captures(dep_spec)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    fn discover_from_setup_cfg(root: &Path) -> Result<Option<PackageInfo>> {
        let setup_cfg_path = root.join("setup.cfg");
        if !setup_cfg_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&setup_cfg_path)?;

        let mut name = None;
        let mut version = None;
        let mut in_metadata = false;

        for line in content.lines() {
            let trimmed = line.trim();

            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                in_metadata = trimmed == "[metadata]";
                continue;
            }

            if in_metadata {
                if let Some((key, value)) = trimmed.split_once('=') {
                    let key = key.trim();
                    let value = value.trim();

                    match key {
                        "name" => name = Some(value.to_string()),
                        "version" => {
                            if value.starts_with("attr:") || value.starts_with("file:") {
                                return Err(Error::DynamicVersion(
                                    "setup.cfg uses dynamic version - configure version_file in .changelog/config.toml".to_string(),
                                ));
                            }
                            version = Some(value.to_string());
                        }
                        _ => {}
                    }
                }
            }
        }

        let (name, version) = match (name, version) {
            (Some(n), Some(v)) => (n, v),
            _ => return Ok(None),
        };

        let version_targets = vec![VersionTarget::IniKey {
            file: setup_cfg_path.clone(),
            section: "metadata".to_string(),
            key: "version".to_string(),
        }];

        Ok(Some(PackageInfo {
            name,
            version,
            path: root.to_path_buf(),
            manifest_path: setup_cfg_path,
            version_targets,
            dependencies: Vec::new(),
        }))
    }

    fn add_version_file_target(pkg: &mut PackageInfo, version_file: &Path) -> Result<()> {
        if !version_file.exists() {
            return Err(Error::FileNotFound(version_file.display().to_string()));
        }

        pkg.version_targets.push(VersionTarget::Regex {
            file: version_file.to_path_buf(),
            pattern: r#"__version__\s*=\s*["']([^"']+)["']"#.to_string(),
        });

        Ok(())
    }
}

impl Ecosystem for PythonEcosystem {
    fn kind(&self) -> EcosystemKind {
        EcosystemKind::Python
    }

    fn discover(&self, root: &Path) -> Result<Vec<PackageInfo>> {
        let mut pkg = Self::discover_from_pyproject(root)?;

        if pkg.is_none() {
            pkg = Self::discover_from_setup_cfg(root)?;
        }

        if pkg.is_none() {
            if root.join("setup.py").exists() {
                return Err(Error::UnsupportedManifest(
                    "setup.py without pyproject.toml or setup.cfg is not supported. Please add a pyproject.toml with an explicit version.".to_string(),
                ));
            }
            return Ok(Vec::new());
        }

        let mut pkg = pkg.unwrap();

        if let Some(ref version_file) = self.version_file_override {
            let abs_path = if version_file.is_absolute() {
                version_file.clone()
            } else {
                root.join(version_file)
            };
            Self::add_version_file_target(&mut pkg, &abs_path)?;
        }

        Ok(vec![pkg])
    }

    fn update_dependency_versions(
        &self,
        _root: &Path,
        _packages: &[PackageInfo],
        _updates: &HashMap<String, String>,
    ) -> Result<()> {
        Ok(())
    }

    fn is_published(&self, pkg: &PackageInfo) -> Result<bool> {
        let output = Command::new("pip")
            .args(["index", "versions", &pkg.name])
            .output();

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(stdout.contains(&pkg.version))
            }
            Err(_) => Ok(false),
        }
    }

    fn publish(&self, pkg: &PackageInfo, dry_run: bool, _tag: Option<&str>) -> Result<()> {
        if dry_run {
            println!("Would publish {} v{}", pkg.name, pkg.version);
            return Ok(());
        }

        let build_status = Command::new("python")
            .args(["-m", "build"])
            .current_dir(&pkg.path)
            .status()?;

        if !build_status.success() {
            return Err(Error::PublishFailed(format!(
                "Failed to build {}",
                pkg.name
            )));
        }

        let upload_status = Command::new("twine")
            .args(["upload", "dist/*"])
            .current_dir(&pkg.path)
            .status()?;

        if !upload_status.success() {
            return Err(Error::PublishFailed(pkg.name.clone()));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_detect_pyproject() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            "[project]\nname = \"test\"\nversion = \"1.0.0\"",
        )
        .unwrap();

        assert!(PythonEcosystem::detect(dir.path()));
    }

    #[test]
    fn test_detect_setup_cfg() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("setup.cfg"),
            "[metadata]\nname = test\nversion = 1.0.0",
        )
        .unwrap();

        assert!(PythonEcosystem::detect(dir.path()));
    }

    #[test]
    fn test_detect_setup_py() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("setup.py"),
            "from setuptools import setup\nsetup()",
        )
        .unwrap();

        assert!(PythonEcosystem::detect(dir.path()));
    }

    #[test]
    fn test_discover_pyproject_pep621() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            r#"
[project]
name = "my-package"
version = "2.1.0"
dependencies = ["requests>=2.0", "click"]
"#,
        )
        .unwrap();

        let ecosystem = PythonEcosystem::default();
        let packages = ecosystem.discover(dir.path()).unwrap();

        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "my-package");
        assert_eq!(packages[0].version, "2.1.0");
        assert_eq!(packages[0].dependencies, vec!["requests", "click"]);

        match &packages[0].version_targets[0] {
            VersionTarget::TomlKey { key_path, .. } => {
                assert_eq!(key_path, &vec!["project", "version"]);
            }
            _ => panic!("Expected TomlKey"),
        }
    }

    #[test]
    fn test_discover_pyproject_poetry() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            r#"
[tool.poetry]
name = "poetry-pkg"
version = "0.5.0"

[tool.poetry.dependencies]
python = "^3.8"
requests = "^2.28"
"#,
        )
        .unwrap();

        let ecosystem = PythonEcosystem::default();
        let packages = ecosystem.discover(dir.path()).unwrap();

        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "poetry-pkg");
        assert_eq!(packages[0].version, "0.5.0");
        assert!(packages[0].dependencies.contains(&"requests".to_string()));

        match &packages[0].version_targets[0] {
            VersionTarget::TomlKey { key_path, .. } => {
                assert_eq!(key_path, &vec!["tool", "poetry", "version"]);
            }
            _ => panic!("Expected TomlKey"),
        }
    }

    #[test]
    fn test_discover_setup_cfg() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("setup.cfg"),
            r#"
[metadata]
name = cfg-package
version = 1.2.3

[options]
packages = find:
"#,
        )
        .unwrap();

        let ecosystem = PythonEcosystem::default();
        let packages = ecosystem.discover(dir.path()).unwrap();

        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "cfg-package");
        assert_eq!(packages[0].version, "1.2.3");

        match &packages[0].version_targets[0] {
            VersionTarget::IniKey { section, key, .. } => {
                assert_eq!(section, "metadata");
                assert_eq!(key, "version");
            }
            _ => panic!("Expected IniKey"),
        }
    }

    #[test]
    fn test_discover_dynamic_version_error() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            r#"
[project]
name = "dynamic-pkg"
dynamic = ["version"]
"#,
        )
        .unwrap();

        let ecosystem = PythonEcosystem::default();
        let result = ecosystem.discover(dir.path());

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, Error::DynamicVersion(_)));
    }

    #[test]
    fn test_discover_setup_cfg_dynamic_error() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("setup.cfg"),
            r#"
[metadata]
name = attr-pkg
version = attr: mypackage.__version__
"#,
        )
        .unwrap();

        let ecosystem = PythonEcosystem::default();
        let result = ecosystem.discover(dir.path());

        assert!(result.is_err());
    }

    #[test]
    fn test_discover_with_version_file_override() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("pyproject.toml"),
            r#"
[project]
name = "my-pkg"
version = "1.0.0"
"#,
        )
        .unwrap();

        let src_dir = dir.path().join("src").join("my_pkg");
        fs::create_dir_all(&src_dir).unwrap();
        fs::write(
            src_dir.join("__init__.py"),
            "__version__ = \"1.0.0\"\n",
        )
        .unwrap();

        let ecosystem =
            PythonEcosystem::with_version_file(PathBuf::from("src/my_pkg/__init__.py"));
        let packages = ecosystem.discover(dir.path()).unwrap();

        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].version_targets.len(), 2);

        match &packages[0].version_targets[1] {
            VersionTarget::Regex { pattern, .. } => {
                assert!(pattern.contains("__version__"));
            }
            _ => panic!("Expected Regex target"),
        }
    }

    #[test]
    fn test_parse_dependency_name() {
        assert_eq!(
            PythonEcosystem::parse_dependency_name("requests>=2.0"),
            Some("requests".to_string())
        );
        assert_eq!(
            PythonEcosystem::parse_dependency_name("click"),
            Some("click".to_string())
        );
        assert_eq!(
            PythonEcosystem::parse_dependency_name("my-package[extra]>=1.0"),
            Some("my-package".to_string())
        );
    }

    #[test]
    fn test_setup_py_only_error() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("setup.py"), "from setuptools import setup").unwrap();

        let ecosystem = PythonEcosystem::default();
        let result = ecosystem.discover(dir.path());

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, Error::UnsupportedManifest(_)));
    }
}
