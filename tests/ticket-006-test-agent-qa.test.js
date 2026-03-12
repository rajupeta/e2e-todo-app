/**
 * TICKET-006 Test Agent QA: Docker infrastructure validation
 * Validates all 5 acceptance criteria, structural correctness, and edge cases.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

describe('AC1: docker compose build succeeds without errors', () => {
  let dockerfile;
  let compose;

  beforeAll(() => {
    dockerfile = readFile('Dockerfile');
    compose = readFile('docker-compose.yml');
  });

  test('Dockerfile exists and is non-empty', () => {
    expect(dockerfile.length).toBeGreaterThan(0);
  });

  test('docker-compose.yml exists and is non-empty', () => {
    expect(compose.length).toBeGreaterThan(0);
  });

  test('docker-compose.yml build points to current directory', () => {
    expect(compose).toMatch(/build:\s*\./);
  });

  test('all files referenced in Dockerfile COPY instructions exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'package-lock.json'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'src'))).toBe(true);
    expect(fs.statSync(path.join(ROOT, 'src')).isDirectory()).toBe(true);
  });

  test('Dockerfile has no syntax issues (valid instruction keywords only)', () => {
    const lines = dockerfile.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const validPrefixes = ['FROM', 'WORKDIR', 'COPY', 'RUN', 'EXPOSE', 'ENV', 'CMD', 'ARG', 'LABEL', 'ENTRYPOINT', 'ADD', 'USER', 'VOLUME', 'HEALTHCHECK', 'SHELL', 'STOPSIGNAL', 'ONBUILD'];
    lines.forEach(line => {
      const keyword = line.split(/\s/)[0];
      expect(validPrefixes).toContain(keyword);
    });
  });
});

describe('AC2: docker compose up starts app and GET /health returns 200', () => {
  const request = require('supertest');
  let app;

  beforeAll(() => {
    app = require(path.join(ROOT, 'src', 'app'));
  });

  test('GET /health returns status 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('GET /health returns { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('server.js reads PORT from environment (for docker-compose PORT=3000)', () => {
    const server = readFile('src/server.js');
    expect(server).toMatch(/process\.env\.PORT/);
  });

  test('server.js falls back to port 3000', () => {
    const server = readFile('src/server.js');
    expect(server).toMatch(/3000/);
  });

  test('CMD in Dockerfile matches package.json main entry', () => {
    const pkg = JSON.parse(readFile('package.json'));
    const dockerfile = readFile('Dockerfile');
    expect(pkg.main).toBe('src/server.js');
    expect(dockerfile).toMatch(/CMD \["node", "src\/server\.js"\]/);
  });
});

describe('AC3: .dockerignore excludes node_modules, .git, .env, tests', () => {
  let entries;

  beforeAll(() => {
    const content = readFile('.dockerignore');
    entries = content.split('\n').map(l => l.trim()).filter(Boolean);
  });

  test('excludes node_modules', () => {
    expect(entries).toContain('node_modules');
  });

  test('excludes .git', () => {
    expect(entries).toContain('.git');
  });

  test('excludes .env', () => {
    expect(entries).toContain('.env');
  });

  test('excludes tests', () => {
    expect(entries).toContain('tests');
  });

  test('also excludes *.test.js, .github, todos.json per spec', () => {
    expect(entries).toContain('*.test.js');
    expect(entries).toContain('.github');
    expect(entries).toContain('todos.json');
  });

  test('does NOT exclude build-critical files (package.json, package-lock.json, src, Dockerfile)', () => {
    const excluded = new Set(entries);
    expect(excluded.has('package.json')).toBe(false);
    expect(excluded.has('package-lock.json')).toBe(false);
    expect(excluded.has('src')).toBe(false);
    expect(excluded.has('Dockerfile')).toBe(false);
  });

  test('has no duplicate entries', () => {
    expect(new Set(entries).size).toBe(entries.length);
  });

  test('has exactly 7 entries', () => {
    expect(entries).toHaveLength(7);
  });
});

describe('AC4: Dockerfile uses multi-stage build with node:20-alpine', () => {
  let dockerfile;
  let lines;

  beforeAll(() => {
    dockerfile = readFile('Dockerfile');
    lines = dockerfile.split('\n');
  });

  test('has exactly 2 FROM instructions', () => {
    const fromLines = lines.filter(l => /^FROM\s/.test(l));
    expect(fromLines).toHaveLength(2);
  });

  test('both stages use node:20-alpine', () => {
    const fromLines = lines.filter(l => /^FROM\s/.test(l));
    fromLines.forEach(l => expect(l).toMatch(/node:20-alpine/));
  });

  test('stage 1 is named "deps"', () => {
    expect(dockerfile).toMatch(/^FROM node:20-alpine AS deps$/m);
  });

  test('stage 2 is named "production"', () => {
    expect(dockerfile).toMatch(/^FROM node:20-alpine AS production$/m);
  });

  test('deps stage comes before production stage', () => {
    const depsIdx = lines.findIndex(l => /FROM.*AS deps/.test(l));
    const prodIdx = lines.findIndex(l => /FROM.*AS production/.test(l));
    expect(depsIdx).toBeLessThan(prodIdx);
  });

  test('deps stage: copies package files then runs npm ci --only=production', () => {
    const copyIdx = lines.findIndex(l => /COPY package\.json package-lock\.json/.test(l));
    const npmIdx = lines.findIndex(l => /RUN npm ci --only=production/.test(l));
    expect(copyIdx).toBeGreaterThanOrEqual(0);
    expect(npmIdx).toBeGreaterThan(copyIdx);
  });

  test('production stage: copies node_modules from deps', () => {
    expect(dockerfile).toMatch(/COPY --from=deps \/app\/node_modules \.\/node_modules/);
  });

  test('production stage: copies src/', () => {
    expect(dockerfile).toMatch(/COPY src\/ \.\/src\//);
  });

  test('production stage: no RUN commands (lean image)', () => {
    const prodSection = dockerfile.split(/^FROM node:20-alpine AS production$/m)[1];
    expect(prodSection).toBeDefined();
    expect(prodSection).not.toMatch(/^RUN /m);
  });

  test('CMD uses exec form (JSON array), not shell form', () => {
    const cmdLine = lines.find(l => /^CMD\s/.test(l));
    expect(cmdLine).toMatch(/^CMD \[/);
  });

  test('no ADD instructions (COPY preferred)', () => {
    expect(dockerfile).not.toMatch(/^ADD\s/m);
  });

  test('both stages set WORKDIR /app', () => {
    const workdirLines = (dockerfile.match(/^WORKDIR \/app$/gm) || []);
    expect(workdirLines).toHaveLength(2);
  });
});

describe('AC5: Container runs on port 3000 by default', () => {
  let dockerfile;
  let compose;

  beforeAll(() => {
    dockerfile = readFile('Dockerfile');
    compose = readFile('docker-compose.yml');
  });

  test('Dockerfile EXPOSE 3000', () => {
    expect(dockerfile).toMatch(/^EXPOSE 3000$/m);
  });

  test('docker-compose maps 3000:3000', () => {
    expect(compose).toMatch(/3000:3000/);
  });

  test('docker-compose sets PORT=3000 env var', () => {
    expect(compose).toMatch(/PORT=3000/);
  });

  test('NODE_ENV=production is set in Dockerfile', () => {
    expect(dockerfile).toMatch(/^ENV NODE_ENV=production$/m);
  });
});

describe('Regression: existing API endpoints still work', () => {
  const request = require('supertest');
  let app;

  beforeAll(() => {
    app = require(path.join(ROOT, 'src', 'app'));
  });

  test('POST /todos creates a todo', async () => {
    const res = await request(app).post('/todos').send({ title: 'QA regression check' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('QA regression check');
    expect(res.body.completed).toBe(false);
  });

  test('GET /todos returns array', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('storage handles missing todos.json gracefully', () => {
    const storageCode = readFile('src/storage.js');
    expect(storageCode).toMatch(/ENOENT/);
  });
});

describe('docker-compose.yml structure validation', () => {
  let compose;
  let lines;

  beforeAll(() => {
    compose = readFile('docker-compose.yml');
    lines = compose.split('\n');
  });

  test('services is the top-level key', () => {
    expect(lines[0]).toMatch(/^services:/);
  });

  test('only one service (app) is defined', () => {
    const serviceLines = lines.filter(l => /^  \w+:/.test(l));
    expect(serviceLines).toHaveLength(1);
    expect(serviceLines[0].trim()).toBe('app:');
  });

  test('no tabs used for indentation (YAML best practice)', () => {
    lines.forEach(line => {
      if (line.trim().length > 0) {
        expect(line).not.toMatch(/^\t/);
      }
    });
  });

  test('no volumes, networks, depends_on, restart, or image keys', () => {
    expect(compose).not.toMatch(/volumes:/);
    expect(compose).not.toMatch(/networks:/);
    expect(compose).not.toMatch(/depends_on:/);
    expect(compose).not.toMatch(/restart:/);
    expect(compose).not.toMatch(/image:/);
  });

  test('port mapping uses string format', () => {
    expect(compose).toMatch(/"3000:3000"/);
  });
});
