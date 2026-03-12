const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

async function createTodo(title) {
  const res = await request(app).post('/todos').send({ title });
  return res.body;
}

describe('TICKET-005 QA: PUT /todos/:id acceptance criteria', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  // AC1: PUT /todos/:id with valid fields returns 200 with updated todo
  it('AC1: returns 200 with updated todo when title is updated', async () => {
    const todo = await createTodo('Original title');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'Updated title',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('AC1: returns 200 with updated todo when completed is updated', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.title).toBe('Task');
  });

  it('AC1: returns 200 with updated todo when both fields are updated', async () => {
    const todo = await createTodo('Old title');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'New title', completed: true });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.completed).toBe(true);
  });

  it('AC1: preserves createdAt and id after update', async () => {
    const todo = await createTodo('Test');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Changed' });

    expect(res.body.id).toBe(todo.id);
    expect(res.body.createdAt).toBe(todo.createdAt);
  });

  it('AC1: response has exactly 4 fields (no extra properties)', async () => {
    const todo = await createTodo('Test');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated' });

    expect(Object.keys(res.body)).toHaveLength(4);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('completed');
    expect(res.body).toHaveProperty('createdAt');
  });

  // AC2: PUT /todos/:id on nonexistent id returns 404 with error message
  it('AC2: returns 404 with { error: "Todo not found" } for nonexistent id', async () => {
    const res = await request(app)
      .put('/todos/does-not-exist-123')
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('AC2: returns 404 for UUID-format id that does not exist', async () => {
    const res = await request(app)
      .put('/todos/00000000-0000-0000-0000-000000000000')
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  // AC3: PUT /todos/:id with no valid fields returns 400
  it('AC3: returns 400 when body is empty object', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when only unrecognized fields are sent', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ foo: 'bar', baz: 123 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when title is empty string', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when title is whitespace only', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when completed is a string', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: 'true' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when completed is a number', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('AC3: returns 400 when completed is null', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('TICKET-005 QA: PUT /todos/:id edge cases', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('persists update to storage file', async () => {
    const todo = await createTodo('Before update');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'After update' });

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    const stored = data.find((t) => t.id === todo.id);
    expect(stored.title).toBe('After update');
  });

  it('does not affect other todos in storage', async () => {
    const todo1 = await createTodo('First');
    const todo2 = await createTodo('Second');

    await request(app)
      .put(`/todos/${todo2.id}`)
      .send({ title: 'Second Updated' });

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(2);
    expect(data.find((t) => t.id === todo1.id).title).toBe('First');
    expect(data.find((t) => t.id === todo2.id).title).toBe('Second Updated');
  });

  it('handles special characters in title', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: '<script>alert("xss")</script>' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('<script>alert("xss")</script>');
  });

  it('handles unicode characters in title', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Tarea con acentos: áéíóú 日本語' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tarea con acentos: áéíóú 日本語');
  });

  it('can toggle completed back to false', async () => {
    const todo = await createTodo('Task');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: false });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
  });

  it('ignores extra fields in request body', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated', extraField: 'ignored' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body).not.toHaveProperty('extraField');
  });

  it('does not allow overwriting id', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated', id: 'hacked-id' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
  });

  it('does not allow overwriting createdAt', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated', createdAt: '2000-01-01T00:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.createdAt).toBe(todo.createdAt);
  });

  it('returns JSON content-type', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated' });

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('validates body before checking existence (returns 400 not 404 for invalid body)', async () => {
    const res = await request(app)
      .put('/todos/nonexistent-id')
      .send({});

    // Validation middleware should reject before route handler checks ID
    expect(res.status).toBe(400);
  });
});

