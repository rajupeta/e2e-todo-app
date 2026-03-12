/**
 * TICKET-006 QA Validation: Dockerfile, docker-compose.yml, .dockerignore
 * Test Agent — validates all acceptance criteria, edge cases, and structural correctness.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('TICKET-006 QA: Dockerfile acceptance criteria', () => {
  let dockerfile;

  beforeAll(() => {
    dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
  });

  test('AC4: uses multi-stage build with node:20-alpine', () => {
    const fromLines = dockerfile.match(/^FROM .+$/gm);
    expect(fromLines).not.toBeNull();
    expect(fromLines.length).toBe(2);
    expect(fromLines[0]).toMatch(/^FROM node:20-alpine AS deps$/);
    expect(fromLines[1]).toMatch(/^FROM node:20-alpine AS production$/);
  });

  test('Stage 1 (deps): copies package.json and package-lock.json', () => {
    expect(dockerfile).toMatch(/COPY package\.json package-lock\.json \.\//);
  });

  test('Stage 1 (deps): runs npm ci --only=production', () => {
    expect(dockerfile).toMatch(/RUN npm ci --only=production/);
  });

  test('Stage 2 (production): copies node_modules from deps stage', () => {
    expect(dockerfile).toMatch(/COPY --from=deps \/app\/node_modules \.\/node_modules/);
  });

  test('Stage 2 (production): copies src/ directory', () => {
    expect(dockerfile).toMatch(/COPY src\/ \.\/src\//);
  });

  test('AC5: exposes port 3000', () => {
    expect(dockerfile).toMatch(/^EXPOSE 3000$/m);
  });

  test('sets NODE_ENV=production environment variable', () => {
    expect(dockerfile).toMatch(/^ENV NODE_ENV=production$/m);
  });

  test('CMD runs node src/server.js', () => {
    expect(dockerfile).toMatch(/^CMD \["node", "src\/server\.js"\]$/m);
  });

  test('both stages set WORKDIR /app', () => {
    const workdirLines = dockerfile.match(/^WORKDIR \/app$/gm);
    expect(workdirLines).not.toBeNull();
    expect(workdirLines.length).toBe(2);
  });

  test('does not copy unnecessary files to production stage', () => {
    // After the production FROM, there should only be COPY for node_modules and src/
    const productionStage = dockerfile.split(/^FROM node:20-alpine AS production$/m)[1];
    expect(productionStage).toBeDefined();
    const copyLines = productionStage.match(/^COPY .+$/gm);
    expect(copyLines).not.toBeNull();
    expect(copyLines.length).toBe(2);
    expect(copyLines[0]).toMatch(/node_modules/);
    expect(copyLines[1]).toMatch(/src\//);
  });

  test('does not include RUN commands in production stage (lean image)', () => {
    const productionStage = dockerfile.split(/^FROM node:20-alpine AS production$/m)[1];
    const runLines = productionStage.match(/^RUN .+$/gm);
    expect(runLines).toBeNull();
  });
});

describe('TICKET-006 QA: docker-compose.yml acceptance criteria', () => {
  let compose;

  beforeAll(() => {
    compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
  });

  test('starts with services top-level key', () => {
    expect(compose).toMatch(/^services:/m);
  });

  test('defines an app service under services', () => {
    expect(compose).toMatch(/^\s+app:/m);
  });

  test('AC1: builds from current directory (.)', () => {
    expect(compose).toMatch(/build:\s*\./);
  });

  test('AC5: maps port 3000:3000', () => {
    expect(compose).toMatch(/["']?3000:3000["']?/);
  });

  test('sets PORT=3000 environment variable', () => {
    expect(compose).toMatch(/PORT=3000/);
  });

  test('does not reference external images (builds locally)', () => {
    expect(compose).not.toMatch(/image:/);
  });

  test('does not define unnecessary services', () => {
    // Only 'app' service should be defined
    const serviceMatches = compose.match(/^\s{2}\w+:/gm);
    expect(serviceMatches).not.toBeNull();
    expect(serviceMatches.length).toBe(1);
    expect(serviceMatches[0].trim()).toBe('app:');
  });
});

describe('TICKET-006 QA: .dockerignore acceptance criteria', () => {
  let dockerignore;
  let entries;

  beforeAll(() => {
    dockerignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
    entries = dockerignore.split('\n').map(l => l.trim()).filter(Boolean);
  });

  test('AC3: excludes node_modules', () => {
    expect(entries).toContain('node_modules');
  });

  test('AC3: excludes .git', () => {
    expect(entries).toContain('.git');
  });

  test('AC3: excludes .env', () => {
    expect(entries).toContain('.env');
  });

  test('AC3: excludes tests directory', () => {
    expect(entries).toContain('tests');
  });

  test('excludes *.test.js files', () => {
    expect(entries).toContain('*.test.js');
  });

  test('excludes .github directory', () => {
    expect(entries).toContain('.github');
  });

  test('excludes todos.json (container starts fresh)', () => {
    expect(entries).toContain('todos.json');
  });

  test('does NOT exclude src/ (needed for the app)', () => {
    expect(entries).not.toContain('src');
    expect(entries).not.toContain('src/');
  });

  test('does NOT exclude package.json (needed for deps stage)', () => {
    expect(entries).not.toContain('package.json');
  });

  test('does NOT exclude package-lock.json (needed for deps stage)', () => {
    expect(entries).not.toContain('package-lock.json');
  });

  test('has exactly the 7 specified exclusions', () => {
    expect(entries.length).toBe(7);
  });
});

describe('TICKET-006 QA: Dockerfile correctness for this project', () => {
  test('server.js exists at the path CMD references (src/server.js)', () => {
    expect(fs.existsSync(path.join(ROOT, 'src', 'server.js'))).toBe(true);
  });

  test('server.js uses PORT env var (matches docker-compose PORT=3000)', () => {
    const server = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
    expect(server).toMatch(/process\.env\.PORT/);
  });

  test('package.json and package-lock.json both exist (needed by deps stage)', () => {
    expect(fs.existsSync(path.join(ROOT, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'package-lock.json'))).toBe(true);
  });

  test('storage module handles missing todos.json gracefully (ENOENT)', () => {
    const storage = fs.readFileSync(path.join(ROOT, 'src', 'storage.js'), 'utf8');
    expect(storage).toMatch(/ENOENT/);
  });
});

describe('TICKET-006 QA: Regression — existing endpoints unaffected', () => {
  const request = require('supertest');
  const app = require('../src/app');

  test('GET /health still returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('POST /todos still works', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Docker QA test todo' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Docker QA test todo');
  });

  test('GET /todos still returns array', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
