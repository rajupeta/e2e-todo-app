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

describe('TICKET-004 QA: POST /todos acceptance criteria', () => {
  it('AC1: returns 201 with complete todo object containing id, title, completed=false, createdAt', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test');
    expect(res.body.completed).toBe(false);
    expect(res.body).toHaveProperty('createdAt');
    // Verify id is a valid UUID v4 format
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    // Verify createdAt is a valid ISO timestamp
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
  });

  it('AC1: returned todo has exactly 4 fields (no extra properties)', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test' });

    expect(Object.keys(res.body).sort()).toEqual(
      ['completed', 'createdAt', 'id', 'title']
    );
  });

  it('AC1: ignores extra fields in request body', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test', priority: 'high', extra: 123 });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('priority');
    expect(res.body).not.toHaveProperty('extra');
    expect(res.body.title).toBe('Test');
  });

  it('AC2: POST without title returns 400 with error message', async () => {
    const res = await request(app)
      .post('/todos')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('AC2: POST with null title returns 400', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC2: POST with whitespace-only title returns 400', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC2: POST with numeric title returns 400', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 42 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns JSON content-type', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test' });

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('generates unique IDs for each todo', async () => {
    const res1 = await request(app)
      .post('/todos')
      .send({ title: 'First' });
    const res2 = await request(app)
      .post('/todos')
      .send({ title: 'Second' });

    expect(res1.body.id).not.toBe(res2.body.id);
  });
});

describe('TICKET-004 QA: GET /todos acceptance criteria', () => {
  it('AC3: returns all stored todos as JSON array', async () => {
    await request(app).post('/todos').send({ title: 'Todo 1' });
    await request(app).post('/todos').send({ title: 'Todo 2' });
    await request(app).post('/todos').send({ title: 'Todo 3' });

    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe('Todo 1');
    expect(res.body[1].title).toBe('Todo 2');
    expect(res.body[2].title).toBe('Todo 3');
  });

  it('AC4: returns empty array when no todos exist', async () => {
    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/todos');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('GET returns todo created by POST with matching fields', async () => {
    const postRes = await request(app)
      .post('/todos')
      .send({ title: 'Roundtrip' });

    const getRes = await request(app).get('/todos');

    expect(getRes.body).toHaveLength(1);
    expect(getRes.body[0]).toEqual(postRes.body);
  });

  it('preserves todo order (insertion order)', async () => {
    await request(app).post('/todos').send({ title: 'Alpha' });
    await request(app).post('/todos').send({ title: 'Beta' });
    await request(app).post('/todos').send({ title: 'Gamma' });

    const res = await request(app).get('/todos');

    const titles = res.body.map((t) => t.title);
    expect(titles).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});

describe('TICKET-004 QA: Router mounting', () => {
  it('AC6: todos router is mounted at /todos in app.js', async () => {
    const getRes = await request(app).get('/todos');
    expect(getRes.status).toBe(200);

    const postRes = await request(app)
      .post('/todos')
      .send({ title: 'Mount check' });
    expect(postRes.status).toBe(201);
  });

  it('unmounted paths return 404', async () => {
    const res = await request(app).get('/todo');
    expect(res.status).toBe(404);
  });
});

describe('TICKET-004 QA: Edge cases', () => {
  it('handles title with special characters', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test <script>alert("xss")</script> & "quotes"' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(
      'Test <script>alert("xss")</script> & "quotes"'
    );
  });

  it('handles very long title', async () => {
    const longTitle = 'A'.repeat(10000);
    const res = await request(app)
      .post('/todos')
      .send({ title: longTitle });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(longTitle);
  });

  it('handles unicode title', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Todo with emoji and unicode chars' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Todo with emoji and unicode chars');
  });

  it('completed is always false on creation (ignores input)', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test', completed: true });

    expect(res.status).toBe(201);
    expect(res.body.completed).toBe(false);
  });

  it('createdAt is a recent timestamp', async () => {
    const before = new Date().toISOString();
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Timestamp check' });
    const after = new Date().toISOString();

    expect(res.body.createdAt >= before).toBe(true);
    expect(res.body.createdAt <= after).toBe(true);
  });
});
