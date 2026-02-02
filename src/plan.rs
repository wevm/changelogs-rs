use crate::changelog_entry::Changelog;
use crate::config::{Config, DependentBump};
use crate::graph::DependencyGraph;
use crate::workspace::Workspace;
use crate::BumpType;
use semver::Version;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ReleasePlan {
    pub changelogs: Vec<Changelog>,
    pub releases: Vec<PackageRelease>,
}

#[derive(Debug, Clone)]
pub struct PackageRelease {
    pub name: String,
    pub bump: BumpType,
    pub old_version: Version,
    pub new_version: Version,
    pub changelog_ids: Vec<String>,
}

pub fn bump_version(version: &Version, bump: BumpType) -> Version {
    match bump {
        BumpType::Major => Version::new(version.major + 1, 0, 0),
        BumpType::Minor => Version::new(version.major, version.minor + 1, 0),
        BumpType::Patch => Version::new(version.major, version.minor, version.patch + 1),
    }
}

pub fn assemble(
    workspace: &Workspace,
    changelogs: Vec<Changelog>,
    config: &Config,
) -> ReleasePlan {
    let graph = DependencyGraph::from_workspace(workspace);

    let mut bump_map: HashMap<String, BumpType> = HashMap::new();
    let mut changelog_map: HashMap<String, Vec<String>> = HashMap::new();

    for changelog in &changelogs {
        for release in &changelog.releases {
            if config.ignore.contains(&release.package) {
                continue;
            }

            let current = bump_map.get(&release.package).copied();
            let new_bump = match current {
                Some(existing) => existing.max(release.bump),
                None => release.bump,
            };
            bump_map.insert(release.package.clone(), new_bump);

            changelog_map
                .entry(release.package.clone())
                .or_default()
                .push(changelog.id.clone());
        }
    }

    for group in &config.fixed {
        let max_bump = group
            .members
            .iter()
            .filter_map(|m| bump_map.get(m))
            .max()
            .copied();

        if let Some(bump) = max_bump {
            for member in &group.members {
                if !config.ignore.contains(member) {
                    bump_map.insert(member.clone(), bump);
                }
            }
        }
    }

    for group in &config.linked {
        let releasing: Vec<_> = group
            .members
            .iter()
            .filter(|m| bump_map.contains_key(*m))
            .collect();

        if releasing.len() > 1 {
            let max_bump = releasing
                .iter()
                .filter_map(|m| bump_map.get(*m))
                .max()
                .copied();

            if let Some(bump) = max_bump {
                for member in releasing {
                    bump_map.insert(member.clone(), bump);
                }
            }
        }
    }

    if config.dependent_bump != DependentBump::None {
        let dependent_bump_type = match config.dependent_bump {
            DependentBump::Patch => BumpType::Patch,
            DependentBump::Minor => BumpType::Minor,
            DependentBump::None => unreachable!(),
        };

        let changed_packages: Vec<String> = bump_map.keys().cloned().collect();

        for pkg in changed_packages {
            for dependent in graph.all_dependents(&pkg) {
                if config.ignore.contains(&dependent) {
                    continue;
                }

                let current = bump_map.get(&dependent).copied();
                match current {
                    Some(existing) if existing >= dependent_bump_type => {}
                    _ => {
                        bump_map.insert(dependent, dependent_bump_type);
                    }
                }
            }
        }
    }

    let mut releases: Vec<PackageRelease> = bump_map
        .into_iter()
        .filter_map(|(name, bump)| {
            let package = workspace.get_package(&name)?;
            let new_version = bump_version(&package.version, bump);

            Some(PackageRelease {
                name: name.clone(),
                bump,
                old_version: package.version.clone(),
                new_version,
                changelog_ids: changelog_map.remove(&name).unwrap_or_default(),
            })
        })
        .collect();

    releases.sort_by(|a, b| a.name.cmp(&b.name));

    ReleasePlan {
        changelogs,
        releases,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Release;
    use semver::Version;

    #[allow(dead_code)]
    fn mock_package(name: &str, version: &str, deps: Vec<&str>) -> crate::workspace::WorkspacePackage {
        use crate::ecosystem::{PackageInfo, VersionTarget};
        let version_parsed = Version::parse(version).unwrap();
        let path = std::path::PathBuf::from(format!("crates/{}", name));
        let manifest_path = std::path::PathBuf::from(format!("crates/{}/Cargo.toml", name));

        let info = PackageInfo {
            name: name.to_string(),
            version: version.to_string(),
            path: path.clone(),
            manifest_path: manifest_path.clone(),
            version_targets: vec![VersionTarget::TomlKey {
                file: manifest_path.clone(),
                key_path: vec!["package".to_string(), "version".to_string()],
            }],
            dependencies: deps.iter().map(|s| s.to_string()).collect(),
        };

        crate::workspace::WorkspacePackage {
            name: name.to_string(),
            version: version_parsed,
            version_string: version.to_string(),
            path,
            manifest_path,
            dependencies: deps.into_iter().map(String::from).collect(),
            info,
        }
    }

    #[test]
    fn test_highest_bump_wins() {
        let changelogs = vec![
            Changelog {
                id: "a".to_string(),
                summary: "patch change".to_string(),
                releases: vec![Release {
                    package: "foo".to_string(),
                    bump: BumpType::Patch,
                }],
                commit: None,
            },
            Changelog {
                id: "b".to_string(),
                summary: "minor change".to_string(),
                releases: vec![Release {
                    package: "foo".to_string(),
                    bump: BumpType::Minor,
                }],
                commit: None,
            },
        ];

        let _config = Config::default();

        let bump_map: HashMap<String, BumpType> = changelogs
            .iter()
            .flat_map(|cs| &cs.releases)
            .fold(HashMap::new(), |mut acc, rel| {
                let current = acc.get(&rel.package).copied();
                let new_bump = match current {
                    Some(existing) => existing.max(rel.bump),
                    None => rel.bump,
                };
                acc.insert(rel.package.clone(), new_bump);
                acc
            });

        assert_eq!(bump_map.get("foo"), Some(&BumpType::Minor));
    }
}
