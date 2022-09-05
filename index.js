const core = require("@actions/core");
const { execSync } = require("child_process");
const { GitHub, context } = require("@actions/github");

const updateOrCreateComment = async (githubClient, commentId, body) => {
  const repoName = context.repo.repo;
  const repoOwner = context.repo.owner;
  const prNumber = context.issue.number;

  if (commentId) {
    return await githubClient.issues.updateComment({
      issue_number: prNumber,
      comment_id: commentId,
      repo: repoName,
      owner: repoOwner,
      body: body,
    });
  }

  return await githubClient.issues.createComment({
    repo: repoName,
    owner: repoOwner,
    body: body,
    issue_number: prNumber,
  });
};

const main = async () => {
  const repoName = context.repo.repo;
  const repoOwner = context.repo.owner;
  const githubToken = core.getInput("github-token");
  const testCommand = core.getInput("test-command") || "npx jest";
  const maxBuffer = 1024 * 1024 * 200;
  const prNumber = context.issue.number;
  const githubClient = new GitHub(githubToken);

  const commentTitle = `<p>Total Coverage: <code>`;

  const issueResponse = await githubClient.issues.listComments({
    issue_number: prNumber,
    repo: repoName,
    owner: repoOwner,
  });

  const existingComment = issueResponse.data.find(function (comment) {
    return (
      comment.user.type === "Bot" && comment.body.indexOf(commentTitle) === 0
    );
  });

  const commentId = existingComment && existingComment.id;

  const execOptions = { maxBuffer };
  const codeCoverage = execSync(testCommand, execOptions).toString();
  let coveragePercentage = execSync(
    "npx coverage-percentage ./coverage/lcov.info --lcov",
    execOptions
  ).toString();
  coveragePercentage = parseFloat(coveragePercentage).toFixed(2);
  const commentBody = `${commentTitle}${coveragePercentage}</code></p>`;

  await updateOrCreateComment(githubClient, commentId, commentBody);
};

main().catch((err) => core.setFailed(err.message));
