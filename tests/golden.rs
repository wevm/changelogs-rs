use changelogs::changelog_entry;
use changelogs::changelog_writer;
use changelogs::config::{ChangelogFormat, Config};
use changelogs::ecosystems::{Ecosystem, Package};
use changelogs::plan;
use changelogs::workspace::Workspace;
use semver::Version;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

const TEST_DATE: &str = "2025-01-15";

fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(name)
}

fn read_changelogs(changelog_dir: &Path) -> Vec<changelogs::changelog_entry::Changelog> {
    let mut changelogs = changelog_entry::read_all(changelog_dir).unwrap();
    changelogs.sort_by(|a, b| a.id.cmp(&b.id));
    changelogs
}

fn load_config(fixture_dir: &Path) -> Config {
    let config_path = fixture_dir.join("config.toml");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path).unwrap();
        toml::from_str(&content).unwrap()
    } else {
        Config::default()
    }
}

fn format_releases(releases: &[plan::PackageRelease]) -> String {
    releases
        .iter()
        .map(|r| {
            format!(
                "{}: {} -> {} ({})",
                r.name, r.old_version, r.new_version, r.bump
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
        + "\n"
}

fn read_expected(path: &Path) -> String {
    std::fs::read_to_string(path).unwrap()
}

fn make_package(name: &str, version: &str, path: &Path, deps: Vec<&str>) -> Package {
    Package {
        name: name.to_string(),
        version: Version::parse(version).unwrap(),
        path: path.to_path_buf(),
        manifest_path: path.join("Cargo.toml"),
        dependencies: deps.into_iter().map(String::from).collect(),
    }
}

fn make_workspace(root: &Path, changelog_dir: &Path, packages: Vec<Package>) -> Workspace {
    Workspace {
        root: root.to_path_buf(),
        changelog_dir: changelog_dir.to_path_buf(),
        packages,
        ecosystem: Ecosystem::Rust,
    }
}

// ── Single crate, patch bump ────────────────────────────────────────

#[test]
fn test_single_crate_patch() {
    let fixture = fixture_path("single-crate-patch");
    let tmp = TempDir::new().unwrap();
    let crate_dir = tmp.path().join("my-crate");
    std::fs::create_dir_all(&crate_dir).unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = Config::default();

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![make_package("my-crate", "1.0.0", &crate_dir, vec![])],
    );

    let release_plan = plan::assemble(&workspace, changelogs.clone(), &config);
    assert_eq!(release_plan.releases.len(), 1);
    assert_eq!(release_plan.releases[0].new_version, Version::new(1, 0, 1));

    changelog_writer::write_changelogs_with_date(
        &workspace,
        &release_plan.releases,
        &changelogs,
        ChangelogFormat::PerCrate,
        TEST_DATE,
    )
    .unwrap();

    let actual = std::fs::read_to_string(crate_dir.join("CHANGELOG.md")).unwrap();
    let expected = read_expected(&fixture.join("expected/CHANGELOG.md"));
    assert_eq!(
        actual, expected,
        "CHANGELOG.md mismatch for single-crate-patch"
    );
}

// ── Multi-crate, mixed bumps ────────────────────────────────────────

#[test]
fn test_multi_crate_mixed() {
    let fixture = fixture_path("multi-crate-mixed");
    let tmp = TempDir::new().unwrap();
    let core_dir = tmp.path().join("core");
    let utils_dir = tmp.path().join("utils");
    std::fs::create_dir_all(&core_dir).unwrap();
    std::fs::create_dir_all(&utils_dir).unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = Config::default();

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package("core", "1.0.0", &core_dir, vec![]),
            make_package("utils", "2.3.0", &utils_dir, vec![]),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs.clone(), &config);

    let core_release = release_plan
        .releases
        .iter()
        .find(|r| r.name == "core")
        .unwrap();
    assert_eq!(core_release.new_version, Version::new(2, 0, 0));

    let utils_release = release_plan
        .releases
        .iter()
        .find(|r| r.name == "utils")
        .unwrap();
    assert_eq!(utils_release.new_version, Version::new(2, 4, 0));

    changelog_writer::write_changelogs_with_date(
        &workspace,
        &release_plan.releases,
        &changelogs,
        ChangelogFormat::PerCrate,
        TEST_DATE,
    )
    .unwrap();

    let actual_core = std::fs::read_to_string(core_dir.join("CHANGELOG.md")).unwrap();
    let expected_core = read_expected(&fixture.join("expected/core-CHANGELOG.md"));
    assert_eq!(actual_core, expected_core, "CHANGELOG.md mismatch for core");

    let actual_utils = std::fs::read_to_string(utils_dir.join("CHANGELOG.md")).unwrap();
    let expected_utils = read_expected(&fixture.join("expected/utils-CHANGELOG.md"));
    assert_eq!(
        actual_utils, expected_utils,
        "CHANGELOG.md mismatch for utils"
    );
}

// ── Dependent bump propagation ──────────────────────────────────────

#[test]
fn test_dependent_bump() {
    let fixture = fixture_path("dependent-bump");
    let tmp = TempDir::new().unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = Config::default(); // dependent_bump defaults to "patch"

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package("core", "0.5.0", &tmp.path().join("core"), vec![]),
            make_package("app", "1.0.0", &tmp.path().join("app"), vec!["core"]),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs, &config);

    let actual = format_releases(&release_plan.releases);
    let expected = read_expected(&fixture.join("expected/releases.txt"));
    assert_eq!(actual, expected, "release plan mismatch for dependent-bump");
}

