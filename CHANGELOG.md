# Changelog

## `changelogs@0.5.0`

### Minor Changes

- Added support for creating git tags without registry tokens, allowing the tool to be used for version management even when package publishing is not configured. (by @jxom, [#29](https://github.com/wevm/changelogs/pull/29))

## `changelogs@0.4.2`

### Patch Changes

- Fixed release mode to run without requiring registry tokens, allowing tag creation and GitHub releases for all projects. (by @BrendanRyan, [#27](https://github.com/wevm/changelogs/pull/27))

## `changelogs@0.4.1`

### Patch Changes

- Fixed release notes formatting by adding blank line before GitHub extras section. (by @jxom, [#24](https://github.com/wevm/changelogs-rs/pull/24))
- Fixed error message when ecosystem is not detected to provide clear instructions with the --ecosystem flag, and added -e shorthand for the ecosystem argument. (by @jxom, [#24](https://github.com/wevm/changelogs-rs/pull/24))

## `changelogs@0.4.0`

### Minor Changes

- Added `changelogs up` command for self-update functionality and improved install script with automatic PATH configuration for multiple shells. (by @jxom, [#20](https://github.com/wevm/changelogs-rs/pull/20))

## `changelogs@0.3.0`

### Minor Changes

- Added Python ecosystem support with both PEP 621 and Poetry formats. (by @BrendanRyan, [#17](https://github.com/wevm/changelogs-rs/pull/17))

## `changelogs@0.2.1`

### Patch Changes

- Fixed action. (by @jxom, [411d91e](https://github.com/wevm/changelogs-rs/commit/411d91e))

## `changelogs@0.2.0`

### Minor Changes

- Added automatic installation of changelogs binary in GitHub Actions with caching support, and simplified action inputs by removing customizable version/publish commands in favor of hardcoded changelogs commands. (by @jxom, [#10](https://github.com/wevm/changelogs-rs/pull/10))

## `changelogs@0.1.1`

### Patch Changes

- Fixed GitHub releases to use changelog content from CHANGELOG.md instead of auto-generated notes. (by @jxom, [#7](https://github.com/wevm/changelogs-rs/pull/7))

## `changelogs@0.1.0`

### Minor Changes

- Added AI-assisted changelog generation. Users can now generate changelog entries from git diffs using the `--ai` flag with commands like `changelogs add --ai "claude -p"`. Includes a GitHub Action for automated PR changelog generation and configuration options for custom AI commands and instructions. (by @jxom, [e8740e8](https://github.com/wevm/changelogs-rs/commit/e8740e8))

### Patch Changes

- Updated README with improved workflow documentation, added mermaid diagram showing development and release process, documented AI changelog generation with GitHub Actions setup, and clarified the Release Candidate workflow. (by @jxom, [e8740e8](https://github.com/wevm/changelogs-rs/commit/e8740e8))

## `changelogs@0.0.1`

### Patch Changes

- Initial release (by @jxom, [59a7a96](https://github.com/wevm/changelogs-rs/commit/59a7a96))

