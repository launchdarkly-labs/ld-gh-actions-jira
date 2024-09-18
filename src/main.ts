import * as core from "@actions/core";
import * as github from "@actions/github";
import JiraApi from "jira-client";

export async function run() {
  try {
    const githubToken = core.getInput("github-token", { required: true });
    const jiraBaseUrl = core.getInput("jira-base-url", { required: true });
    const jiraApiToken = core.getInput("jira-api-token", { required: true });

    const octokit = github.getOctokit(githubToken);

    // Parse the Jira base URL to extract the host
    const jiraHost = new URL(jiraBaseUrl).hostname;

    const jira = new JiraApi({
      protocol: "https",
      host: jiraHost,
      username: "hbarrow@launchdarkly.com", // This is a placeholder, not the actual username
      password: jiraApiToken,
      apiVersion: "2",
      strictSSL: true,
    });

    const { pull_request } = github.context.payload;
    if (!pull_request) {
      throw new Error("This action can only be run on pull request events");
    }

    const branchName = pull_request.head.ref;
    const prTitle = pull_request.title;

    // Parse Jira issue key from branch name or PR title
    const jiraIssueKeyRegex = /([A-Z]+-\d+)/;
    const match =
      branchName.match(jiraIssueKeyRegex) || prTitle.match(jiraIssueKeyRegex);

    if (!match) {
      core.warning("No Jira issue key found in branch name or PR title");
      return;
    }

    const jiraIssueKey = match[1];

    // Add Jira issue key to PR title if not already present
    if (!prTitle.includes(jiraIssueKey)) {
      const newTitle = `[${jiraIssueKey}] ${prTitle}`;
      await octokit.rest.pulls.update({
        ...github.context.repo,
        pull_number: pull_request.number,
        title: newTitle,
      });
    }

    // Get Jira issue details
    const issue = await jira.findIssue(jiraIssueKey);
    const issueUrl = `${jiraBaseUrl}/browse/${jiraIssueKey}`;

    // Comment on PR with Jira issue link
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: pull_request.number,
      body: `Related Jira issue: [${jiraIssueKey}](${issueUrl})\n\n${issue.fields.summary}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

// Call run() at the end of the file if it's the main module
if (require.main === module) {
  run();
}
