import * as core from "@actions/core";
import * as github from "@actions/github";
import JiraApi from "jira-client";

export async function run() {
  try {
    const githubToken = core.getInput("github-token", { required: true });
    const jiraBaseUrl = core.getInput("jira-base-url", { required: true });
    const jiraUsername = core.getInput("jira-username", { required: true });
    const jiraApiToken = core.getInput("jira-api-token", { required: true });
    const updateDescription =
      core.getBooleanInput("update-description", { required: false }) || false;

    const octokit = github.getOctokit(githubToken);

    // Parse the Jira base URL to extract the host
    const jiraHost = new URL(jiraBaseUrl).hostname;

    const jira = new JiraApi({
      protocol: "https",
      host: jiraHost,
      username: jiraUsername,
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

    // Prepare the content with issue details
    const jiraContent = `
<!-- ld-jira-link -->
Related Jira issue: [${jiraIssueKey}]: [${issue.fields.summary}](${issueUrl})
    `.trim();

    if (updateDescription) {
      // Update PR description
      const currentBody = pull_request.body || "";
      const jiraFooterRegex =
        /\n*<!-- ld-jira-link -->\nRelated Jira issue:.*$/s;

      // Format Jira content with footer separator
      const formattedJiraContent = `\n\n---\n${jiraContent}`;

      let newBody;
      if (jiraFooterRegex.test(currentBody)) {
        // Replace existing Jira footer, ensuring we don't duplicate the separator
        newBody = currentBody.replace(jiraFooterRegex, formattedJiraContent);
      } else {
        // Add Jira content as a footer
        newBody = currentBody
          ? `${currentBody}${formattedJiraContent}`
          : jiraContent;
      }

      // Clean up any potential duplicate separators that might have accumulated
      newBody = newBody.replace(/\n---\n---\n/g, "\n---\n");

      await octokit.rest.pulls.update({
        ...github.context.repo,
        pull_number: pull_request.number,
        body: newBody,
      });
    } else {
      // Check for existing comment
      const existingComments = await octokit.rest.issues.listComments({
        ...github.context.repo,
        issue_number: pull_request.number,
      });

      const existingComment = existingComments.data.find(
        (comment) =>
          comment.body?.includes(`Related Jira issue: [${jiraIssueKey}]`) ??
          false
      );

      if (existingComment) {
        // Only update if the comment body is different
        if (existingComment.body !== jiraContent) {
          await octokit.rest.issues.updateComment({
            ...github.context.repo,
            comment_id: existingComment.id,
            body: jiraContent,
          });
        } else {
          core.info("Existing comment is up to date. No update needed.");
        }
      } else {
        // Create new comment
        await octokit.rest.issues.createComment({
          ...github.context.repo,
          issue_number: pull_request.number,
          body: jiraContent,
        });
      }
    }
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
