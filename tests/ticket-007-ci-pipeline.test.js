const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * TICKET-007 Test Agent QA: GitHub Actions CI Pipeline
 *
 * Validates the CI workflow file against all acceptance criteria,
 * tests the install script, and checks for edge cases.
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
describe('AC1: Workflow file exists and is valid YAML', () => {
  test('workflow content file exists', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  test('file is non-empty', () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('no tab characters (YAML spec forbids tabs for indentation)', () => {
    expect(content).not.toMatch(/\t/);
  });

  test('has required top-level keys: name, on, jobs', () => {
    expect(content).toMatch(/^name:/m);
    expect(content).toMatch(/^on:/m);
    expect(content).toMatch(/^jobs:/m);
  });

  test('indentation uses consistent 2-space increments', () => {
    const badLines = lines.filter(line => {
      if (line.trim() === '' || line.trim().startsWith('#')) return false;
      const leading = line.match(/^( *)/)[1].length;
      return leading % 2 !== 0;
    });
    expect(badLines).toEqual([]);
  });

  test('no syntax issues with colons in unquoted values', () => {
    // Ensure action references use proper format
    const usesLines = lines.filter(l => l.includes('uses:'));
    for (const line of usesLines) {
      expect(line).toMatch(/uses:\s*[\w\-]+\/[\w\-]+@v\d+/);
    }
  });
});

// ---------------------------------------------------------------------------
// AC2: Pipeline triggers on push to main and pull requests
// ---------------------------------------------------------------------------
describe('AC2: Trigger configuration', () => {
  test('triggers on push to main branch', () => {
    expect(content).toMatch(/push:\s*\n\s+branches:\s*\[main\]/);
  });

  test('triggers on pull_request to main branch', () => {
    expect(content).toMatch(/pull_request:\s*\n\s+branches:\s*\[main\]/);
  });

  test('on: block does not use wildcard branches', () => {
    const onBlock = content.match(/^on:\s*\n([\s\S]*?)(?=^jobs:)/m);
    expect(onBlock).not.toBeNull();
    expect(onBlock[1]).not.toMatch(/branches:\s*\[?\s*\*/);
  });
});

// ---------------------------------------------------------------------------
// AC3: Pipeline installs dependencies with npm ci
// ---------------------------------------------------------------------------
describe('AC3: Dependency installation with npm ci', () => {
  test('npm ci is used in test job', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    expect(testJob[0]).toMatch(/run:\s*npm ci/);
  });

  test('npm ci is used in build job', () => {
    const buildJobIdx = content.indexOf('\n  build:');
    expect(buildJobIdx).toBeGreaterThan(-1);
    const buildJobContent = content.slice(buildJobIdx);
    expect(buildJobContent).toMatch(/run:\s*npm ci/);
  });

  test('npm install is never used (npm ci preferred for CI)', () => {
    const allRunLines = lines.filter(l => l.match(/run:\s*npm/));
    const installLines = allRunLines.filter(l => l.match(/npm\s+install/));
    expect(installLines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC4: Pipeline runs npm test
// ---------------------------------------------------------------------------
describe('AC4: Test execution', () => {
  test('test job has npm test step', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    expect(testJob[0]).toMatch(/run:\s*npm test/);
  });

  test('npm test runs after npm ci in the test job', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    const jobContent = testJob[0];
    const ciPos = jobContent.indexOf('npm ci');
    const testPos = jobContent.indexOf('npm test');
    expect(ciPos).toBeGreaterThan(-1);
    expect(testPos).toBeGreaterThan(-1);
    expect(testPos).toBeGreaterThan(ciPos);
  });
});

// ---------------------------------------------------------------------------
// AC5: Checkout and Node.js 20 setup steps
// ---------------------------------------------------------------------------
describe('AC5: Checkout and Node.js 20 setup', () => {
  test('uses actions/checkout@v4 in both jobs', () => {
    const matches = content.match(/uses:\s*actions\/checkout@v4/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('uses actions/setup-node@v4 in both jobs', () => {
    const matches = content.match(/uses:\s*actions\/setup-node@v4/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('Node.js version is set to 20', () => {
    const matches = content.match(/node-version:\s*20/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('checkout is the first step in the test job', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    const firstUses = testJob[0].match(/uses:\s*(\S+)/);
    expect(firstUses).not.toBeNull();
    expect(firstUses[1]).toBe('actions/checkout@v4');
  });

  test('checkout is the first step in the build job', () => {
    const buildJobIdx = content.indexOf('\n  build:');
    expect(buildJobIdx).toBeGreaterThan(-1);
    const buildJobContent = content.slice(buildJobIdx);
    const firstUses = buildJobContent.match(/uses:\s*(\S+)/);
    expect(firstUses).not.toBeNull();
    expect(firstUses[1]).toBe('actions/checkout@v4');
  });

  test('setup-node immediately follows checkout in test job', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    const usesMatches = [...testJob[0].matchAll(/uses:\s*(\S+)/g)].map(m => m[1]);
    expect(usesMatches[0]).toBe('actions/checkout@v4');
    expect(usesMatches[1]).toBe('actions/setup-node@v4');
  });
});

// ---------------------------------------------------------------------------
// Job structure
// ---------------------------------------------------------------------------
describe('Pipeline job structure', () => {
  test('has test and build jobs', () => {
    const jobMatches = content.match(/^\s{2}(\w+):/gm);
    expect(jobMatches).not.toBeNull();
    const jobNames = jobMatches.map(m => m.trim().replace(':', ''));
    expect(jobNames).toContain('test');
    expect(jobNames).toContain('build');
  });

  test('both jobs use ubuntu-latest runner', () => {
    const matches = content.match(/runs-on:\s*ubuntu-latest/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBe(2);
  });

  test('build job depends on test job via needs', () => {
    expect(content).toMatch(/needs:\s*test/);
  });

  test('test job runs independently (no needs)', () => {
    const testJob = content.match(/^\s{2}test:\s*\n([\s\S]*?)(?=^\s{2}build:)/m);
    expect(testJob).not.toBeNull();
    expect(testJob[1]).not.toMatch(/needs:/);
  });

  test('build job verifies app can start with node require', () => {
    expect(content).toMatch(/node\s+-e\s+["']require\(['"]\.\/src\/app['"]\)["']/);
  });
});

// ---------------------------------------------------------------------------
// Install script validation
// ---------------------------------------------------------------------------
describe('Install script for OAuth workaround', () => {
  test('install script exists', () => {
    expect(fs.existsSync(installScriptPath)).toBe(true);
  });

  test('script creates .github/workflows directory', () => {
    const script = fs.readFileSync(installScriptPath, 'utf8');
    expect(script).toMatch(/mkdir\s+-p\s+\.github\/workflows/);
  });

  test('script copies workflow to canonical location', () => {
    const script = fs.readFileSync(installScriptPath, 'utf8');
    expect(script).toMatch(/cp\s+.*ci-workflow-content\.yml\s+\.github\/workflows\/ci\.yml/);
  });

  test('script uses set -e for error handling', () => {
    const script = fs.readFileSync(installScriptPath, 'utf8');
    expect(script).toMatch(/set\s+-e/);
  });

  test('script has a shebang line', () => {
    const script = fs.readFileSync(installScriptPath, 'utf8');
    expect(script.startsWith('#!/')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------
describe('Workflow quality checks', () => {
  test('workflow has a meaningful name', () => {
    const nameMatch = content.match(/^name:\s*(.+)/m);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch[1].trim().length).toBeGreaterThan(0);
  });

  test('all steps have descriptive names', () => {
    const stepNames = content.match(/- name:\s*(.+)/g);
    expect(stepNames).not.toBeNull();
    expect(stepNames.length).toBeGreaterThanOrEqual(8); // 4 steps per job x 2 jobs
    for (const step of stepNames) {
      const name = step.replace('- name:', '').trim();
      expect(name.length).toBeGreaterThan(2);
    }
  });

  test('file ends with a newline', () => {
    expect(content.endsWith('\n')).toBe(true);
  });

  test('no trailing whitespace', () => {
    const trailingWS = lines.filter(l => l !== l.trimEnd());
    expect(trailingWS).toEqual([]);
  });

  test('no Windows-style line endings', () => {
    expect(content).not.toMatch(/\r\n/);
    expect(content).not.toMatch(/\r/);
  });
});
