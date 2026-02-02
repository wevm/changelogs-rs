use crate::ecosystem::VersionTarget;
use crate::error::{Error, Result};
use regex::Regex;
use std::path::Path;
use toml_edit::DocumentMut;

pub fn update_version(target: &VersionTarget, new_version: &str) -> Result<()> {
    match target {
        VersionTarget::TomlKey { file, key_path } => {
            update_toml_version(file, key_path, new_version)
        }
        VersionTarget::IniKey { file, section, key } => {
            update_ini_version(file, section, key, new_version)
        }
        VersionTarget::Regex { file, pattern } => {
            update_regex_version(file, pattern, new_version)
        }
    }
}

fn update_toml_version(file: &Path, key_path: &[String], new_version: &str) -> Result<()> {
    let content = std::fs::read_to_string(file)?;
    let mut doc: DocumentMut = content.parse()?;

    let mut item = doc.as_item_mut();

    for key in &key_path[..key_path.len() - 1] {
        item = item.get_mut(key).ok_or_else(|| {
            Error::VersionUpdateFailed(format!("missing TOML key: {} in {}", key, file.display()))
        })?;
    }

    let last_key = key_path.last().ok_or_else(|| {
        Error::VersionUpdateFailed("empty key path".to_string())
    })?;

    if let Some(table) = item.as_table_mut() {
        table[last_key] = toml_edit::value(new_version);
    } else if let Some(inline) = item.as_inline_table_mut() {
        inline.insert(last_key, new_version.into());
    } else {
        return Err(Error::VersionUpdateFailed(format!(
            "cannot update version at {:?} in {}",
            key_path,
            file.display()
        )));
    }

    std::fs::write(file, doc.to_string())?;
    Ok(())
}

fn update_ini_version(file: &Path, section: &str, key: &str, new_version: &str) -> Result<()> {
    let content = std::fs::read_to_string(file)?;
    let mut lines: Vec<String> = content.lines().map(String::from).collect();

    let section_header = format!("[{}]", section);
    let mut in_target_section = false;
    let mut found = false;

    for line in &mut lines {
        let trimmed = line.trim();

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            in_target_section = trimmed == section_header;
            continue;
        }

        if in_target_section && !found {
            if let Some((line_key, _)) = trimmed.split_once('=') {
                if line_key.trim() == key {
                    *line = format!("{} = {}", key, new_version);
                    found = true;
                }
            }
        }
    }

    if !found {
        return Err(Error::VersionUpdateFailed(format!(
            "key '{}' not found in section '{}' of {}",
            key,
            section,
            file.display()
        )));
    }

    std::fs::write(file, lines.join("\n") + "\n")?;
    Ok(())
}

fn update_regex_version(file: &Path, pattern: &str, new_version: &str) -> Result<()> {
    let content = std::fs::read_to_string(file)?;

    let re = Regex::new(pattern).map_err(|e| {
        Error::VersionUpdateFailed(format!("invalid regex pattern: {}", e))
    })?;

    let matches: Vec<_> = re.find_iter(&content).collect();

    if matches.is_empty() {
        return Err(Error::VersionUpdateFailed(format!(
            "pattern '{}' not found in {}",
            pattern,
            file.display()
        )));
    }

    if matches.len() > 1 {
        return Err(Error::VersionUpdateFailed(format!(
            "pattern '{}' matched {} times in {} - refusing to update ambiguous version",
            pattern,
            matches.len(),
            file.display()
        )));
    }

    let new_content = re.replace(&content, |caps: &regex::Captures| {
        let full_match = caps.get(0).unwrap().as_str();

        if let Some(version_group) = caps.get(1) {
            full_match.replace(version_group.as_str(), new_version)
        } else {
            new_version.to_string()
        }
    });

    std::fs::write(file, new_content.as_ref())?;
    Ok(())
}

pub fn update_all_targets(targets: &[VersionTarget], new_version: &str) -> Result<()> {
    for target in targets {
        update_version(target, new_version)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_update_toml_version_simple() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("Cargo.toml");

        fs::write(
            &file,
            r#"
[package]
name = "test"
version = "1.0.0"
"#,
        )
        .unwrap();

        let target = VersionTarget::TomlKey {
            file: file.clone(),
            key_path: vec!["package".to_string(), "version".to_string()],
        };

        update_version(&target, "2.0.0").unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert!(content.contains("version = \"2.0.0\""));
    }

    #[test]
    fn test_update_toml_version_nested() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("pyproject.toml");

        fs::write(
            &file,
            r#"
[tool.poetry]
name = "test"
version = "0.1.0"
"#,
        )
        .unwrap();

        let target = VersionTarget::TomlKey {
            file: file.clone(),
            key_path: vec![
                "tool".to_string(),
                "poetry".to_string(),
                "version".to_string(),
            ],
        };

        update_version(&target, "1.0.0").unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert!(content.contains("version = \"1.0.0\""));
    }

    #[test]
    fn test_update_toml_preserves_formatting() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("Cargo.toml");

        let original = r#"# This is a comment
