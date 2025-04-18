// Jest test suite for the commit message validator GitHub Action
const core = require('@actions/core');
const github = require('@actions/github');

// Mock the @actions/core and @actions/github modules
jest.mock('@actions/core');
jest.mock('@actions/github');

// Original script to test
const fs = require('fs');
const path = require('path');
const scriptPath = path.resolve(__dirname, '../commit-message-validator.js');

describe('Commit Message Validator', () => {
  let mockOctokit;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock the context
    github.context = {
      repo: {
        owner: 'testOwner',
        repo: 'testRepo'
      },
      payload: {
        pull_request: {
          number: 123
        }
      }
    };
    
    // Mock octokit
    mockOctokit = {
      rest: {
        pulls: {
          listCommits: jest.fn()
        }
      }
    };
    
    github.getOctokit.mockReturnValue(mockOctokit);
  });
  
  test('should validate commits with valid messages', async () => {
    // Setup valid commits
    mockOctokit.rest.pulls.listCommits.mockResolvedValue({
      data: [
        {
          sha: '1234567890abcdef',
          commit: { message: 'feat: add new feature' }
        },
        {
          sha: 'abcdef1234567890',
          commit: { message: 'fix(core): resolve issue with authentication' }
        },
        {
          sha: '0987654321fedcba',
          commit: { message: 'docs: update README' }
        }
      ]
    });
    
    // Set inputs
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'pattern') return '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(\\w+\\))?: .+$';
      return '';
    });
    
    // Execute the action script
    jest.isolateModules(() => {
      require(scriptPath);
    });
    
    // Check that no errors were reported
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledTimes(4); // Once per commit + summary message
  });
  
  test('should fail on invalid commit messages', async () => {
    // Setup invalid commits
    mockOctokit.rest.pulls.listCommits.mockResolvedValue({
      data: [
        {
          sha: '1234567890abcdef',
          commit: { message: 'added new feature' } // Missing type
        },
        {
          sha: 'abcdef1234567890',
          commit: { message: 'fix: ' } // Empty description
        },
        {
          sha: '0987654321fedcba',
          commit: { message: 'invalid: this type is not allowed' } // Invalid type
        }
      ]
    });
    
    // Set inputs
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'pattern') return '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(\\w+\\))?: .+$';
      return '';
    });
    
    // Execute the action script
    jest.isolateModules(() => {
      require(scriptPath);
    });
    
    // Check that errors were reported
    expect(core.error).toHaveBeenCalledTimes(3); // Once per invalid commit
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed.mock.calls[0][0]).toContain('One or more commits have invalid message format');
  });
  
  test('should accept custom pattern', async () => {
    // Setup commits
    mockOctokit.rest.pulls.listCommits.mockResolvedValue({
      data: [
        {
          sha: '1234567890abcdef',
          commit: { message: 'FEATURE: add new component' } // Custom format
        },
        {
          sha: 'abcdef1234567890',
          commit: { message: 'BUGFIX: fix login issue' } // Custom format
        }
      ]
    });
    
    // Set custom pattern input
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'pattern') return '^(FEATURE|BUGFIX|DOC): .+$';
      return '';
    });
    
    // Execute the action script
    jest.isolateModules(() => {
      require(scriptPath);
    });
    
    // Check that no errors were reported
    expect(core.error).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledTimes(3); // Once per commit + summary message
  });
  
  test('should skip validation when no PR found', async () => {
    // Set context with no PR
    github.context = {
      repo: {
        owner: 'testOwner',
        repo: 'testRepo'
      },
      payload: {
        pull_request: null
      }
    };
    
    // Set inputs
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'mock-token';
      return '';
    });
    
    // Execute the action script
    jest.isolateModules(() => {
      require(scriptPath);
    });
    
    // Check that no commits were checked
    expect(mockOctokit.rest.pulls.listCommits).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith('No pull request found. Skipping commit message validation.');
  });
  
  test('should handle GitHub API errors gracefully', async () => {
    // Simulate API error
    mockOctokit.rest.pulls.listCommits.mockRejectedValue(new Error('API Error'));
    
    // Set inputs
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'mock-token';
      return '';
    });
    
    // Execute the action script
    jest.isolateModules(() => {
      require(scriptPath);
    });
    
    // Check that the error was handled
    expect(core.setFailed).toHaveBeenCalledWith('Action failed with error: API Error');
  });
});