describe('TICKET-005 QA: DELETE /todos/:id acceptance criteria', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  // AC4: DELETE /todos/:id returns 200 with the deleted todo
  it('AC4: returns 200 with the complete deleted todo object', async () => {
    const todo = await createTodo('To be deleted');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'To be deleted',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('AC4: deleted todo is no longer in storage', async () => {
    const todo = await createTodo('Will be removed');

    await request(app).delete(`/todos/${todo.id}`);

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(0);
  });

  it('AC4: deleted todo is no longer returned by GET', async () => {
    const todo = await createTodo('Will be removed');

    await request(app).delete(`/todos/${todo.id}`);

    const res = await request(app).get('/todos');
    expect(res.body).toHaveLength(0);
  });

  // AC5: DELETE /todos/:id on nonexistent id returns 404 with error message
  it('AC5: returns 404 with { error: "Todo not found" } for nonexistent id', async () => {
    const res = await request(app).delete('/todos/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('AC5: returns 404 for UUID-format id that does not exist', async () => {
    const res = await request(app).delete('/todos/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});

describe('TICKET-005 QA: DELETE /todos/:id edge cases', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('only removes the targeted todo, leaving others intact', async () => {
    const todo1 = await createTodo('Keep me');
    const todo2 = await createTodo('Delete me');
    const todo3 = await createTodo('Keep me too');

    await request(app).delete(`/todos/${todo2.id}`);

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(2);
    expect(data.map((t) => t.id)).toContain(todo1.id);
    expect(data.map((t) => t.id)).toContain(todo3.id);
    expect(data.map((t) => t.id)).not.toContain(todo2.id);
  });

  it('returns 404 when deleting the same todo twice', async () => {
    const todo = await createTodo('Delete once');

    const first = await request(app).delete(`/todos/${todo.id}`);
    expect(first.status).toBe(200);

    const second = await request(app).delete(`/todos/${todo.id}`);
    expect(second.status).toBe(404);
    expect(second.body).toEqual({ error: 'Todo not found' });
  });

  it('can delete a todo that was previously updated', async () => {
    const todo = await createTodo('Original');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated', completed: true });

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.completed).toBe(true);
  });

  it('returns JSON content-type', async () => {
    const todo = await createTodo('Task');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('can delete all todos one by one', async () => {
    const todo1 = await createTodo('First');
    const todo2 = await createTodo('Second');

    await request(app).delete(`/todos/${todo1.id}`);
    await request(app).delete(`/todos/${todo2.id}`);

    const res = await request(app).get('/todos');
    expect(res.body).toHaveLength(0);
  });
});

describe('TICKET-005 QA: Dev notes validation', () => {
  it('PUT route uses validateUpdateTodo middleware', () => {
    const todosRouter = require('../src/routes/todos');
    const layer = todosRouter.stack.find(
      (l) => l.route && l.route.path === '/:id' && l.route.methods.put
    );
    expect(layer).toBeDefined();
    // Should have 2 handlers: validateUpdateTodo + route handler
    expect(layer.route.stack.length).toBeGreaterThanOrEqual(2);
  });

  it('DELETE route does not use validation middleware (only route handler)', () => {
    const todosRouter = require('../src/routes/todos');
    const layer = todosRouter.stack.find(
      (l) => l.route && l.route.path === '/:id' && l.route.methods.delete
    );
    expect(layer).toBeDefined();
    // DELETE should have 1 handler (no validation middleware needed)
    expect(layer.route.stack.length).toBe(1);
  });

  it('uses storage module for read/write operations', () => {
    const routeSource = require('fs').readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'todos.js'),
      'utf8'
    );
    expect(routeSource).toContain('readTodos');
    expect(routeSource).toContain('writeTodos');
  });
});

describe('TICKET-005 QA: Regression — existing endpoints still work', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('POST /todos still creates todos correctly', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Regression test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Regression test');
    expect(res.body.completed).toBe(false);
  });

  it('GET /todos still returns all todos', async () => {
    await createTodo('One');
    await createTodo('Two');

    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('GET /health still works', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('full CRUD lifecycle works end-to-end', async () => {
    // Create
    const createRes = await request(app)
      .post('/todos')
      .send({ title: 'Lifecycle test' });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    // Read
    const readRes = await request(app).get('/todos');
    expect(readRes.body).toHaveLength(1);
    expect(readRes.body[0].id).toBe(id);

    // Update
    const updateRes = await request(app)
      .put(`/todos/${id}`)
      .send({ title: 'Lifecycle updated', completed: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Lifecycle updated');
    expect(updateRes.body.completed).toBe(true);

    // Verify update persisted
    const readAfterUpdate = await request(app).get('/todos');
    expect(readAfterUpdate.body[0].title).toBe('Lifecycle updated');

    // Delete
    const deleteRes = await request(app).delete(`/todos/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.id).toBe(id);

    // Verify deletion
    const readAfterDelete = await request(app).get('/todos');
    expect(readAfterDelete.body).toHaveLength(0);
  });
});
