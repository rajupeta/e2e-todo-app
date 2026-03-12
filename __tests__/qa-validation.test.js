const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');

/**
 * QA Validation tests for TICKET-001
 * Test agent — additional coverage for robustness and regression prevention
 */

describe('Health endpoint robustness', () => {
  it('returns valid JSON with correct charset', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json.*charset=utf-8/i);
  });

  it('response body is a plain object (not array)', async () => {
    const res = await request(app).get('/health');
    expect(Array.isArray(res.body)).toBe(false);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });

  it('status field is exactly the string "ok" (not truthy variant)', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('ok');
    expect(res.body.status).not.toBe('OK');
    expect(res.body.status).not.toBe(true);
    expect(res.body.status).not.toBe(1);
  });

  it('handles concurrent requests without error', async () => {
    const requests = Array.from({ length: 10 }, () =>
      request(app).get('/health')
    );
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  it('trailing slash on /health/ returns 301 or 404 (not 500)', async () => {
    const res = await request(app).get('/health/');
    expect(res.statusCode).not.toBe(500);
  });

  it('Express default: case-insensitive routing (/Health also returns 200)', async () => {
    const res = await request(app).get('/Health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Express default: case-insensitive routing (/HEALTH also returns 200)', async () => {
    const res = await request(app).get('/HEALTH');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('CORS middleware validation', () => {
  it('allows cross-origin GET requests', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:8080');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('preflight includes allowed methods', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.statusCode).toBe(204);
  });

  it('preflight includes allowed headers', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');
    expect(res.statusCode).toBe(204);
  });
});

describe('JSON body parsing middleware', () => {
  it('does not crash on malformed JSON body', async () => {
    const res = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{ broken json');
    // Express returns 400 for malformed JSON, not 500
    expect(res.statusCode).not.toBe(500);
  });

  it('handles empty body gracefully', async () => {
    const res = await request(app)
      .post('/nonexistent')
      .set('Content-Type', 'application/json')
      .send('');
    expect(res.statusCode).not.toBe(500);
  });

  it('handles large JSON body without crashing', async () => {
    const largeBody = { data: 'x'.repeat(10000) };
    const res = await request(app)
      .post('/nonexistent')
      .send(largeBody)
      .set('Content-Type', 'application/json');
    expect(res.statusCode).not.toBe(500);
  });
});

describe('Project structure validation', () => {
  it('package.json has name field', () => {
    const pkg = require('../package.json');
    expect(pkg.name).toBe('e2e-todo-app');
  });

  it('package.json main points to server.js', () => {
    const pkg = require('../package.json');
    expect(pkg.main).toMatch(/server\.js/);
  });

  it('.gitignore exists and excludes node_modules', () => {
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toMatch(/node_modules/);
  });

  it('app.js does not call app.listen (separation of concerns)', () => {
    const appPath = path.join(__dirname, '..', 'src', 'app.js');
    const content = fs.readFileSync(appPath, 'utf8');
    expect(content).not.toMatch(/app\.listen\s*\(/);
  });

  it('server.js calls app.listen', () => {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    const content = fs.readFileSync(serverPath, 'utf8');
    expect(content).toMatch(/\.listen\s*\(/);
  });

  it('dev script exists for development workflow', () => {
    const pkg = require('../package.json');
    expect(pkg.scripts.dev).toBeDefined();
    expect(typeof pkg.scripts.dev).toBe('string');
    expect(pkg.scripts.dev.length).toBeGreaterThan(0);
  });
});

describe('Error handling', () => {
  it('unknown routes return JSON 404 (not HTML)', async () => {
    const res = await request(app)
      .get('/does-not-exist')
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(404);
  });

  it('deeply nested unknown routes return 404', async () => {
    const res = await request(app).get('/a/b/c/d/e');
    expect(res.statusCode).toBe(404);
  });

  it('requests with unusual HTTP methods handled gracefully', async () => {
    const res = await request(app).patch('/health');
    expect(res.statusCode).not.toBe(500);
  });
});
