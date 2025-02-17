# Jira Issue Linker Action

This GitHub Action automatically links Jira issues to pull requests by updating the PR title and adding a comment with the Jira issue details.

## Features

- Parses Jira issue keys from PR branch names and titles
- Adds the Jira issue key to the PR title if not already present
- Comments on the PR with a link to the Jira issue, its summary, and description

## Setup

1. Create a Jira API token:

   - Log in to https://id.atlassian.com/manage/api-tokens
   - Click "Create API token"
   - Give it a name and click "Create"
   - Copy the token value

2. Add the following secrets to your GitHub repository:

   - `JIRA_BASE_URL`: Your Jira instance URL (e.g., `https://your-domain.atlassian.net`)
   - `JIRA_USERNAME`: Your Jira username (usually your email address)
   - `JIRA_API_TOKEN`: The API token you created in step 1

3. Create a new workflow file (e.g., `.github/workflows/jira-link.yml`) in your repository:

```yaml
name: Jira Issue Linker

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  jira-issue-link:
    runs-on: ubuntu-latest
    steps:
      - uses: launchdarkly-labs/ld-gh-actions-jira@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-username: ${{ secrets.JIRA_USERNAME }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
          update-description: false # Optional: set to true to update PR description instead of commenting
```

## Usage

Once you've set up the workflow, the action will run automatically on every pull request event (when opened, edited, or synchronized). No further action is required.

The action can be configured to either add a comment with the Jira issue details (default behavior) or update the PR description with the information. This can be controlled using the `update-description` input.

## Inputs

| Input                | Description                                                        | Required | Default |
| -------------------- | ------------------------------------------------------------------ | -------- | ------- |
| `github-token`       | GitHub token for authentication                                    | Yes      | N/A     |
| `jira-base-url`      | Your Jira instance URL (e.g., `https://your-domain.atlassian.net`) | Yes      | N/A     |
| `jira-username`      | Your Jira username (usually your email address)                    | Yes      | N/A     |
| `jira-api-token`     | Jira API token for authentication                                  | Yes      | N/A     |
| `update-description` | Update PR description instead of adding a comment                  | No       | false   |

## Example

When a pull request is created with the branch name `feature/PROJ-123-new-feature` and the title "Implement new feature", the action will:

1. Update the PR title to "[PROJ-123] Implement new feature"
2. Either:
   - Add a comment to the PR with a link to the Jira issue and its summary (default behavior)
   - Update the PR description to include the Jira issue link and summary (if `update-description` is set to true)

### Example with Description Update

To configure the action to update the PR description instead of commenting:

```yaml
name: Jira Issue Linker

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  jira-issue-link:
    runs-on: ubuntu-latest
    steps:
      - uses: launchdarkly-labs/ld-gh-actions-jira@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-username: ${{ secrets.JIRA_USERNAME }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
          update-description: true # This will update the PR description instead of commenting
```

When using `update-description: true`, the action will:

1. Add the Jira issue information to the end of the PR description if no Jira section exists
2. Update the existing Jira section if one is already present
3. Create a new PR description with just the Jira information if no description exists

## Development

To set up the project for development:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Make your changes in the `src` directory
4. Run `npm run build` to compile the TypeScript code
5. Run `npm test` to run the tests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
