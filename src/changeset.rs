use crate::error::{Error, Result};
use crate::BumpType;
use rand::Rng;
use std::collections::HashMap;
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
pub struct Changeset {
    pub id: String,
    pub summary: String,
    pub releases: Vec<Release>,
}

#[derive(Debug, Clone)]
pub struct Release {
    pub package: String,
    pub bump: BumpType,
}

pub fn parse(id: &str, content: &str) -> Result<Changeset> {
    let content = content.trim();

    if !content.starts_with("---") {
        return Err(Error::ChangesetParse(
            id.to_string(),
            "missing frontmatter".to_string(),
        ));
    }

    let rest = &content[3..];
    let end = rest.find("---").ok_or_else(|| {
        Error::ChangesetParse(id.to_string(), "missing frontmatter end".to_string())
    })?;

    let frontmatter = &rest[..end].trim();
    let summary = rest[end + 3..].trim().to_string();

    let releases_map: HashMap<String, BumpType> = serde_yaml::from_str(frontmatter)?;

    let releases = releases_map
        .into_iter()
        .map(|(package, bump)| Release { package, bump })
        .collect();

    Ok(Changeset {
        id: id.to_string(),
        summary,
        releases,
    })
}

pub fn serialize(changeset: &Changeset) -> String {
    let mut frontmatter = String::new();
    for release in &changeset.releases {
        frontmatter.push_str(&format!("{}: {}\n", release.package, release.bump));
    }

    format!("---\n{}---\n\n{}\n", frontmatter, changeset.summary)
}

pub fn read_all(changeset_dir: &Path) -> Result<Vec<Changeset>> {
    let mut changesets = Vec::new();

    if !changeset_dir.exists() {
        return Ok(changesets);
    }

    for entry in std::fs::read_dir(changeset_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "md") {
            let filename = path.file_stem().unwrap().to_string_lossy().to_string();

            if filename == "README" {
                continue;
            }

            let content = std::fs::read_to_string(&path)?;
            let changeset = parse(&filename, &content)?;
            changesets.push(changeset);
        }
    }

    Ok(changesets)
}

pub fn write(changeset_dir: &Path, changeset: &Changeset) -> Result<()> {
    let path = changeset_dir.join(format!("{}.md", changeset.id));
    let content = serialize(changeset);
    std::fs::write(path, content)?;
    Ok(())
}

pub fn delete(changeset_dir: &Path, id: &str) -> Result<()> {
    let path = changeset_dir.join(format!("{}.md", id));
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_changeset() {
        let content = r#"---
my-crate: minor
other-crate: patch
---

Added new feature X.

Fixed bug Y.
"#;

        let changeset = parse("test-changeset", content).unwrap();
        assert_eq!(changeset.id, "test-changeset");
        assert_eq!(changeset.releases.len(), 2);
        assert!(changeset.summary.contains("Added new feature X"));
    }

    #[test]
    fn test_serialize_changeset() {
        let changeset = Changeset {
            id: "test".to_string(),
            summary: "Test summary".to_string(),
            releases: vec![
                Release {
                    package: "my-crate".to_string(),
                    bump: BumpType::Minor,
                },
            ],
        };

        let serialized = serialize(&changeset);
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
