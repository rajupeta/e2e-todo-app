/**
 * TICKET-004 QA Validation: Create and List todos endpoints (POST + GET /todos)
 * Test Agent — validates all acceptance criteria, edge cases, and integration behavior.
 */
const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

beforeEach(async () => {
  await fs.writeFile(TODOS_FILE, '[]', 'utf8');
});

afterEach(async () => {
  await fs.writeFile(TODOS_FILE, '[]', 'utf8');
});

// ── AC1: POST /todos with { title: 'Test' } returns 201 with complete todo object ──

describe('AC1: POST /todos returns 201 with complete todo object', () => {
  it('returns 201 status code', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.status).toBe(201);
  });

  it('response contains id field', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
  });

  it('id is a valid UUID v4', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('response contains the submitted title', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.body.title).toBe('Test');
  });

  it('completed is false', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.body.completed).toBe(false);
  });

  it('createdAt is a valid ISO 8601 timestamp', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(res.body).toHaveProperty('createdAt');
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
  });

  it('createdAt is close to the current time', async () => {
    const before = Date.now();
    const res = await request(app).post('/todos').send({ title: 'Test' });
    const after = Date.now();
    const createdMs = new Date(res.body.createdAt).getTime();
    expect(createdMs).toBeGreaterThanOrEqual(before);
    expect(createdMs).toBeLessThanOrEqual(after);
  });

  it('response has exactly 4 fields: id, title, completed, createdAt', async () => {
    const res = await request(app).post('/todos').send({ title: 'Test' });
    expect(Object.keys(res.body).sort()).toEqual(['completed', 'createdAt', 'id', 'title']);
  });

  it('each POST generates a unique id', async () => {
    const r1 = await request(app).post('/todos').send({ title: 'A' });
    const r2 = await request(app).post('/todos').send({ title: 'B' });
    expect(r1.body.id).not.toBe(r2.body.id);
  });
});

// ── AC2: POST /todos without title returns 400 with error message ──

describe('AC2: POST /todos without title returns 400', () => {
  it('returns 400 when body is empty object', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/todos').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is whitespace only', async () => {
    const res = await request(app).post('/todos').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is null', async () => {
    const res = await request(app).post('/todos').send({ title: null });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is a number', async () => {
    const res = await request(app).post('/todos').send({ title: 123 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is a boolean', async () => {
    const res = await request(app).post('/todos').send({ title: true });
    expect(res.status).toBe(400);
  });

  it('error response is JSON with error string', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});

// ── AC3: GET /todos returns all stored todos as JSON array ──

describe('AC3: GET /todos returns all stored todos as JSON array', () => {
  it('returns todos created via POST', async () => {
    await request(app).post('/todos').send({ title: 'First' });
    await request(app).post('/todos').send({ title: 'Second' });

    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('each returned todo has all required fields', async () => {
    await request(app).post('/todos').send({ title: 'Check fields' });

    const res = await request(app).get('/todos');
    const todo = res.body[0];
    expect(todo).toHaveProperty('id');
    expect(todo).toHaveProperty('title', 'Check fields');
    expect(todo).toHaveProperty('completed', false);
    expect(todo).toHaveProperty('createdAt');
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/todos');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('preserves insertion order', async () => {
    await request(app).post('/todos').send({ title: 'Alpha' });
    await request(app).post('/todos').send({ title: 'Beta' });
    await request(app).post('/todos').send({ title: 'Gamma' });

    const res = await request(app).get('/todos');
    expect(res.body.map((t) => t.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('GET returns the exact same object that POST returned', async () => {
    const postRes = await request(app).post('/todos').send({ title: 'Roundtrip' });
    const getRes = await request(app).get('/todos');
    expect(getRes.body[0]).toEqual(postRes.body);
  });
});

// ── AC4: GET /todos returns [] when no todos exist ──

describe('AC4: GET /todos returns [] when no todos exist', () => {
  it('returns 200 with empty array', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns an actual array (not null or undefined)', async () => {
    const res = await request(app).get('/todos');
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── AC5: All integration tests pass (verified by test runner) ──
// This is implicitly validated by this entire test suite passing.

// ── AC6: Todos router is mounted at /todos in app.js ──

describe('AC6: Todos router is mounted at /todos in app.js', () => {
  it('POST /todos is reachable', async () => {
    const res = await request(app).post('/todos').send({ title: 'Mount test' });
    expect(res.status).toBe(201);
  });

  it('GET /todos is reachable', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
  });

  it('/todo (without trailing s) returns 404', async () => {
    const res = await request(app).get('/todo');
    expect(res.status).toBe(404);
  });

  it('app.js requires and mounts the todos router', async () => {
    const appSource = await fs.readFile(
      path.join(__dirname, '..', 'src', 'app.js'),
      'utf8'
    );
    expect(appSource).toContain("require('./routes/todos')");
    expect(appSource).toContain("app.use('/todos'");
  });
});

// ── Additional edge cases and robustness checks ──

describe('Edge cases: POST /todos', () => {
  it('completed is forced to false even if client sends true', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Override', completed: true });
    expect(res.body.completed).toBe(false);
  });

  it('ignores extra fields in request body', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Clean', priority: 'high', tags: ['a'] });
    expect(res.body).not.toHaveProperty('priority');
    expect(res.body).not.toHaveProperty('tags');
  });

  it('handles special characters in title', async () => {
    const title = '<script>alert("xss")</script> & "quotes" \' backslash\\';
    const res = await request(app).post('/todos').send({ title });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
  });

  it('handles unicode in title', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Tarea pendiente' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Tarea pendiente');
  });

  it('persists todo to storage file', async () => {
    await request(app).post('/todos').send({ title: 'Persist check' });
    const raw = await fs.readFile(TODOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Persist check');
  });

  it('appends to existing todos (does not overwrite)', async () => {
    await request(app).post('/todos').send({ title: 'First' });
    await request(app).post('/todos').send({ title: 'Second' });
    const raw = await fs.readFile(TODOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(2);
  });
});

describe('Edge cases: GET /todos', () => {
  it('handles missing todos.json file gracefully', async () => {
    try { await fs.unlink(TODOS_FILE); } catch (_) {}
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('handles corrupt todos.json gracefully', async () => {
    await fs.writeFile(TODOS_FILE, '{invalid json', 'utf8');
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('multiple sequential GETs return consistent data', async () => {
    await request(app).post('/todos').send({ title: 'Stable' });
    const r1 = await request(app).get('/todos');
    const r2 = await request(app).get('/todos');
    expect(r1.body).toEqual(r2.body);
  });
});

describe('Dev notes validation', () => {
  it('uses validateCreateTodo middleware on POST', async () => {
    const todosSource = await fs.readFile(
      path.join(__dirname, '..', 'src', 'routes', 'todos.js'),
      'utf8'
    );
    expect(todosSource).toContain('validateCreateTodo');
  });

  it('uses uuid v4 for ID generation', async () => {
    const todosSource = await fs.readFile(
      path.join(__dirname, '..', 'src', 'routes', 'todos.js'),
      'utf8'
    );
    expect(todosSource).toContain('uuidv4');
    expect(todosSource).toContain("require('uuid')");
  });

  it('uses storage module for read/write', async () => {
    const todosSource = await fs.readFile(
      path.join(__dirname, '..', 'src', 'routes', 'todos.js'),
      'utf8'
    );
    expect(todosSource).toContain('readTodos');
    expect(todosSource).toContain('writeTodos');
  });
});
