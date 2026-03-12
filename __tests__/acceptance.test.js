const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const fs = require('fs');

/**
 * Acceptance criteria tests for TICKET-001:
 * Set up Express project scaffolding with health endpoint
 */

describe('AC1: npm install succeeds with no errors', () => {
  it('node_modules directory exists', () => {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    expect(fs.existsSync(nodeModulesPath)).toBe(true);
  });

  it('express is installed', () => {
    expect(() => require('express')).not.toThrow();
  });

  it('cors is installed', () => {
    expect(() => require('cors')).not.toThrow();
  });

  it('uuid is installed', () => {
    expect(() => require('uuid')).not.toThrow();
  });

  it('package.json lists correct dependencies', () => {
    const pkg = require('../package.json');
    expect(pkg.dependencies).toHaveProperty('express');
    expect(pkg.dependencies).toHaveProperty('uuid');
    expect(pkg.dependencies).toHaveProperty('cors');
  });

  it('package.json lists correct devDependencies', () => {
    const pkg = require('../package.json');
    expect(pkg.devDependencies).toHaveProperty('jest');
    expect(pkg.devDependencies).toHaveProperty('supertest');
  });
});

describe('AC2: server.js uses configured PORT', () => {
  it('server.js exists and is requireable', () => {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  it('server.js references process.env.PORT', () => {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    const content = fs.readFileSync(serverPath, 'utf8');
    expect(content).toMatch(/process\.env\.PORT/);
  });

  it('server.js defaults to port 3000', () => {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    const content = fs.readFileSync(serverPath, 'utf8');
    expect(content).toMatch(/3000/);
  });
});

describe('AC3: GET /health returns 200 with { status: "ok" }', () => {
  it('returns exactly 200 status code', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  it('returns body with status field equal to "ok"', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('does not include unexpected fields in response', async () => {
    const res = await request(app).get('/health');
    expect(Object.keys(res.body)).toEqual(['status']);
  });

  it('responds to HEAD /health', async () => {
    const res = await request(app).head('/health');
    expect(res.statusCode).toBe(200);
  });

  it('returns consistent response on repeated calls', async () => {
    const res1 = await request(app).get('/health');
    const res2 = await request(app).get('/health');
    expect(res1.body).toEqual(res2.body);
    expect(res1.statusCode).toBe(res2.statusCode);
  });
});

describe('AC4: npm scripts are configured', () => {
  it('has start script', () => {
    const pkg = require('../package.json');
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.start).toMatch(/server/);
  });

  it('has test script', () => {
    const pkg = require('../package.json');
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.test).toMatch(/jest/);
  });

  it('has dev script', () => {
    const pkg = require('../package.json');
    expect(pkg.scripts.dev).toBeDefined();
  });
});

describe('AC5: app.js exports Express app separately from server.js', () => {
  it('app.js exports a function (Express app)', () => {
    expect(typeof app).toBe('function');
  });

  it('app.js export has Express methods', () => {
    expect(typeof app.listen).toBe('function');
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
  });

  it('app.js and server.js are separate files', () => {
    const appPath = path.join(__dirname, '..', 'src', 'app.js');
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    expect(fs.existsSync(appPath)).toBe(true);
    expect(fs.existsSync(serverPath)).toBe(true);
    expect(appPath).not.toBe(serverPath);
  });

  it('server.js imports from app.js', () => {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    const content = fs.readFileSync(serverPath, 'utf8');
    expect(content).toMatch(/require\(.*app.*\)/);
  });
});

describe('Edge cases', () => {
  it('GET /health ignores query parameters', async () => {
    const res = await request(app).get('/health?foo=bar');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /health returns 404 (only GET is supported)', async () => {
    const res = await request(app).post('/health');
    expect(res.statusCode).toBe(404);
  });

  it('PUT /health returns 404', async () => {
    const res = await request(app).put('/health');
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /health returns 404', async () => {
    const res = await request(app).delete('/health');
    expect(res.statusCode).toBe(404);
  });

  it('CORS preflight OPTIONS request succeeds', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('handles requests with accept header', async () => {
    const res = await request(app)
      .get('/health')
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
