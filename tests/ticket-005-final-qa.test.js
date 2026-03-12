const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

async function createTodo(title) {
  const res = await request(app).post('/todos').send({ title });
  return res.body;
}

/**
 * TICKET-005 Final QA Validation — Test Agent
 *
 * This file covers acceptance criteria verification, concurrency-like
 * scenarios, boundary inputs, and regression checks for PUT and DELETE
 * /todos/:id endpoints.
 */

describe('TICKET-005 Final QA: PUT /todos/:id — acceptance criteria', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  // AC1: PUT /todos/:id with valid fields returns 200 with updated todo
  it('AC1: updating title returns 200 with correct response shape', async () => {
    const todo = await createTodo('Initial title');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Changed title' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: todo.id,
      title: 'Changed title',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('AC1: updating completed to true returns 200', async () => {
    const todo = await createTodo('Mark done');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.title).toBe('Mark done');
  });

  it('AC1: updating both fields returns 200 with both changes', async () => {
    const todo = await createTodo('Both fields');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Both updated', completed: true });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Both updated');
    expect(res.body.completed).toBe(true);
  });

  // AC2: PUT /todos/:id on nonexistent id returns 404
  it('AC2: returns 404 with exact error message for missing id', async () => {
    const res = await request(app)
      .put('/todos/nonexistent-uuid')
      .send({ title: 'Attempt' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  // AC3: PUT /todos/:id with no valid fields returns 400
  it('AC3: empty body returns 400', async () => {
    const todo = await createTodo('Validate me');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: body with only unknown fields returns 400', async () => {
    const todo = await createTodo('Validate me');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ notAField: 'value' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('TICKET-005 Final QA: DELETE /todos/:id — acceptance criteria', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  // AC4: DELETE /todos/:id returns 200 with the deleted todo
  it('AC4: returns 200 with complete todo object on delete', async () => {
    const todo = await createTodo('Delete target');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'Delete target',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('AC4: deleted todo no longer appears in GET', async () => {
    const todo = await createTodo('Ephemeral');

    await request(app).delete(`/todos/${todo.id}`);

    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(0);
  });

  // AC5: DELETE /todos/:id on nonexistent id returns 404
  it('AC5: returns 404 with exact error message for missing id', async () => {
    const res = await request(app).delete('/todos/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});

describe('TICKET-005 Final QA: Boundary and edge cases', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('PUT with a very long title succeeds', async () => {
    const todo = await createTodo('Short');
    const longTitle = 'A'.repeat(5000);

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: longTitle });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(longTitle);
  });

  it('PUT toggles completed from true back to false', async () => {
    const todo = await createTodo('Toggle test');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: false });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
  });

  it('PUT does not allow id override via body', async () => {
    const todo = await createTodo('ID safety');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Safe', id: 'malicious-id' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
  });

  it('PUT does not allow createdAt override via body', async () => {
    const todo = await createTodo('Timestamp safety');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Safe', createdAt: '1970-01-01T00:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.createdAt).toBe(todo.createdAt);
  });

  it('DELETE on empty storage returns 404', async () => {
    const res = await request(app).delete('/todos/any-id');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('multiple rapid updates apply correctly', async () => {
    const todo = await createTodo('Rapid');

    await request(app).put(`/todos/${todo.id}`).send({ title: 'V1' });
    await request(app).put(`/todos/${todo.id}`).send({ title: 'V2' });
    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'V3' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('V3');

    const getRes = await request(app).get('/todos');
    expect(getRes.body[0].title).toBe('V3');
  });

  it('deleting middle todo preserves order of remaining', async () => {
    const t1 = await createTodo('First');
    const t2 = await createTodo('Second');
    const t3 = await createTodo('Third');

    await request(app).delete(`/todos/${t2.id}`);

    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(2);
    expect(getRes.body[0].id).toBe(t1.id);
    expect(getRes.body[1].id).toBe(t3.id);
  });

  it('PUT with completed: false on a new todo keeps it false', async () => {
    const todo = await createTodo('Already false');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: false });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
  });
});

describe('TICKET-005 Final QA: AC6 — integration lifecycle', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('Create → Update → Verify → Delete → Verify 404 lifecycle', async () => {
    // Create
    const createRes = await request(app)
      .post('/todos')
      .send({ title: 'Lifecycle QA' });
    expect(createRes.status).toBe(201);
    const { id } = createRes.body;

    // Update
    const updateRes = await request(app)
      .put(`/todos/${id}`)
      .send({ title: 'Updated QA', completed: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated QA');
    expect(updateRes.body.completed).toBe(true);

    // Verify via GET
    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(1);
    expect(getRes.body[0].title).toBe('Updated QA');

    // Delete
    const deleteRes = await request(app).delete(`/todos/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.title).toBe('Updated QA');

    // Verify 404 on both PUT and DELETE
    const put404 = await request(app)
      .put(`/todos/${id}`)
      .send({ title: 'Should fail' });
    expect(put404.status).toBe(404);

    const delete404 = await request(app).delete(`/todos/${id}`);
    expect(delete404.status).toBe(404);

    // Verify empty
    const finalGet = await request(app).get('/todos');
    expect(finalGet.body).toHaveLength(0);
  });

  it('existing endpoints (health, POST, GET) unaffected', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });

    const post = await request(app)
      .post('/todos')
      .send({ title: 'Regression' });
    expect(post.status).toBe(201);

    const get = await request(app).get('/todos');
    expect(get.status).toBe(200);
    expect(get.body).toHaveLength(1);
  });
});
