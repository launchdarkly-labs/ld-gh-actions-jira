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
          return "https://mock-jira-url";
        case "jira-username":
          return "mock-username";
        case "jira-api-token":
          return "mock-api-token";
        case "update-description":
          return "false";
        default:
          return "";
      }
    });

    mockOctokit = {
      rest: {
        pulls: {
          update: jest.fn().mockResolvedValue({ data: {} }),
        },
        issues: {
          createComment: jest.fn().mockResolvedValue({ data: {} }),
          listComments: jest.fn().mockResolvedValue({ data: [] }),
          updateComment: jest.fn().mockResolvedValue({ data: {} }),
        },
      },
    };
    mockGetOctokit.mockReturnValue(mockOctokit);

    mockJiraClient = {
      findIssue: jest.fn().mockResolvedValue({
        key: "TEST-123",
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
    expect(mockOctokit.rest.issues.listComments).toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      body: expect.stringContaining("TEST-123"),
    });
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

  describe("when update-description is true", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<
        typeof core.getBooleanInput
      >;
      mockGetBooleanInput.mockReturnValue(true);

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
            return "https://mock-jira-url";
          case "jira-username":
            return "mock-username";
          case "jira-api-token":
            return "mock-api-token";
          default:
            return "";
        }
      });

      mockOctokit = {
        rest: {
          pulls: {
            update: jest.fn().mockResolvedValue({ data: {} }),
          },
          issues: {
            createComment: jest.fn().mockResolvedValue({ data: {} }),
            listComments: jest.fn().mockResolvedValue({ data: [] }),
            updateComment: jest.fn().mockResolvedValue({ data: {} }),
          },
        },
      };
      mockGetOctokit.mockReturnValue(mockOctokit);

      mockJiraClient = {
        findIssue: jest.fn().mockResolvedValue({
          key: "TEST-123",
          fields: { summary: "Test Jira Issue" },
        }),
      } as unknown as jest.Mocked<JiraApi>;
      (JiraApi as jest.MockedClass<typeof JiraApi>).mockImplementation(
        () => mockJiraClient
      );
    });

    it("should update PR description when no existing Jira section exists", async () => {
      github.context.payload.pull_request!.title = "[TEST-123] Test PR";
      github.context.payload.pull_request!.body = "Original description";

      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "testowner",
          repo: "testrepo",
          pull_number: 1,
          body: "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Test Jira Issue](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->",
        })
      );
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it("should update existing Jira section in PR description", async () => {
      github.context.payload.pull_request!.title = "[TEST-123] Test PR";
      github.context.payload.pull_request!.body =
        "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Old summary](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->";

      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "testowner",
          repo: "testrepo",
          pull_number: 1,
          body: "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Test Jira Issue](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->",
        })
      );
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it("should handle multiple runs without creating duplicate sections", async () => {
      github.context.payload.pull_request!.title = "[TEST-123] Test PR";
      github.context.payload.pull_request!.body =
        "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Old summary](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Old summary](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->";

      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "testowner",
          repo: "testrepo",
          pull_number: 1,
          body: "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Test Jira Issue](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->",
        })
      );
      // Verify no duplicate sections exist in the result
      const updateCall = mockOctokit.rest.pulls.update.mock.calls[0][0];
      const occurrences = (
        updateCall.body.match(/<!-- ld-jira-link -->/g) || []
      ).length;
      expect(occurrences).toBe(1);
    });

    it("should create PR description if none exists", async () => {
      github.context.payload.pull_request!.title = "[TEST-123] Test PR";
      github.context.payload.pull_request!.body = "";

      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "testowner",
          repo: "testrepo",
          pull_number: 1,
          body: "<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Test Jira Issue](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->",
        })
      );
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it("should update both title and description when title needs updating", async () => {
      github.context.payload.pull_request!.title = "Test PR";
      github.context.payload.pull_request!.body = "Original description";

      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.pulls.update).toHaveBeenNthCalledWith(1, {
        owner: "testowner",
        repo: "testrepo",
        pull_number: 1,
        title: "[TEST-123] Test PR",
      });
      expect(mockOctokit.rest.pulls.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          owner: "testowner",
          repo: "testrepo",
          pull_number: 1,
          body: "Original description\n\n<!-- ld-jira-link -->\n---\nRelated Jira issue: [TEST-123]: [Test Jira Issue](https://mock-jira-url/browse/TEST-123)\n<!-- end-ld-jira-link -->",
        })
      );
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });
  });
});