[package]
name = "test"
version = "1.0.0"  # inline comment
edition = "2021"
"#;

        fs::write(&file, original).unwrap();

        let target = VersionTarget::TomlKey {
            file: file.clone(),
            key_path: vec!["package".to_string(), "version".to_string()],
        };

        update_version(&target, "2.0.0").unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert!(content.contains("# This is a comment"));
        assert!(content.contains("edition = \"2021\""));
    }

    #[test]
    fn test_update_ini_version() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("setup.cfg");

        fs::write(
            &file,
            r#"
[metadata]
name = my-package
version = 1.0.0

[options]
packages = find:
"#,
        )
        .unwrap();

        let target = VersionTarget::IniKey {
            file: file.clone(),
            section: "metadata".to_string(),
            key: "version".to_string(),
        };

        update_version(&target, "2.0.0").unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert!(content.contains("version = 2.0.0"));
        assert!(content.contains("name = my-package"));
        assert!(content.contains("[options]"));
    }

    #[test]
    fn test_update_ini_version_not_found() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("setup.cfg");

        fs::write(
            &file,
            r#"
[metadata]
name = my-package

[options]
packages = find:
"#,
        )
        .unwrap();

        let target = VersionTarget::IniKey {
            file: file.clone(),
            section: "metadata".to_string(),
            key: "version".to_string(),
        };

        let result = update_version(&target, "2.0.0");
        assert!(result.is_err());
    }

    #[test]
    fn test_update_regex_version_dunder() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("__init__.py");

        fs::write(
            &file,
            r#"
"""My package."""

__version__ = "1.0.0"

def main():
    pass
"#,
        )
        .unwrap();

        let target = VersionTarget::Regex {
            file: file.clone(),
            pattern: r#"__version__\s*=\s*["']([^"']+)["']"#.to_string(),
        };

        update_version(&target, "2.0.0").unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert!(content.contains("__version__ = \"2.0.0\""));
        assert!(content.contains("def main():"));
    }

    #[test]
    fn test_update_regex_version_ambiguous() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("version.py");

        fs::write(
            &file,
            r#"
__version__ = "1.0.0"
__api_version__ = "1.0.0"
"#,
        )
        .unwrap();

        let target = VersionTarget::Regex {
            file: file.clone(),
            pattern: r#"= "([^"]+)""#.to_string(),
        };

        let result = update_version(&target, "2.0.0");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("matched 2 times"));
    }

    #[test]
    fn test_update_regex_version_not_found() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("empty.py");

        fs::write(&file, "# No version here\n").unwrap();

        let target = VersionTarget::Regex {
            file: file.clone(),
            pattern: r#"__version__\s*=\s*["']([^"']+)["']"#.to_string(),
        };

        let result = update_version(&target, "2.0.0");
        assert!(result.is_err());
    }

    #[test]
    fn test_update_all_targets() {
        let dir = TempDir::new().unwrap();

        let toml_file = dir.path().join("pyproject.toml");
        fs::write(
            &toml_file,
            r#"
[project]
name = "test"
version = "1.0.0"
"#,
        )
        .unwrap();

        let py_file = dir.path().join("__init__.py");
        fs::write(&py_file, "__version__ = \"1.0.0\"\n").unwrap();

        let targets = vec![
            VersionTarget::TomlKey {
                file: toml_file.clone(),
                key_path: vec!["project".to_string(), "version".to_string()],
            },
            VersionTarget::Regex {
                file: py_file.clone(),
                pattern: r#"__version__\s*=\s*["']([^"']+)["']"#.to_string(),
            },
        ];

        update_all_targets(&targets, "2.0.0").unwrap();

        let toml_content = fs::read_to_string(&toml_file).unwrap();
        let py_content = fs::read_to_string(&py_file).unwrap();

        assert!(toml_content.contains("version = \"2.0.0\""));
        assert!(py_content.contains("__version__ = \"2.0.0\""));
    }
}
