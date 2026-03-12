const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('App middleware', () => {
  it('parses JSON request bodies', async () => {
    const res = await request(app)
      .post('/nonexistent')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');
    // Should not crash with 500 — JSON parsing works even for unknown routes
    expect(res.status).not.toBe(500);
  });

  it('includes CORS headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('Module structure', () => {
  it('app.js exports an Express application', () => {
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
    expect(typeof app.use).toBe('function');
  });
});
