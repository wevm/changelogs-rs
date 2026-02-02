use changelogs::ecosystem::{
    detect_ecosystem, get_ecosystem, python::PythonEcosystem, Ecosystem, EcosystemKind,
    VersionTarget,
};
use changelogs::version_editor;
use std::fs;
use tempfile::TempDir;

#[test]
fn test_python_pyproject_pep621_full_workflow() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("pyproject.toml"),
        r#"[project]
name = "my-awesome-package"
version = "1.0.0"
description = "A test package"
dependencies = ["requests>=2.0", "click"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
"#,
    )
    .unwrap();

    let ecosystem = PythonEcosystem::default();
    let packages = ecosystem.discover(dir.path()).unwrap();

    assert_eq!(packages.len(), 1);
    let pkg = &packages[0];
    assert_eq!(pkg.name, "my-awesome-package");
    assert_eq!(pkg.version, "1.0.0");
    assert_eq!(pkg.dependencies.len(), 2);

    assert_eq!(pkg.version_targets.len(), 1);
    match &pkg.version_targets[0] {
        VersionTarget::TomlKey { key_path, .. } => {
            assert_eq!(key_path, &vec!["project", "version"]);
        }
        _ => panic!("Expected TomlKey"),
    }

    version_editor::update_all_targets(&pkg.version_targets, "2.0.0").unwrap();

    let updated_content = fs::read_to_string(dir.path().join("pyproject.toml")).unwrap();
    assert!(updated_content.contains("version = \"2.0.0\""));
    assert!(updated_content.contains("name = \"my-awesome-package\""));
    assert!(updated_content.contains("dependencies = [\"requests>=2.0\", \"click\"]"));
}

#[test]
fn test_python_poetry_full_workflow() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("pyproject.toml"),
        r#"[tool.poetry]
name = "poetry-project"
version = "0.1.0"
description = "A Poetry project"

[tool.poetry.dependencies]
python = "^3.8"
requests = "^2.28"
click = "^8.0"
"#,
    )
    .unwrap();

    let ecosystem = PythonEcosystem::default();
    let packages = ecosystem.discover(dir.path()).unwrap();

    assert_eq!(packages.len(), 1);
    let pkg = &packages[0];
    assert_eq!(pkg.name, "poetry-project");
    assert_eq!(pkg.version, "0.1.0");

    let dep_names: Vec<_> = pkg.dependencies.iter().collect();
    assert!(dep_names.contains(&&"requests".to_string()));
    assert!(dep_names.contains(&&"click".to_string()));
    assert!(!dep_names.contains(&&"python".to_string()));

    match &pkg.version_targets[0] {
        VersionTarget::TomlKey { key_path, .. } => {
            assert_eq!(key_path, &vec!["tool", "poetry", "version"]);
        }
        _ => panic!("Expected TomlKey"),
    }

    version_editor::update_all_targets(&pkg.version_targets, "1.0.0").unwrap();

    let updated_content = fs::read_to_string(dir.path().join("pyproject.toml")).unwrap();
    assert!(updated_content.contains("version = \"1.0.0\""));
}

#[test]
fn test_python_setup_cfg_full_workflow() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("setup.cfg"),
        r#"[metadata]
name = setuptools-project
version = 1.2.3
description = A setuptools project
author = Test Author

[options]
packages = find:
python_requires = >=3.8
install_requires =
    requests>=2.0
    click
"#,
    )
    .unwrap();

    let ecosystem = PythonEcosystem::default();
    let packages = ecosystem.discover(dir.path()).unwrap();

    assert_eq!(packages.len(), 1);
    let pkg = &packages[0];
    assert_eq!(pkg.name, "setuptools-project");
    assert_eq!(pkg.version, "1.2.3");

    match &pkg.version_targets[0] {
        VersionTarget::IniKey { section, key, .. } => {
            assert_eq!(section, "metadata");
            assert_eq!(key, "version");
        }
        _ => panic!("Expected IniKey"),
    }

    version_editor::update_all_targets(&pkg.version_targets, "2.0.0").unwrap();

    let updated_content = fs::read_to_string(dir.path().join("setup.cfg")).unwrap();
    assert!(updated_content.contains("version = 2.0.0"));
    assert!(updated_content.contains("name = setuptools-project"));
}

#[test]
fn test_python_with_version_file_override() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("pyproject.toml"),
        r#"[project]
