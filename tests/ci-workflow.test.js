const fs = require('fs');
const path = require('path');

describe('GitHub Actions CI workflow', () => {
  let content;
  let yaml;
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');

  beforeAll(() => {
    content = fs.readFileSync(workflowPath, 'utf8');
    // Simple YAML-like parsing for validation (no external dependency needed)
    yaml = content;
  });

  test('ci.yml file exists and is readable', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  test('triggers on push to main', () => {
    expect(yaml).toMatch(/on:/);
    expect(yaml).toMatch(/push:/);
    expect(yaml).toMatch(/branches:.*\[?main\]?/);
  });

  test('triggers on pull requests to main', () => {
    expect(yaml).toMatch(/pull_request:/);
  });

  test('has a test job that runs on ubuntu-latest', () => {
    expect(yaml).toMatch(/test:/);
    expect(yaml).toMatch(/runs-on:\s*ubuntu-latest/);
  });

  test('uses actions/checkout@v4', () => {
    expect(yaml).toMatch(/uses:\s*actions\/checkout@v4/);
  });

  test('sets up Node.js 20 with actions/setup-node@v4', () => {
    expect(yaml).toMatch(/uses:\s*actions\/setup-node@v4/);
    expect(yaml).toMatch(/node-version:\s*20/);
  });

  test('installs dependencies with npm ci', () => {
    expect(yaml).toMatch(/run:\s*npm ci/);
  });

  test('runs npm test', () => {
    expect(yaml).toMatch(/run:\s*npm test/);
  });

  test('has a build job that depends on test', () => {
    expect(yaml).toMatch(/build:/);
    expect(yaml).toMatch(/needs:\s*test/);
  });

  test('build job verifies app can start', () => {
    expect(yaml).toMatch(/require\('\.\/src\/app'\)/);
  });

  test('is valid YAML structure (no tabs, proper indentation)', () => {
    // YAML does not allow tabs
    expect(yaml).not.toMatch(/\t/);
    // Should have the basic YAML structure
    expect(yaml).toMatch(/^name:/m);
    expect(yaml).toMatch(/^on:/m);
    expect(yaml).toMatch(/^jobs:/m);
  });
});
