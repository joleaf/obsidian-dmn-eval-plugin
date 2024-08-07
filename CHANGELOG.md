# Changelog

All changes to this plugin are listed here.

## 0.4.2 (2024-08-01)

### Updated

- Fixed an issue with null pointer exceptions

## 0.4.1 (2024-04-29)

### Updated

- Update to camunda 7.21.0

## 0.4.0 (2024-01-01)

### Updated

- Update to camunda 7.20.0
- Parse number and boolean values
- added the `textafter` parameter

## 0.3.0 (2023-08-23)

### Updated

- Update to camunda 7.19.0

### Added

- Add more title and text options
- Render the result with a template note

## 0.2.2 (2023-02-12)

### Fixed

- Plugin name without "plugin"

## 0.2.1 (2023-02-06)

### Fixed

- Use the `manifest.dir` and the `vault.getBasePath()` function

## 0.2.0 (2023-02-01)

### New

- Add `variables` as parameter for the input values

## 0.1.4 (2023-01-12)

### Fixed

- #1 use `ctx.sourcePath` to get the frontmatter data

## 0.1.3 (2023-01-01)

### Changed

- Use obsidian parseYaml
- Jar file is created on plugin load from base64 string

## 0.1.2 (2022-12-12)

### Changed

- parameters all lowercase
- Desktop only = true

## 0.1.1 (2022-12-12)

### Added

- Improve error handling & messages
- Add "title" and "noResultMessage" parameter

## 0.1.0 (2022-12-12)

### Added

- Base functionality to execute DMNs