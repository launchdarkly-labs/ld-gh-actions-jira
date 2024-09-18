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

## Usage

Once you've set up the workflow, the action will run automatically on every pull request event (when opened, edited, or synchronized). No further action is required.

## Inputs

## Inputs

| Input            | Description                                                        | Required |
| ---------------- | ------------------------------------------------------------------ | -------- |
| `github-token`   | GitHub token for authentication                                    | Yes      |
| `jira-base-url`  | Your Jira instance URL (e.g., `https://your-domain.atlassian.net`) | Yes      |
| `jira-username`  | Your Jira username (usually your email address)                    | Yes      |
| `jira-api-token` | Jira API token for authentication                                  | Yes      |

## Example

When a pull request is created with the branch name `feature/PROJ-123-new-feature` and the title "Implement new feature", the action will:

1. Update the PR title to "[PROJ-123] Implement new feature"
2. Add a comment to the PR with a link to the Jira issue and its summary

## Development

To set up the project for development:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Make your changes in the `src` directory
4. Run `npm run build` to compile the TypeScript code
5. Run `npm test` to run the tests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
