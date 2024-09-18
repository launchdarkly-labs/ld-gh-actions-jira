import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./main";
import JiraApi from "jira-client";

jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("jira-client");

describe("Jira Issue Linker Action", () => {
  const mockGetInput = core.getInput as jest.MockedFunction<
    typeof core.getInput
  >;
  const mockSetFailed = core.setFailed as jest.MockedFunction<
    typeof core.setFailed
  >;
  const mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
  const mockGetOctokit = github.getOctokit as jest.MockedFunction<
    typeof github.getOctokit
  >;

  let mockOctokit: any;
  let mockJiraClient: jest.Mocked<JiraApi>;

  beforeEach(() => {
    jest.resetAllMocks();
    github.context.payload = {
      pull_request: {
        number: 1,
        title: "Test PR",
        head: { ref: "feature/TEST-123-new-feature" },
      },
    };

    Object.defineProperty(github.context, "repo", {
      value: { owner: "testowner", repo: "testrepo" },
      configurable: true,
    });

    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "jira-base-url":
          return "mock-jira-url";
        case "jira-api-token":
          return "mock-api-token";
        default:
          return "";
      }
    });

    mockOctokit = {
      rest: {
        pulls: {
          update: jest.fn().mockResolvedValue({}),
        },
        issues: {
          createComment: jest.fn().mockResolvedValue({}),
        },
      },
    };
    mockGetOctokit.mockReturnValue(mockOctokit);

    mockJiraClient = {
      findIssue: jest.fn().mockResolvedValue({
        fields: { summary: "Test Jira Issue" },
      }),
    } as unknown as jest.Mocked<JiraApi>;
    (JiraApi as jest.MockedClass<typeof JiraApi>).mockImplementation(
      () => mockJiraClient
    );
  });

  it("should update PR title and add comment when Jira issue is found", async () => {
    await run();

    expect(mockGetOctokit).toHaveBeenCalledWith("mock-token");
    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      pull_number: 1,
      title: "[TEST-123] Test PR",
    });
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      body: expect.stringContaining("TEST-123"),
    });
  });

  it("should not update PR title if Jira issue key is already present", async () => {
    github.context.payload.pull_request!.title = "[TEST-123] Test PR";

    await run();

    expect(mockOctokit.rest.pulls.update).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
  });

  it("should warn if no Jira issue key is found", async () => {
    github.context.payload.pull_request!.head.ref = "feature/no-issue-key";
    github.context.payload.pull_request!.title = "PR without issue key";

    await run();

    expect(mockWarning).toHaveBeenCalledWith(
      "No Jira issue key found in branch name or PR title"
    );
    expect(mockOctokit.rest.pulls.update).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("should handle errors and set action as failed", async () => {
    const mockError = new Error("Test error");
    mockGetOctokit.mockImplementation(() => {
      throw mockError;
    });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith("Test error");
  });
});
