const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

describe('POST /todos', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns 201 with complete todo object when given valid title', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test');
    expect(res.body.completed).toBe(false);
    expect(res.body).toHaveProperty('createdAt');
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/todos')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('persists the created todo to storage', async () => {
    await request(app)
      .post('/todos')
      .send({ title: 'Persisted' });

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Persisted');
  });
});

describe('GET /todos', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns empty array when no todos exist', async () => {
    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all stored todos', async () => {
    // Create two todos first
    await request(app).post('/todos').send({ title: 'First' });
    await request(app).post('/todos').send({ title: 'Second' });

    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
    expect(res.body[1].title).toBe('Second');
  });
});
