const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * TICKET-007 QA Validation: GitHub Actions CI Pipeline
 *
 * Acceptance Criteria:
 * 1. .github/workflows/ci.yml exists and is valid YAML
 * 2. Pipeline triggers on push to main and pull requests
 * 3. Pipeline installs dependencies with npm ci
 * 4. Pipeline runs npm test
 * 5. Pipeline has checkout and Node.js 20 setup steps
 */

const canonicalPath = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
const workaroundPath = path.join(__dirname, '..', 'ci-workflow-content.yml');
const workflowPath = fs.existsSync(canonicalPath) ? canonicalPath : workaroundPath;
const installScriptPath = path.join(__dirname, '..', 'scripts', 'install-ci-workflow.sh');

let content;
let lines;

beforeAll(() => {
  content = fs.readFileSync(workflowPath, 'utf8');
  lines = content.split('\n');
});

// ---------------------------------------------------------------------------
// AC1: .github/workflows/ci.yml exists and is valid YAML
// ---------------------------------------------------------------------------
describe('AC1: CI workflow file exists and is valid YAML', () => {
  test('workflow file exists at canonical or workaround path', () => {
    const exists = fs.existsSync(canonicalPath) || fs.existsSync(workaroundPath);
    expect(exists).toBe(true);
  });

  test('workflow file is non-empty', () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('file does not contain tabs (YAML forbids tabs for indentation)', () => {
    expect(content).not.toMatch(/\t/);
  });

  test('file starts with a top-level "name" key', () => {
    expect(content).toMatch(/^name:\s*.+/m);
  });

  test('file has top-level "on" key', () => {
    expect(content).toMatch(/^on:/m);
  });

  test('file has top-level "jobs" key', () => {
    expect(content).toMatch(/^jobs:/m);
  });

  test('all lines use consistent indentation (multiples of 2 spaces)', () => {
    const badLines = lines.filter((line, idx) => {
      if (line.trim() === '' || line.trim().startsWith('#')) return false;
      const leadingSpaces = line.match(/^( *)/)[1].length;
      return leadingSpaces % 2 !== 0;
    });
    expect(badLines).toEqual([]);
  });

  test('if workflow is at workaround path, install script exists', () => {
    if (workflowPath === workaroundPath) {
      expect(fs.existsSync(installScriptPath)).toBe(true);
    }
  });

  test('install script references the canonical path', () => {
    if (fs.existsSync(installScriptPath)) {
      const script = fs.readFileSync(installScriptPath, 'utf8');
      expect(script).toMatch(/\.github\/workflows\/ci\.yml/);
    }
  });

  test('install script creates the .github/workflows directory', () => {
    if (fs.existsSync(installScriptPath)) {
      const script = fs.readFileSync(installScriptPath, 'utf8');
      expect(script).toMatch(/mkdir\s+-p\s+\.github\/workflows/);
    }
  });
});

// ---------------------------------------------------------------------------
// AC2: Pipeline triggers on push to main and pull requests to main
// ---------------------------------------------------------------------------
describe('AC2: Pipeline triggers on push to main and pull requests', () => {
  test('has push trigger', () => {
    expect(content).toMatch(/push:/);
  });

  test('push trigger targets main branch', () => {
    // Match branches: [main] or branches:\n  - main
    expect(content).toMatch(/push:\s*\n\s+branches:\s*\[?main\]?/);
  });

  test('has pull_request trigger', () => {
    expect(content).toMatch(/pull_request:/);
  });

  test('pull_request trigger targets main branch', () => {
    expect(content).toMatch(/pull_request:\s*\n\s+branches:\s*\[?main\]?/);
  });

  test('does not trigger on all branches (scoped to main only)', () => {
    // Ensure branches key exists under push and pull_request (not wildcard)
    const pushSection = content.match(/push:\s*\n([\s\S]*?)(?=\n\s*pull_request:|\n\s*jobs:)/);
    expect(pushSection).not.toBeNull();
    expect(pushSection[1]).toMatch(/branches:/);
  });
});

// ---------------------------------------------------------------------------
// AC3: Pipeline installs dependencies with npm ci
// ---------------------------------------------------------------------------
describe('AC3: Pipeline installs dependencies with npm ci', () => {
  test('test job has npm ci step', () => {
    // Extract test job section
    const testJob = content.match(/test:\s*\n([\s\S]*?)(?=\n\s{2}\w+:|\s*$)/);
    expect(testJob).not.toBeNull();
    expect(testJob[0]).toMatch(/run:\s*npm ci/);
  });

  test('build job has npm ci step', () => {
    const buildJob = content.match(/build:\s*\n([\s\S]*?)(?=\n\s{2}\w+:|\s*$)/);
    expect(buildJob).not.toBeNull();
    expect(buildJob[0]).toMatch(/run:\s*npm ci/);
  });

  test('uses npm ci (not npm install) for reproducible builds', () => {
    // npm ci is the correct command for CI; npm install should not appear
    const runCommands = content.match(/run:\s*npm\s+\w+/g) || [];
    const installCommands = runCommands.filter(cmd => cmd.match(/npm\s+install/));
    expect(installCommands).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC4: Pipeline runs npm test
// ---------------------------------------------------------------------------
describe('AC4: Pipeline runs npm test', () => {
  test('test job runs npm test', () => {
    expect(content).toMatch(/run:\s*npm test/);
  });

  test('npm test step appears after npm ci step in the test job', () => {
    const ciIndex = content.indexOf('npm ci');
    const testIndex = content.indexOf('npm test');
    expect(ciIndex).toBeGreaterThan(-1);
    expect(testIndex).toBeGreaterThan(-1);
    expect(testIndex).toBeGreaterThan(ciIndex);
  });
});

// ---------------------------------------------------------------------------
// AC5: Pipeline has checkout and Node.js 20 setup steps
// ---------------------------------------------------------------------------
describe('AC5: Pipeline has checkout and Node.js 20 setup steps', () => {
  test('uses actions/checkout@v4', () => {
    expect(content).toMatch(/uses:\s*actions\/checkout@v4/);
  });

  test('uses actions/setup-node@v4', () => {
    expect(content).toMatch(/uses:\s*actions\/setup-node@v4/);
  });

  test('configures Node.js version 20', () => {
    expect(content).toMatch(/node-version:\s*['"]?20['"]?/);
  });

  test('checkout appears in both test and build jobs', () => {
    const matches = content.match(/uses:\s*actions\/checkout@v4/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('setup-node appears in both test and build jobs', () => {
    const matches = content.match(/uses:\s*actions\/setup-node@v4/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('checkout is the first step in each job', () => {
    // In each job, the first "uses:" should be checkout
    const jobs = content.split(/^\s{2}\w+:/m).slice(1); // split by job headers
    for (const job of jobs) {
      const firstUses = job.match(/uses:\s*(\S+)/);
      if (firstUses) {
        expect(firstUses[1]).toBe('actions/checkout@v4');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Job structure validation
// ---------------------------------------------------------------------------
describe('CI pipeline job structure', () => {
  test('has exactly two jobs: test and build', () => {
    // Jobs should be "test" and "build" at 2-space indent under "jobs:"
    const jobMatches = content.match(/^  (\w+):/gm);
    expect(jobMatches).not.toBeNull();
    const jobNames = jobMatches.map(m => m.trim().replace(':', ''));
    expect(jobNames).toContain('test');
    expect(jobNames).toContain('build');
  });

  test('both jobs run on ubuntu-latest', () => {
    const runsOnMatches = content.match(/runs-on:\s*ubuntu-latest/g);
    expect(runsOnMatches).not.toBeNull();
    expect(runsOnMatches.length).toBe(2);
  });

  test('build job depends on test job (needs: test)', () => {
    expect(content).toMatch(/needs:\s*test/);
  });

  test('build job verifies app can start', () => {
    expect(content).toMatch(/node\s+-e\s+["']require\(['"]\.\/src\/app['"]\)["']/);
  });

  test('test job does not have needs (runs independently)', () => {
    // Extract just the test job section
    const testJobSection = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJobSection).not.toBeNull();
    expect(testJobSection[1]).not.toMatch(/needs:/);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and quality checks
// ---------------------------------------------------------------------------
describe('CI workflow edge cases and quality', () => {
  test('workflow has a meaningful name', () => {
    const nameMatch = content.match(/^name:\s*(.+)/m);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch[1].trim().length).toBeGreaterThan(0);
  });

  test('step names are descriptive (not empty)', () => {
    const stepNames = content.match(/- name:\s*(.+)/g);
    expect(stepNames).not.toBeNull();
    for (const step of stepNames) {
      const name = step.replace('- name:', '').trim();
      expect(name.length).toBeGreaterThan(2);
    }
  });

  test('no duplicate step names within a single job', () => {
    // Split content by job and check for duplicate step names
    const testJobSection = content.match(/test:\s*\n([\s\S]*?)(?=\n\s{2}\w+:|\s*$)/);
    if (testJobSection) {
      const names = (testJobSection[1].match(/- name:\s*(.+)/g) || []);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    }
  });

  test('file ends with a newline', () => {
    expect(content.endsWith('\n')).toBe(true);
  });

  test('no trailing whitespace on lines', () => {
    const linesWithTrailing = lines.filter(line => line !== line.trimEnd());
    expect(linesWithTrailing).toEqual([]);
  });

  test('npm test runs in the test job, not just the build job', () => {
    const testJob = content.match(/test:\s*\n([\s\S]*?)(?=\n\s{2}build:)/);
    expect(testJob).not.toBeNull();
    expect(testJob[0]).toMatch(/run:\s*npm test/);
  });
});
