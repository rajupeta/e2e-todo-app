const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('Docker configuration', () => {
  describe('Dockerfile', () => {
    let dockerfile;

    beforeAll(() => {
      dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    });

    test('exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'Dockerfile'))).toBe(true);
    });

    test('uses node:20-alpine base image', () => {
      expect(dockerfile).toMatch(/FROM node:20-alpine/);
    });

    test('uses multi-stage build', () => {
      const fromStatements = dockerfile.match(/^FROM /gm);
      expect(fromStatements.length).toBeGreaterThanOrEqual(2);
    });

    test('has a deps stage that copies package files and runs npm ci', () => {
      expect(dockerfile).toMatch(/FROM node:20-alpine AS deps/);
      expect(dockerfile).toMatch(/COPY package\.json package-lock\.json/);
      expect(dockerfile).toMatch(/npm ci --only=production/);
    });

    test('has a production stage that copies node_modules from deps', () => {
      expect(dockerfile).toMatch(/COPY --from=deps/);
      expect(dockerfile).toMatch(/node_modules/);
    });

    test('copies src/ directory', () => {
      expect(dockerfile).toMatch(/COPY src\//);
    });

    test('exposes port 3000', () => {
      expect(dockerfile).toMatch(/EXPOSE 3000/);
    });

    test('sets NODE_ENV=production', () => {
      expect(dockerfile).toMatch(/ENV NODE_ENV=production/);
    });

    test('runs node src/server.js as CMD', () => {
      expect(dockerfile).toMatch(/CMD \["node", "src\/server\.js"\]/);
    });
  });

  describe('docker-compose.yml', () => {
    let compose;

    beforeAll(() => {
      compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    });

    test('exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'docker-compose.yml'))).toBe(true);
    });

    test('defines an app service', () => {
      expect(compose).toMatch(/app:/);
    });

    test('builds from current directory', () => {
      expect(compose).toMatch(/build:\s*\./);
    });

    test('maps port 3000:3000', () => {
      expect(compose).toMatch(/3000:3000/);
    });

    test('sets PORT=3000 environment variable', () => {
      expect(compose).toMatch(/PORT=3000/);
    });
  });

  describe('.dockerignore', () => {
    let dockerignore;

    beforeAll(() => {
      dockerignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
    });

    test('exists', () => {
      expect(fs.existsSync(path.join(ROOT, '.dockerignore'))).toBe(true);
    });

    test('excludes node_modules', () => {
      expect(dockerignore).toMatch(/^node_modules$/m);
    });

    test('excludes .git', () => {
      expect(dockerignore).toMatch(/^\.git$/m);
    });

    test('excludes .env', () => {
      expect(dockerignore).toMatch(/^\.env$/m);
    });

    test('excludes tests', () => {
      expect(dockerignore).toMatch(/^tests$/m);
    });

    test('excludes *.test.js', () => {
      expect(dockerignore).toMatch(/\*\.test\.js/);
    });

    test('excludes .github', () => {
      expect(dockerignore).toMatch(/^\.github$/m);
    });

    test('excludes todos.json', () => {
      expect(dockerignore).toMatch(/^todos\.json$/m);
    });
  });
});
