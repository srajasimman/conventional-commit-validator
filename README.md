# Conventional Commit Validator

A GitHub Action that validates commit messages in pull requests to ensure they follow the [Conventional Commits](https://www.conventionalcommits.org/) format.

## Features

- Validates each commit message in a pull request
- Customizable regex pattern for validation
- Detailed error messages pinpointing problematic commits
- Fails the workflow when invalid commit messages are found

## Usage

Create a workflow file (e.g., `.github/workflows/validate-commits.yml`) with the following content:

```yaml
name: Validate Commit Messages

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate-commits:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
          
      - name: Validate Commit Messages
        uses: srajasimman/conventional-commit-validator@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| github-token | GitHub token for API access | Yes | `${{ github.token }}` |
| pattern | Regex pattern for commit message validation | No | `^(feat\|fix\|docs\|style\|refactor\|perf\|test\|build\|ci\|chore\|revert)(\(\w+\))?: .+$` |

## Customizing the Pattern

You can customize the regex pattern used for validation:

```yaml
- name: Validate Commit Messages
  uses: srajasimman/conventional-commit-validator@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    pattern: '^(feat|fix|docs)(\(\w+\))?: .+$'  # Only allow feat, fix, docs types
```

## Default Conventional Commits Format

The default pattern validates the following format:
```
<type>[optional scope]: <description>
```

Where `type` is one of:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Changes that don't affect code meaning (formatting, etc.)
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Code change that improves performance
- test: Adding or fixing tests
- build: Changes to build system or dependencies
- ci: Changes to CI configuration files and scripts
- chore: Other changes that don't modify src or test files
- revert: Reverts a previous commit

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.