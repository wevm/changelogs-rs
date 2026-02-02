use crate::ecosystems::{Ecosystem, EcosystemAdapter, Package};
use crate::error::{Error, Result};
use semver::Version;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use toml_edit::DocumentMut;

pub struct PythonAdapter;

impl EcosystemAdapter for PythonAdapter {
    fn ecosystem() -> Ecosystem {
        Ecosystem::Python
    }

    fn discover(root: &Path) -> Result<Vec<Package>> {
        let pyproject_path = root.join("pyproject.toml");

        if !pyproject_path.exists() {
            return Err(Error::PythonProjectNotFound(format!(
                "No pyproject.toml found at {}",
                root.display()
            )));
        }

        let content = std::fs::read_to_string(&pyproject_path)?;
        let doc: DocumentMut = content.parse()?;

        let project = doc.get("project").ok_or_else(|| {
            Error::PythonProjectNotFound(
                "pyproject.toml must have a [project] section (PEP 621)".to_string(),
            )
        })?;

        let name = project
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| Error::PythonProjectNotFound("project.name is required".to_string()))?;

        if let Some(dynamic) = project.get("dynamic") {
            if let Some(arr) = dynamic.as_array() {
                for item in arr.iter() {
                    if item.as_str() == Some("version") {
                        return Err(Error::PythonDynamicVersion(
                            "Dynamic versions are not supported. Use a static version in [project].version".to_string(),
                        ));
                    }
                }
            }
        }

        let version_str = project.get("version").and_then(|v| v.as_str()).ok_or_else(|| {
            Error::VersionNotFound("project.version is required and must be static".to_string())
        })?;

        let version: Version = version_str.parse().map_err(|e| {
            Error::VersionParse(format!("Invalid semver version '{}': {}", version_str, e))
        })?;

        let dependencies = Self::extract_dependencies(&doc);

