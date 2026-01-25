use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("not in a Cargo workspace")]
    NotInWorkspace,

    #[error("changelogs already initialized")]
    AlreadyInitialized,

    #[error("changelogs not initialized - run `changelogs init` first")]
    NotInitialized,

    #[error("invalid bump type: {0}")]
    InvalidBumpType(String),

    #[error("package not found: {0}")]
    PackageNotFound(String),

    #[error("failed to parse changelog {0}: {1}")]
    ChangelogParse(String, String),

    #[error("failed to parse config: {0}")]
    ConfigParse(String),

    #[error("no packages selected")]
    NoPackagesSelected,

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("toml parse error: {0}")]
    TomlParse(#[from] toml::de::Error),

    #[error("toml edit error: {0}")]
    TomlEdit(#[from] toml_edit::TomlError),

    #[error("yaml parse error: {0}")]
    YamlParse(#[from] serde_yaml::Error),

    #[error("cargo metadata error: {0}")]
    CargoMetadata(#[from] cargo_metadata::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
