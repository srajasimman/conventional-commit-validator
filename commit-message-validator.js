const core = require('@actions/core');
const github = require('@actions/github');

function buildDefaultPattern() {
  const mergeBranchPattern = 'Merge branch [\'"][^\'"]+[\'"] into [^\\s]+';
  const revertPattern = 'Revert ".*"';
  const types = [
    'feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert',
  ].join('|');
  // Scope allows lowercase/uppercase letters, digits, underscores, slashes, and hyphens
  const conventionalPattern = `(?:(${types})(\\([a-zA-Z0-9_/\\-]+\\))?(!)?: .+)`;
  return `^(${mergeBranchPattern}|${revertPattern}|${conventionalPattern})$`;
}

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });

    const defaultPattern = buildDefaultPattern();
    const rawPattern = core.getInput('pattern') || defaultPattern;

    let regexPattern;
    try {
      regexPattern = new RegExp(rawPattern);
    } catch (e) {
      core.setFailed(`Invalid regex pattern provided: ${e.message}`);
      return;
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    const pullRequest = context.payload.pull_request;
    if (!pullRequest) {
      core.info('No pull request found. Skipping commit message validation.');
      return;
    }

    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequest.number,
    });

    if (commits.length === 0) {
      core.info('No commits found in this pull request. Skipping validation.');
      return;
    }

    let hasError = false;
    const errorMessages = [];

    commits.forEach((commit) => {
      const message = commit.commit.message;
      if (!message) {
        core.warning(`Commit ${commit.sha.substring(0, 7)} has an empty message, skipping.`);
        return;
      }
      const commitMessage = message.split('\n')[0].trim();
      const sha = commit.sha.substring(0, 7);

      if (!regexPattern.test(commitMessage)) {
        // Escape backticks to avoid breaking markdown code spans in PR comments
        const safeMessage = commitMessage.replace(/`/g, '\\`');
        errorMessages.push(`- ❌ \`${sha}\`: "${safeMessage}"`);
        hasError = true;
      } else {
        core.info(`✅ Commit ${sha} has a valid message: "${commitMessage}"`);
      }
    });

    if (hasError) {
      const errorSummary = [
        'One or more commits have invalid message format.',
        '',
        errorMessages.join('\n'),
        '',
        'Please follow the Conventional Commits format: `<type>[optional scope]: <description>`',
        'Example: `feat(auth): add login functionality`',
        '',
        'For more information, visit: https://www.conventionalcommits.org/',
      ].join('\n');

      try {
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: pullRequest.number,
          body: errorSummary,
        });
        core.info('Commented on PR with error summary.');
      } catch (commentError) {
        core.warning(`Failed to post PR comment: ${commentError.message}`);
      }

      core.setFailed(errorSummary);
    } else {
      core.info('✅ All commit messages have valid format.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
