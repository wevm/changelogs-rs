use crate::error::{Error, Result};
use crate::BumpType;
use rand::Rng;

use std::path::Path;

const ADJECTIVES: &[&str] = &[
    "brave", "calm", "dark", "eager", "fair", "gentle", "happy", "icy", "jolly", "keen",
    "lively", "merry", "nice", "odd", "proud", "quick", "rare", "shy", "tall", "unique",
    "vast", "warm", "young", "zesty", "bold", "cool", "dry", "easy", "fast", "good",
    "hot", "kind", "lazy", "mild", "neat", "old", "plain", "quiet", "rich", "safe",
    "tidy", "ugly", "vain", "weak", "aged", "big", "cute", "dull", "evil", "fine",
];

const NOUNS: &[&str] = &[
    "lions", "bears", "wolves", "eagles", "hawks", "foxes", "deer", "owls", "cats", "dogs",
    "birds", "fish", "frogs", "bees", "ants", "mice", "rats", "bats", "crows", "doves",
    "ducks", "geese", "hens", "pigs", "cows", "goats", "sheep", "horses", "mules", "donkeys",
    "tigers", "pandas", "koalas", "seals", "whales", "sharks", "crabs", "clams", "snails", "slugs",
    "trees", "rocks", "waves", "winds", "clouds", "stars", "moons", "suns", "hills", "lakes",
];

const VERBS: &[&str] = &[
    "dance", "sing", "jump", "run", "walk", "swim", "fly", "crawl", "climb", "slide",
    "roll", "spin", "twist", "shake", "wave", "bow", "nod", "wink", "smile", "laugh",
    "cry", "shout", "whisper", "hum", "buzz", "roar", "growl", "bark", "meow", "chirp",
    "play", "rest", "sleep", "wake", "eat", "drink", "cook", "bake", "read", "write",
    "draw", "paint", "build", "break", "fix", "clean", "wash", "dry", "fold", "pack",
];

pub fn generate_id() -> String {
    let mut rng = rand::rng();
    let adj = ADJECTIVES[rng.random_range(0..ADJECTIVES.len())];
    let noun = NOUNS[rng.random_range(0..NOUNS.len())];
    let verb = VERBS[rng.random_range(0..VERBS.len())];
    format!("{}-{}-{}", adj, noun, verb)
}

#[derive(Debug, Clone)]
pub struct Changelog {
    pub id: String,
    pub summary: String,
    pub releases: Vec<Release>,
    pub commit: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Release {
    pub package: String,
    pub bump: BumpType,
}

pub fn parse(id: &str, content: &str) -> Result<Changelog> {
    let content = content.trim();

    if !content.starts_with("---") {
        return Err(Error::ChangelogParse(
            id.to_string(),
            "missing frontmatter".to_string(),
        ));
    }

    let rest = &content[3..];
    let end = rest.find("---").ok_or_else(|| {
        Error::ChangelogParse(id.to_string(), "missing frontmatter end".to_string())
    })?;

    let frontmatter = &rest[..end].trim();
    let summary = rest[end + 3..].trim().to_string();

    let frontmatter_value: serde_yaml::Value = serde_yaml::from_str(frontmatter)?;
    
    let commit = frontmatter_value
        .get("commit")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut releases = Vec::new();
    if let serde_yaml::Value::Mapping(map) = frontmatter_value {
        for (key, value) in map {
            if let (serde_yaml::Value::String(package), serde_yaml::Value::String(bump_str)) = (key, value) {
                if package == "commit" {
                    continue;
                }
                let bump: BumpType = bump_str.parse().map_err(|_| {
                    Error::ChangelogParse(id.to_string(), format!("invalid bump type: {}", bump_str))
                })?;
                releases.push(Release { package, bump });
            }
        }
    }

    Ok(Changelog {
        id: id.to_string(),
        summary,
        releases,
        commit,
    })
}

pub fn serialize(changelog: &Changelog) -> String {
    let mut frontmatter = String::new();
    for release in &changelog.releases {
        frontmatter.push_str(&format!("{}: {}\n", release.package, release.bump));
    }

    format!("---\n{}---\n\n{}\n", frontmatter, changelog.summary)
}

pub struct CommitInfo {
    pub pr_number: Option<u32>,
    pub commit_sha: String,
    pub authors: Vec<String>,
}

pub fn get_commit_info(_changelog_dir: &Path, id: &str) -> Option<CommitInfo> {
    let file_path = format!(".changelog/{}.md", id);
    
    let output = std::process::Command::new("git")
        .args(["log", "--follow", "--diff-filter=A", "--format=%H %s", "-1", "--", &file_path])
        .output()
        .ok()?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.trim();
    
    if line.is_empty() {
        return None;
    }
    
    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() < 2 {
        return None;
    }
    
    let commit_sha = parts[0].to_string();
    let commit_message = parts[1];
    
    let pr_number = extract_pr_number(commit_message);
    
    let authors = get_commit_authors(&file_path);
    
    Some(CommitInfo {
        pr_number,
        commit_sha,
        authors,
    })
}

fn get_commit_authors(file_path: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["log", "--follow", "--format=%aN", "--", file_path])
        .output()
        .ok();
    
    let Some(output) = output else {
        return Vec::new();
    };
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut authors: Vec<String> = stdout
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    
    authors.sort();
    authors.dedup();
    authors
}

fn extract_pr_number(message: &str) -> Option<u32> {
    let re = regex::Regex::new(r"\(#(\d+)\)").ok()?;
    re.captures(message)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse().ok())
}

pub fn read_all(changelog_dir: &Path) -> Result<Vec<Changelog>> {
    let mut changelogs = Vec::new();

    if !changelog_dir.exists() {
        return Ok(changelogs);
    }

    for entry in std::fs::read_dir(changelog_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "md") {
            let filename = path.file_stem().unwrap().to_string_lossy().to_string();

            if filename == "README" {
                continue;
            }

            let content = std::fs::read_to_string(&path)?;
            let changelog = parse(&filename, &content)?;
            changelogs.push(changelog);
        }
    }

    Ok(changelogs)
}

pub fn write(changelog_dir: &Path, changelog: &Changelog) -> Result<()> {
    let path = changelog_dir.join(format!("{}.md", changelog.id));
    let content = serialize(changelog);
    std::fs::write(path, content)?;
    Ok(())
}

pub fn delete(changelog_dir: &Path, id: &str) -> Result<()> {
    let path = changelog_dir.join(format!("{}.md", id));
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_changelog() {
        let content = r#"---
my-crate: minor
other-crate: patch
---

Added new feature X.

Fixed bug Y.
"#;

        let changelog = parse("test-changelog", content).unwrap();
        assert_eq!(changelog.id, "test-changelog");
        assert_eq!(changelog.releases.len(), 2);
        assert!(changelog.summary.contains("Added new feature X"));
    }

    #[test]
    fn test_serialize_changelog() {
        let changelog = Changelog {
            id: "test".to_string(),
            summary: "Test summary".to_string(),
            releases: vec![
                Release {
                    package: "my-crate".to_string(),
                    bump: BumpType::Minor,
                },
            ],
            commit: None,
        };

        let serialized = serialize(&changelog);
        assert!(serialized.contains("my-crate: minor"));
        assert!(serialized.contains("Test summary"));
    }

    #[test]
    fn test_generate_id() {
        let id = generate_id();
        let parts: Vec<_> = id.split('-').collect();
        assert_eq!(parts.len(), 3);
    }
}