        Ok(vec![Package {
            name: name.to_string(),
            version,
            path: root.to_path_buf(),
            manifest_path: pyproject_path,
            dependencies,
        }])
    }

    fn read_version(manifest_path: &Path) -> Result<Version> {
        let content = std::fs::read_to_string(manifest_path)?;
        let doc: DocumentMut = content.parse()?;

        let version_str = doc
            .get("project")
            .and_then(|p| p.get("version"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| Error::VersionNotFound(manifest_path.display().to_string()))?;

        Ok(version_str.parse()?)
    }

    fn write_version(manifest_path: &Path, version: &Version) -> Result<()> {
        let content = std::fs::read_to_string(manifest_path)?;
        let mut doc: DocumentMut = content.parse()?;

        let project = doc
            .get_mut("project")
            .and_then(|p| p.as_table_mut())
            .ok_or_else(|| {
                Error::PythonProjectNotFound(format!(
                    "No [project] section in {}",
                    manifest_path.display()
                ))
            })?;

        project["version"] = toml_edit::value(version.to_string());

        std::fs::write(manifest_path, doc.to_string())?;
        Ok(())
    }

    fn update_dependency_version(
        manifest_path: &Path,
        dep_name: &str,
        new_version: &Version,
    ) -> Result<bool> {
        let content = fs::read_to_string(manifest_path)?;
        let mut doc: DocumentMut = content.parse()?;
        let mut modified = false;

        if let Some(project) = doc.get_mut("project") {
            if let Some(deps) = project.get_mut("dependencies") {
                if let Some(arr) = deps.as_array_mut() {
                    for i in 0..arr.len() {
                        if let Some(dep_str) = arr.get(i).and_then(|v| v.as_str()) {
                            if Self::dependency_matches(dep_str, dep_name) {
                                if let Some(new_dep) = Self::rewrite_dependency(dep_str, new_version) {
                                    arr.replace(i, new_dep);
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }

            if let Some(optional_deps) = project.get_mut("optional-dependencies") {
                if let Some(table) = optional_deps.as_table_mut() {
                    for (_key, value) in table.iter_mut() {
                        if let Some(arr) = value.as_array_mut() {
                            for i in 0..arr.len() {
                                if let Some(dep_str) = arr.get(i).and_then(|v| v.as_str()) {
                                    if Self::dependency_matches(dep_str, dep_name) {
                                        if let Some(new_dep) = Self::rewrite_dependency(dep_str, new_version) {
                                            arr.replace(i, new_dep);
                                            modified = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if modified {
            fs::write(manifest_path, doc.to_string())?;
        }

        Ok(modified)
    }

    fn is_published(name: &str, version: &Version) -> Result<bool> {
        let normalized_name = Self::normalize_pep503(name);
        let url = format!("https://pypi.org/pypi/{}/json", normalized_name);

        let response = match ureq::get(&url).call() {
            Ok(resp) => resp,
            Err(ureq::Error::Status(404, _)) => return Ok(false),
            Err(e) => return Err(Error::PypiCheckFailed(e.to_string())),
        };

        let json: serde_json::Value = response
            .into_json()
            .map_err(|e| Error::PypiCheckFailed(format!("failed to parse JSON: {}", e)))?;

        if let Some(releases) = json.get("releases").and_then(|r| r.as_object()) {
            let version_str = version.to_string();
            return Ok(releases.contains_key(&version_str));
        }

        Ok(false)
    }

    fn publish(pkg: &Package, dry_run: bool, registry: Option<&str>) -> Result<bool> {
        if dry_run {
            return Ok(true);
        }

        let pkg_path = pkg.path.canonicalize().map_err(|e| {
            Error::PublishFailed(format!("Failed to canonicalize package path: {}", e))
        })?;
        let dist_dir = pkg_path.join("dist");

        if dist_dir.exists() {
            let canonical_dist = dist_dir.canonicalize().map_err(|e| {
                Error::PublishFailed(format!("Failed to canonicalize dist path: {}", e))
            })?;
            if !canonical_dist.starts_with(&pkg_path) {
                return Err(Error::PublishFailed(
                    "dist directory path traversal detected".to_string(),
                ));
            }
            fs::remove_dir_all(&canonical_dist)?;
        }

        let build_output = Command::new("python")
            .args(["-m", "build"])
            .current_dir(&pkg_path)
            .output()?;

        if !build_output.status.success() {
            let stderr = String::from_utf8_lossy(&build_output.stderr);
            return Err(Error::PublishFailed(format!(
                "python -m build failed: {}",
                stderr
            )));
        }

        let mut dist_files: Vec<_> = fs::read_dir(&dist_dir)?
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                name.ends_with(".whl") || name.ends_with(".tar.gz") || name.ends_with(".zip")
            })
            .collect();
        dist_files.sort();

        if dist_files.is_empty() {
            return Err(Error::PublishFailed(
                "No distribution files found in dist/".to_string(),
            ));
        }

        let mut cmd = Command::new("twine");
        cmd.arg("upload");

        if let Some(reg) = registry {
            match reg.to_lowercase().as_str() {
                "testpypi" => {
                    cmd.args(["--repository", "testpypi"]);
                }
                url if url.starts_with("http://") || url.starts_with("https://") => {
                    cmd.args(["--repository-url", reg]);
                }
                _ => {
                    cmd.args(["--repository", reg]);
                }
            }
        }

        for file in &dist_files {
            cmd.arg(file);
        }
        cmd.current_dir(&pkg_path);

        let upload_output = cmd.output()?;

        if upload_output.status.success() {
            return Ok(true);
        }

        let stderr = String::from_utf8_lossy(&upload_output.stderr);
        if stderr.contains("already exists") || stderr.contains("File already exists") {
            return Ok(true);
        }

        Err(Error::PublishFailed(format!(
            "twine upload failed: {}",
            stderr
        )))
    }
}

impl PythonAdapter {
    fn extract_dependencies(doc: &DocumentMut) -> Vec<String> {
        let mut deps = Vec::new();

        if let Some(project) = doc.get("project") {
            if let Some(dependencies) = project.get("dependencies") {
                if let Some(arr) = dependencies.as_array() {
                    for item in arr.iter() {
                        if let Some(dep_str) = item.as_str() {
                            if let Some(name) = Self::parse_dependency_name(dep_str) {
                                deps.push(name);
                            }
                        }
                    }
                }
            }
        }

        deps
    }

    fn normalize_pep503(name: &str) -> String {
        let lower = name.to_ascii_lowercase();
        let mut out = String::with_capacity(lower.len());
        let mut prev_sep = false;

        for ch in lower.chars() {
            let is_sep = ch == '-' || ch == '_' || ch == '.';
            if is_sep {
                if !prev_sep {
                    out.push('-');
                    prev_sep = true;
                }
            } else {
                out.push(ch);
                prev_sep = false;
            }
        }

        out.trim_end_matches('-').to_string()
    }

    fn parse_dependency_name(dep_str: &str) -> Option<String> {
        let dep_str = dep_str.trim();
        let name_end = dep_str
            .find(|c: char| !c.is_alphanumeric() && c != '-' && c != '_' && c != '.')
            .unwrap_or(dep_str.len());

        if name_end > 0 {
            Some(Self::normalize_pep503(&dep_str[..name_end]))
        } else {
            None
        }
    }

    fn parse_dependency_parts(dep_str: &str) -> Option<(String, String, String)> {
        let dep_str = dep_str.trim();

        let name_end = dep_str
            .find(|c: char| !c.is_alphanumeric() && c != '-' && c != '_' && c != '.')
            .unwrap_or(dep_str.len());

        if name_end == 0 {
            return None;
        }

        let name = &dep_str[..name_end];
        let rest = &dep_str[name_end..];

        let mut extras = String::new();
        let mut remaining = rest.trim_start();

        if remaining.starts_with('[') {
            if let Some(close) = remaining.find(']') {
                extras = remaining[..=close].to_string();
                remaining = remaining[close + 1..].trim_start();
            }
        }

        if remaining.starts_with('@') {
            return None;
        }

        let marker_start = remaining.find(';');
        let (version_spec, marker) = match marker_start {
            Some(pos) => (remaining[..pos].trim(), remaining[pos..].to_string()),
            None => (remaining.trim(), String::new()),
        };

        Some((name.to_string(), format!("{}{}", extras, marker), version_spec.to_string()))
    }

    fn dependency_matches(dep_str: &str, name: &str) -> bool {
        if let Some(parsed_name) = Self::parse_dependency_name(dep_str) {
            let normalized_name = Self::normalize_pep503(name);
            parsed_name == normalized_name
        } else {
            false
        }
    }

    fn rewrite_dependency(dep_str: &str, new_version: &Version) -> Option<String> {
        let (name, extras_marker, _old_version) = Self::parse_dependency_parts(dep_str)?;

        let (extras, marker) = if let Some(marker_pos) = extras_marker.find(';') {
            (
                extras_marker[..marker_pos].to_string(),
                extras_marker[marker_pos..].to_string(),
            )
        } else {
            (extras_marker, String::new())
        };

        Some(format!("{}{}=={}{}", name, extras, new_version, marker))
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
    use std::io::Write;
    use tempfile::TempDir;

    fn create_pyproject(dir: &Path, content: &str) -> std::path::PathBuf {
        let path = dir.join("pyproject.toml");
        let mut file = std::fs::File::create(&path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        path
    }

    #[test]
    fn discover_valid_pyproject() {
        let tmp = TempDir::new().unwrap();
        create_pyproject(
            tmp.path(),
            r#"
[project]
name = "my-package"
version = "1.2.3"
dependencies = ["requests>=2.0"]
"#,
        );

        let packages = PythonAdapter::discover(tmp.path()).unwrap();
        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].name, "my-package");
        assert_eq!(packages[0].version.to_string(), "1.2.3");
        assert_eq!(packages[0].dependencies, vec!["requests"]);
    }

    #[test]
    fn discover_missing_pyproject() {
        let tmp = TempDir::new().unwrap();
        let result = PythonAdapter::discover(tmp.path());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("No pyproject.toml"));
    }

    #[test]
    fn discover_missing_project_section() {
        let tmp = TempDir::new().unwrap();
        create_pyproject(
            tmp.path(),
            r#"
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
"#,
        );

        let result = PythonAdapter::discover(tmp.path());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("[project]"));
    }

    #[test]
    fn discover_dynamic_version_error() {
        let tmp = TempDir::new().unwrap();
        create_pyproject(
            tmp.path(),
            r#"
[project]
name = "my-package"
dynamic = ["version"]
"#,
        );

        let result = PythonAdapter::discover(tmp.path());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Dynamic"));
    }

    #[test]
    fn discover_missing_version() {
        let tmp = TempDir::new().unwrap();
        create_pyproject(
            tmp.path(),
            r#"
[project]
name = "my-package"
"#,
        );

        let result = PythonAdapter::discover(tmp.path());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("version"));
    }

    #[test]
    fn pep503_normalization() {
        assert_eq!(PythonAdapter::normalize_pep503("Requests"), "requests");
        assert_eq!(PythonAdapter::normalize_pep503("my_pkg"), "my-pkg");
        assert_eq!(PythonAdapter::normalize_pep503("my..pkg"), "my-pkg");
        assert_eq!(PythonAdapter::normalize_pep503("my---pkg"), "my-pkg");
        assert_eq!(PythonAdapter::normalize_pep503("My_Cool.Package"), "my-cool-package");
        assert_eq!(PythonAdapter::normalize_pep503("pkg-"), "pkg");
        assert_eq!(PythonAdapter::normalize_pep503("pkg_-_"), "pkg");
    }

    #[test]
    fn parse_dependency_name_simple() {
        assert_eq!(
            PythonAdapter::parse_dependency_name("requests"),
            Some("requests".to_string())
        );
        assert_eq!(
            PythonAdapter::parse_dependency_name("requests>=2.0"),
            Some("requests".to_string())
        );
    }

    #[test]
    fn parse_dependency_name_with_extras() {
        assert_eq!(
            PythonAdapter::parse_dependency_name("requests[security]>=2.0"),
            Some("requests".to_string())
        );
    }

    #[test]
    fn parse_dependency_name_with_markers() {
        assert_eq!(
            PythonAdapter::parse_dependency_name("importlib-metadata; python_version<\"3.10\""),
            Some("importlib-metadata".to_string())
        );
    }

    #[test]
    fn parse_dependency_name_with_extras_and_markers() {
        assert_eq!(
            PythonAdapter::parse_dependency_name("foo[bar,baz]>=1.0,<2.0; python_version>=\"3.8\""),
            Some("foo".to_string())
        );
    }

    #[test]
    fn parse_dependency_name_normalized() {
        assert_eq!(
            PythonAdapter::parse_dependency_name("My_Package>=1.0"),
            Some("my-package".to_string())
        );
    }

    #[test]
    fn read_and_write_version() {
        let tmp = TempDir::new().unwrap();
        let path = create_pyproject(
            tmp.path(),
            r#"
[project]
name = "my-package"
version = "1.0.0"
"#,
        );

        let version = PythonAdapter::read_version(&path).unwrap();
        assert_eq!(version.to_string(), "1.0.0");

        let new_version: Version = "2.0.0".parse().unwrap();
        PythonAdapter::write_version(&path, &new_version).unwrap();

        let updated = PythonAdapter::read_version(&path).unwrap();
        assert_eq!(updated.to_string(), "2.0.0");
    }

    #[test]
    fn write_version_missing_project_errors() {
        let tmp = TempDir::new().unwrap();
        let path = create_pyproject(
            tmp.path(),
            r#"
[build-system]
requires = ["hatchling"]
"#,
        );

        let new_version: Version = "2.0.0".parse().unwrap();
        let result = PythonAdapter::write_version(&path, &new_version);
        assert!(result.is_err());
    }

    #[test]
    fn update_dependency_version() {
        let tmp = TempDir::new().unwrap();
        let path = create_pyproject(
            tmp.path(),
            r#"
[project]
name = "my-package"
version = "1.0.0"
dependencies = [
    "requests>=2.0",
    "click>=8.0",
]
"#,
        );

        let new_version: Version = "3.0.0".parse().unwrap();
        let modified =
            PythonAdapter::update_dependency_version(&path, "requests", &new_version).unwrap();
        assert!(modified);

        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("requests==3.0.0"));
        assert!(content.contains("click>=8.0"));
    }

    #[test]
    fn dependency_matches_normalized() {
        assert!(PythonAdapter::dependency_matches("My_Package>=1.0", "my-package"));
        assert!(PythonAdapter::dependency_matches("my-package>=1.0", "My_Package"));
        assert!(!PythonAdapter::dependency_matches("other-pkg>=1.0", "my-package"));
    }

    #[test]
    fn rewrite_dependency_preserves_extras_and_markers() {
        let new_version: Version = "2.0.0".parse().unwrap();
        
        let result = PythonAdapter::rewrite_dependency("foo[bar]>=1.0", &new_version);
        assert_eq!(result, Some("foo[bar]==2.0.0".to_string()));

        let result = PythonAdapter::rewrite_dependency("foo>=1.0; python_version>=\"3.8\"", &new_version);
        assert_eq!(result, Some("foo==2.0.0; python_version>=\"3.8\"".to_string()));

        let result = PythonAdapter::rewrite_dependency("foo[bar,baz]>=1.0; os_name==\"nt\"", &new_version);
        assert_eq!(result, Some("foo[bar,baz]==2.0.0; os_name==\"nt\"".to_string()));
    }
}
