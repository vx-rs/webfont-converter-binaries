## Description

Explain the package metadata, validation, legal, or release automation change.

## How to test

```sh
npm run format:check
npm run lint
npm test
```

## Review checklist

- [ ] The PR title follows Conventional Commits.
- [ ] All six target manifests remain synchronized.
- [ ] Version-maintenance changes preserve `npm run version:update` behavior.
- [ ] Repository tooling uses native ESM TypeScript with erasable syntax only.
- [ ] Package `os`, `cpu`, executable, repository, and file allowlists agree.
- [ ] No Rust source, private logs, or unapproved artifacts are included.
- [ ] Release changes validate every target before any wrapper dispatch.
- [ ] License, notice, checksum, and provenance requirements remain intact.

[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/
