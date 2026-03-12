/**
 * TICKET-006 QA: Docker Infrastructure Validation
 * Test Agent — deep validation of Dockerfile, docker-compose.yml, .dockerignore
 * Covers acceptance criteria, structural correctness, security, and edge cases.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

describe('TICKET-006: Dockerfile multi-stage build validation', () => {
  let dockerfile;
  let lines;

  beforeAll(() => {
    dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    lines = dockerfile.split('\n');
  });

  test('AC4: exactly two FROM instructions (multi-stage)', () => {
    const fromLines = lines.filter(l => /^FROM\s/.test(l));
    expect(fromLines).toHaveLength(2);
  });

  test('AC4: both stages use node:20-alpine', () => {
    const fromLines = lines.filter(l => /^FROM\s/.test(l));
    fromLines.forEach(line => {
      expect(line).toMatch(/node:20-alpine/);
    });
  });

  test('deps stage comes before production stage', () => {
    const depsIndex = lines.findIndex(l => /FROM.*AS deps/.test(l));
    const prodIndex = lines.findIndex(l => /FROM.*AS production/.test(l));
    expect(depsIndex).toBeGreaterThanOrEqual(0);
    expect(prodIndex).toBeGreaterThan(depsIndex);
  });

  test('npm ci runs in deps stage, not production stage', () => {
    const prodIndex = lines.findIndex(l => /FROM.*AS production/.test(l));
    const npmCiIndex = lines.findIndex(l => /npm ci/.test(l));
    expect(npmCiIndex).toBeLessThan(prodIndex);
  });

  test('COPY --from=deps references the correct path /app/node_modules', () => {
    expect(dockerfile).toMatch(/COPY --from=deps \/app\/node_modules/);
  });

  test('package files are copied before npm ci (layer caching)', () => {
    const copyPkgIndex = lines.findIndex(l => /COPY package\.json/.test(l));
    const npmCiIndex = lines.findIndex(l => /npm ci/.test(l));
    expect(copyPkgIndex).toBeLessThan(npmCiIndex);
  });

  test('no USER instruction needed for simple app (runs as default)', () => {
    // Not a hard requirement but validates no unexpected USER changes
    const instructions = lines.filter(l => /^[A-Z]+\s/.test(l)).map(l => l.split(/\s/)[0]);
    const validInstructions = ['FROM', 'WORKDIR', 'COPY', 'RUN', 'EXPOSE', 'ENV', 'CMD'];
    instructions.forEach(instr => {
      expect(validInstructions).toContain(instr);
    });
  });

  test('CMD uses exec form (JSON array), not shell form', () => {
    const cmdLine = lines.find(l => /^CMD\s/.test(l));
    expect(cmdLine).toMatch(/^CMD \[/);
  });

  test('no ENTRYPOINT instruction (CMD is the only run instruction)', () => {
    expect(dockerfile).not.toMatch(/^ENTRYPOINT/m);
  });

  test('no ADD instruction used (COPY is preferred)', () => {
    const addLines = lines.filter(l => /^ADD\s/.test(l));
    expect(addLines).toHaveLength(0);
  });
});

describe('TICKET-006: docker-compose.yml structure validation', () => {
  let compose;
  let composeLines;

  beforeAll(() => {
    compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    composeLines = compose.split('\n');
  });

  test('file is valid YAML (no tabs used for indentation)', () => {
    composeLines.forEach((line, i) => {
      if (line.trim().length > 0) {
        expect(line).not.toMatch(/^\t/);
      }
    });
  });

  test('services is a top-level key', () => {
    expect(composeLines[0]).toMatch(/^services:/);
  });

  test('app service has build, ports, and environment keys', () => {
    expect(compose).toMatch(/build:/);
    expect(compose).toMatch(/ports:/);
    expect(compose).toMatch(/environment:/);
  });

  test('port mapping uses string format (recommended for YAML)', () => {
    expect(compose).toMatch(/"3000:3000"/);
  });

  test('no volumes defined (stateless container)', () => {
    expect(compose).not.toMatch(/volumes:/);
  });

  test('no networks defined (default network is sufficient)', () => {
    expect(compose).not.toMatch(/networks:/);
  });

  test('no restart policy defined (keeps it simple)', () => {
    expect(compose).not.toMatch(/restart:/);
  });

  test('no depends_on (single service)', () => {
    expect(compose).not.toMatch(/depends_on:/);
  });

  test('environment uses list format with - prefix', () => {
    expect(compose).toMatch(/-\s+PORT=3000/);
  });
});

describe('TICKET-006: .dockerignore completeness', () => {
  let entries;

  beforeAll(() => {
    const content = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
    entries = content.split('\n').map(l => l.trim()).filter(Boolean);
  });

  test('no duplicate entries', () => {
    const unique = [...new Set(entries)];
    expect(entries).toHaveLength(unique.length);
  });

  test('no negation patterns (! prefix)', () => {
    entries.forEach(entry => {
      expect(entry).not.toMatch(/^!/);
    });
  });

  test('no comment lines counted as entries', () => {
    entries.forEach(entry => {
      expect(entry).not.toMatch(/^#/);
    });
  });

  test('excludes runtime data file (todos.json) so container starts fresh', () => {
    expect(entries).toContain('todos.json');
  });

  test('excludes test infrastructure (tests dir and *.test.js)', () => {
    expect(entries).toContain('tests');
    expect(entries).toContain('*.test.js');
  });

  test('excludes VCS and CI directories (.git, .github)', () => {
    expect(entries).toContain('.git');
    expect(entries).toContain('.github');
  });

  test('excludes secrets (.env)', () => {
    expect(entries).toContain('.env');
  });

  test('critical build files are NOT excluded', () => {
    const excluded = new Set(entries);
    expect(excluded.has('package.json')).toBe(false);
    expect(excluded.has('package-lock.json')).toBe(false);
    expect(excluded.has('src')).toBe(false);
    expect(excluded.has('src/')).toBe(false);
    expect(excluded.has('Dockerfile')).toBe(false);
  });
});

describe('TICKET-006: Build context correctness', () => {
  test('all files referenced in Dockerfile exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'package-lock.json'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'src'))).toBe(true);
    expect(fs.statSync(path.join(ROOT, 'src')).isDirectory()).toBe(true);
  });

  test('src/server.js is the correct entry point', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.main).toBe('src/server.js');
    expect(fs.existsSync(path.join(ROOT, 'src', 'server.js'))).toBe(true);
  });

  test('server.js respects PORT environment variable', () => {
    const server = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
    expect(server).toMatch(/process\.env\.PORT/);
  });

  test('server.js defaults to port 3000 when PORT not set', () => {
    const server = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
    expect(server).toMatch(/3000/);
  });

  test('app.js exports Express app (required by server.js)', () => {
    const app = require(path.join(ROOT, 'src', 'app'));
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  test('health endpoint works (container readiness)', async () => {
    const request = require('supertest');
    const app = require(path.join(ROOT, 'src', 'app'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('storage handles missing todos.json (fresh container)', () => {
    const storageCode = fs.readFileSync(path.join(ROOT, 'src', 'storage.js'), 'utf8');
    expect(storageCode).toMatch(/ENOENT/);
  });

  test('only production dependencies are needed at runtime', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const prodDeps = Object.keys(pkg.dependencies || {});
    // The app only needs express, cors, and uuid at runtime
    expect(prodDeps).toContain('express');
    expect(prodDeps).toContain('cors');
    expect(prodDeps).toContain('uuid');
    // devDependencies should not be needed in the container
    const devDeps = Object.keys(pkg.devDependencies || {});
    expect(devDeps.length).toBeGreaterThan(0); // should have dev deps that are excluded
  });
});

describe('TICKET-006: Security considerations', () => {
  let dockerignore;

  beforeAll(() => {
    dockerignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
  });

  test('.env is excluded from Docker build context', () => {
    expect(dockerignore).toMatch(/^\.env$/m);
  });

  test('.git directory is excluded (no repo history in image)', () => {
    expect(dockerignore).toMatch(/^\.git$/m);
  });

  test('NODE_ENV is set to production in Dockerfile', () => {
    const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/ENV NODE_ENV=production/);
  });

  test('npm ci --only=production excludes dev dependencies', () => {
    const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/npm ci --only=production/);
  });
});
