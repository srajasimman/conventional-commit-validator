const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Get inputs from workflow
    const token = core.getInput('github-token', { required: true });

    const mergeBranchPattern = 'Merge branch [\'"][^\'"]+[\'"] into [^\\s]+';
    const revertPattern = 'Revert ".*"';
    const createPrPattern = 'Create PR for #\\d+';
    const types = [
      'feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert'
    ].join('|');
    const conventionalPattern = `(?:(${types})(\\([a-z0-9\\-]+\\))?(!)?: .*)`;

    const defaultPattern = `^(${mergeBranchPattern}|${revertPattern}${createPrPattern ? '|' + createPrPattern : ''}|${conventionalPattern})$`;
    const pattern = core.getInput('pattern') || defaultPattern;
    const regexPattern = new RegExp(pattern);

    // Create octokit client
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Get current PR
    const pullRequest = context.payload.pull_request;
    if (!pullRequest) {
      core.info('No pull request found. Skipping commit message validation.');
      return;
    }

    // Get commits in PR
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequest.number,
    });

    let hasError = false;
    let errorMessages = [];

    // Validate each commit message
    commits.forEach((commit) => {
      const commitMessage = commit.commit.message.split('\n')[0].trim();
      const sha = commit.sha.substring(0, 7);

      if (!regexPattern.test(commitMessage)) {
        const errorMsg = `❌ Commit ${sha} has an invalid message format: "${commitMessage}"`;
        core.error(errorMsg);
        errorMessages.push(errorMsg);
        hasError = true;
      } else {
        core.info(`✅ Commit ${sha} has a valid message: "${commitMessage}"`);
      }
    });

    // Fail the workflow if errors are found
    if (hasError) {
      const errorSummary = `One or more commits have invalid message format.\n${errorMessages.join('\n')}\n\nPlease follow the Conventional Commits format: <type>[optional scope]: <description>\nExample: feat(auth): add login functionality\n\nFor more information, visit: https://www.conventionalcommits.org/`;
      // comment on the PR with the error summary
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pullRequest.number,
        body: errorSummary,
      });
      core.info('Commented on PR with error summary.');
      // Set the action as failed
      core.setFailed(errorSummary);
    } else {
      core.info('✅ All commit messages have valid format.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