// ── Fixed groups ────────────────────────────────────────────────────

#[test]
fn test_fixed_groups() {
    let fixture = fixture_path("fixed-groups");
    let tmp = TempDir::new().unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = load_config(&fixture);

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package("pkg-a", "1.0.0", &tmp.path().join("pkg-a"), vec![]),
            make_package("pkg-b", "1.0.0", &tmp.path().join("pkg-b"), vec![]),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs, &config);

    let actual = format_releases(&release_plan.releases);
    let expected = read_expected(&fixture.join("expected/releases.txt"));
    assert_eq!(actual, expected, "release plan mismatch for fixed-groups");
}

// ── Linked groups ───────────────────────────────────────────────────

#[test]
fn test_linked_groups() {
    let fixture = fixture_path("linked-groups");
    let tmp = TempDir::new().unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = load_config(&fixture);

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package("sdk-core", "1.0.0", &tmp.path().join("sdk-core"), vec![]),
            make_package(
                "sdk-macros",
                "1.0.0",
                &tmp.path().join("sdk-macros"),
                vec![],
            ),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs, &config);

    let actual = format_releases(&release_plan.releases);
    let expected = read_expected(&fixture.join("expected/releases.txt"));
    assert_eq!(actual, expected, "release plan mismatch for linked-groups");
}

// ── Ignore packages ────────────────────────────────────────────────

#[test]
fn test_ignore_packages() {
    let fixture = fixture_path("ignore-packages");
    let tmp = TempDir::new().unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = load_config(&fixture);

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package(
                "internal-tool",
                "1.0.0",
                &tmp.path().join("internal-tool"),
                vec![],
            ),
            make_package(
                "public-api",
                "1.0.0",
                &tmp.path().join("public-api"),
                vec![],
            ),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs, &config);

    let actual = format_releases(&release_plan.releases);
    let expected = read_expected(&fixture.join("expected/releases.txt"));
    assert_eq!(
        actual, expected,
        "release plan mismatch for ignore-packages"
    );
}

// ── Root changelog format ───────────────────────────────────────────

#[test]
fn test_root_changelog() {
    let fixture = fixture_path("root-changelog");
    let tmp = TempDir::new().unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = load_config(&fixture);

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![
            make_package("client", "0.2.0", &tmp.path().join("client"), vec![]),
            make_package("server", "0.2.0", &tmp.path().join("server"), vec![]),
        ],
    );

    let release_plan = plan::assemble(&workspace, changelogs.clone(), &config);

    changelog_writer::write_changelogs_with_date(
        &workspace,
        &release_plan.releases,
        &changelogs,
        config.changelog.format,
        TEST_DATE,
    )
    .unwrap();

    let actual = std::fs::read_to_string(tmp.path().join("CHANGELOG.md")).unwrap();
    let expected = read_expected(&fixture.join("expected/CHANGELOG.md"));
    assert_eq!(actual, expected, "CHANGELOG.md mismatch for root-changelog");
}

// ── Multiple changelogs per crate ───────────────────────────────────

#[test]
fn test_multiple_changelogs_per_crate() {
    let fixture = fixture_path("multiple-changelogs-per-crate");
    let tmp = TempDir::new().unwrap();
    let lib_dir = tmp.path().join("my-lib");
    std::fs::create_dir_all(&lib_dir).unwrap();

    let changelogs = read_changelogs(&fixture.join("changelog"));
    let config = Config::default();

    let workspace = make_workspace(
        tmp.path(),
        &fixture.join("changelog"),
        vec![make_package("my-lib", "1.0.0", &lib_dir, vec![])],
    );

    let release_plan = plan::assemble(&workspace, changelogs.clone(), &config);

    // Verify release plan
    let actual_releases = format_releases(&release_plan.releases);
    let expected_releases = read_expected(&fixture.join("expected/releases.txt"));
    assert_eq!(actual_releases, expected_releases, "release plan mismatch");

    // Verify changelog output
    changelog_writer::write_changelogs_with_date(
        &workspace,
        &release_plan.releases,
        &changelogs,
        ChangelogFormat::PerCrate,
        TEST_DATE,
    )
    .unwrap();

    let actual = std::fs::read_to_string(lib_dir.join("CHANGELOG.md")).unwrap();
    let expected = read_expected(&fixture.join("expected/CHANGELOG.md"));
    assert_eq!(
        actual, expected,
        "CHANGELOG.md mismatch for multiple-changelogs-per-crate"
    );
}