name = "my-pkg"
version = "1.0.0"
"#,
    )
    .unwrap();

    let src_dir = dir.path().join("src").join("my_pkg");
    fs::create_dir_all(&src_dir).unwrap();
    fs::write(
        src_dir.join("__init__.py"),
        r#""""My package."""

__version__ = "1.0.0"

def hello():
    return "Hello, World!"
"#,
    )
    .unwrap();

    let ecosystem =
        PythonEcosystem::with_version_file(std::path::PathBuf::from("src/my_pkg/__init__.py"));
    let packages = ecosystem.discover(dir.path()).unwrap();

    assert_eq!(packages.len(), 1);
    let pkg = &packages[0];

    assert_eq!(pkg.version_targets.len(), 2);

    version_editor::update_all_targets(&pkg.version_targets, "2.0.0").unwrap();

    let toml_content = fs::read_to_string(dir.path().join("pyproject.toml")).unwrap();
    let py_content = fs::read_to_string(src_dir.join("__init__.py")).unwrap();

    assert!(toml_content.contains("version = \"2.0.0\""));
    assert!(py_content.contains("__version__ = \"2.0.0\""));
    assert!(py_content.contains("def hello():"));
}

#[test]
fn test_ecosystem_detection_priority() {
    let dir = TempDir::new().unwrap();

    fs::write(dir.path().join("Cargo.toml"), "[workspace]\nmembers = []").unwrap();

    let ecosystem = detect_ecosystem(dir.path());
    assert!(ecosystem.is_some());
    assert_eq!(ecosystem.unwrap().kind(), EcosystemKind::Cargo);

    let dir2 = TempDir::new().unwrap();
    fs::write(
        dir2.path().join("Cargo.toml"),
        "[workspace]\nmembers = []",
    )
    .unwrap();
    fs::write(
        dir2.path().join("pyproject.toml"),
        "[project]\nname = \"test\"",
    )
    .unwrap();

    let ecosystem2 = detect_ecosystem(dir2.path());
    assert!(ecosystem2.is_some());
    assert_eq!(ecosystem2.unwrap().kind(), EcosystemKind::Cargo);
}

#[test]
fn test_explicit_ecosystem_selection() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("pyproject.toml"),
        "[project]\nname = \"test\"\nversion = \"1.0.0\"",
    )
    .unwrap();

    let auto = get_ecosystem(EcosystemKind::Auto, dir.path());
    assert!(auto.is_some());
    assert_eq!(auto.unwrap().kind(), EcosystemKind::Python);

    let explicit_python = get_ecosystem(EcosystemKind::Python, dir.path());
    assert!(explicit_python.is_some());
    assert_eq!(explicit_python.unwrap().kind(), EcosystemKind::Python);

    let explicit_cargo = get_ecosystem(EcosystemKind::Cargo, dir.path());
    assert!(explicit_cargo.is_none());
}

#[test]
fn test_python_dynamic_version_rejected() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("pyproject.toml"),
        r#"[project]
name = "dynamic-pkg"
dynamic = ["version"]

[tool.setuptools.dynamic]
version = {attr = "mypackage.__version__"}
"#,
    )
    .unwrap();

    let ecosystem = PythonEcosystem::default();
    let result = ecosystem.discover(dir.path());

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("dynamic"));
}

#[test]
fn test_python_setup_cfg_attr_version_rejected() {
    let dir = TempDir::new().unwrap();

    fs::write(
        dir.path().join("setup.cfg"),
        r#"[metadata]
name = attr-pkg
version = attr: mypackage.__version__

[options]
packages = find:
"#,
    )
    .unwrap();

    let ecosystem = PythonEcosystem::default();
    let result = ecosystem.discover(dir.path());

    assert!(result.is_err());
}

#[test]
fn test_version_update_preserves_formatting() {
    let dir = TempDir::new().unwrap();

    let original = r#"# This is a comment about the project
[project]
name = "formatted-pkg"
version = "1.0.0"  # Current version
description = "A well-formatted package"

# Dependencies section
dependencies = [
    "requests>=2.0",
    "click",
]
"#;

    fs::write(dir.path().join("pyproject.toml"), original).unwrap();

    let ecosystem = PythonEcosystem::default();
    let packages = ecosystem.discover(dir.path()).unwrap();

    version_editor::update_all_targets(&packages[0].version_targets, "2.0.0").unwrap();

    let updated = fs::read_to_string(dir.path().join("pyproject.toml")).unwrap();

    assert!(updated.contains("# This is a comment about the project"));
    assert!(updated.contains("# Dependencies section"));
    assert!(updated.contains("version = \"2.0.0\""));
}
