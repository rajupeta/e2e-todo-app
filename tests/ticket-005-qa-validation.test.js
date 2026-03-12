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
 * TICKET-005 QA Validation — Test Agent
 *
 * Acceptance Criteria:
 * 1. PUT /todos/:id with valid fields returns 200 with updated todo.
 * 2. PUT /todos/:id on nonexistent id returns 404 with error message.
 * 3. PUT /todos/:id with no valid fields returns 400.
 * 4. DELETE /todos/:id returns 200 with the deleted todo.
 * 5. DELETE /todos/:id on nonexistent id returns 404 with error message.
 * 6. All integration tests pass.
 */

describe('TICKET-005 QA Gate: PUT /todos/:id — AC1 (valid update returns 200)', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('updates only title, returns 200 with full updated todo object', async () => {
    const todo = await createTodo('Buy groceries');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Buy organic groceries' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'Buy organic groceries',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('updates only completed, returns 200 with full updated todo object', async () => {
    const todo = await createTodo('Walk the dog');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'Walk the dog',
      completed: true,
      createdAt: todo.createdAt,
    });
  });

  it('updates both title and completed simultaneously', async () => {
    const todo = await createTodo('Read chapter 1');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Read chapter 2', completed: true });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Read chapter 2');
    expect(res.body.completed).toBe(true);
    expect(res.body.id).toBe(todo.id);
    expect(res.body.createdAt).toBe(todo.createdAt);
  });

  it('does not mutate id field on update', async () => {
    const todo = await createTodo('Immutable ID');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Changed title', id: 'should-be-ignored' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
    expect(res.body.id).not.toBe('should-be-ignored');
  });

  it('does not mutate createdAt field on update', async () => {
    const todo = await createTodo('Immutable timestamp');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Changed', createdAt: '1999-01-01T00:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.createdAt).toBe(todo.createdAt);
  });

  it('persists the update to the storage file', async () => {
    const todo = await createTodo('Persist test');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Persisted update' });

    const raw = await fs.readFile(TODOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Persisted update');
    expect(data[0].id).toBe(todo.id);
  });

  it('update is visible via subsequent GET /todos', async () => {
    const todo = await createTodo('Visible update');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    const getRes = await request(app).get('/todos');
    expect(getRes.body[0].completed).toBe(true);
  });

  it('only updates the targeted todo, not others', async () => {
    const todo1 = await createTodo('Keep unchanged');
    const todo2 = await createTodo('Will update');

    await request(app)
      .put(`/todos/${todo2.id}`)
      .send({ title: 'Updated todo2' });

    const getRes = await request(app).get('/todos');
    const t1 = getRes.body.find((t) => t.id === todo1.id);
    const t2 = getRes.body.find((t) => t.id === todo2.id);
    expect(t1.title).toBe('Keep unchanged');
    expect(t2.title).toBe('Updated todo2');
  });
});

describe('TICKET-005 QA Gate: PUT /todos/:id — AC2 (nonexistent id returns 404)', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns 404 with correct error object for random string id', async () => {
    const res = await request(app)
      .put('/todos/abc-123-nonexistent')
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 404 for UUID-formatted id that does not exist', async () => {
    const res = await request(app)
      .put('/todos/550e8400-e29b-41d4-a716-446655440000')
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 404 for id of a previously deleted todo', async () => {
    const todo = await createTodo('To delete then update');
    await request(app).delete(`/todos/${todo.id}`);

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Too late' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});

describe('TICKET-005 QA Gate: PUT /todos/:id — AC3 (no valid fields returns 400)', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns 400 with error when body is empty', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('returns 400 when only unknown fields are provided', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ unknown: 'field', another: 123 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is empty string', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is only whitespace', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: '    \t\n  ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when completed is a string instead of boolean', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: 'true' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when completed is a number instead of boolean', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when completed is null', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('validation runs before existence check (400 for empty body on nonexistent id)', async () => {
    const res = await request(app)
      .put('/todos/does-not-exist')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('TICKET-005 QA Gate: DELETE /todos/:id — AC4 (returns 200 with deleted todo)', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns 200 with the complete deleted todo object', async () => {
    const todo = await createTodo('Task to remove');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: todo.id,
      title: 'Task to remove',
      completed: false,
      createdAt: todo.createdAt,
    });
  });

  it('returns the updated state if todo was modified before deletion', async () => {
    const todo = await createTodo('Original title');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Modified title', completed: true });

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Modified title');
    expect(res.body.completed).toBe(true);
  });

  it('removes the todo from storage file', async () => {
    const todo = await createTodo('Will be removed');

    await request(app).delete(`/todos/${todo.id}`);

    const raw = await fs.readFile(TODOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(0);
  });

  it('deleted todo is not returned by GET /todos', async () => {
    const todo = await createTodo('Ghost');

    await request(app).delete(`/todos/${todo.id}`);

    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(0);
    expect(getRes.body.find((t) => t.id === todo.id)).toBeUndefined();
  });

  it('only deletes the targeted todo, others remain', async () => {
    const t1 = await createTodo('Keep A');
    const t2 = await createTodo('Remove B');
    const t3 = await createTodo('Keep C');

    await request(app).delete(`/todos/${t2.id}`);

    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(2);
    expect(getRes.body.map((t) => t.id)).toEqual(
      expect.arrayContaining([t1.id, t3.id])
    );
    expect(getRes.body.map((t) => t.id)).not.toContain(t2.id);
  });

  it('deleting the same todo twice returns 404 on second attempt', async () => {
    const todo = await createTodo('Delete me');

    const first = await request(app).delete(`/todos/${todo.id}`);
    expect(first.status).toBe(200);

    const second = await request(app).delete(`/todos/${todo.id}`);
    expect(second.status).toBe(404);
  });
});

describe('TICKET-005 QA Gate: DELETE /todos/:id — AC5 (nonexistent id returns 404)', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('returns 404 with { error: "Todo not found" } for random string id', async () => {
    const res = await request(app).delete('/todos/fake-id-999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 404 for UUID-formatted id that does not exist', async () => {
    const res = await request(app).delete(
      '/todos/00000000-0000-0000-0000-000000000000'
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 404 when todos array is empty', async () => {
    const res = await request(app).delete('/todos/any-id');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});

describe('TICKET-005 QA Gate: AC6 — Full CRUD integration lifecycle', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('complete Create → Read → Update → Read → Delete → Read lifecycle', async () => {
    // Create
    const createRes = await request(app)
      .post('/todos')
      .send({ title: 'Full lifecycle' });
    expect(createRes.status).toBe(201);
    const { id } = createRes.body;

    // Read after create
    const readRes1 = await request(app).get('/todos');
    expect(readRes1.body).toHaveLength(1);
    expect(readRes1.body[0].title).toBe('Full lifecycle');
    expect(readRes1.body[0].completed).toBe(false);

    // Update title
    const updateRes1 = await request(app)
      .put(`/todos/${id}`)
      .send({ title: 'Updated lifecycle' });
    expect(updateRes1.status).toBe(200);
    expect(updateRes1.body.title).toBe('Updated lifecycle');

    // Update completed
    const updateRes2 = await request(app)
      .put(`/todos/${id}`)
      .send({ completed: true });
    expect(updateRes2.status).toBe(200);
    expect(updateRes2.body.completed).toBe(true);
    expect(updateRes2.body.title).toBe('Updated lifecycle');

    // Read after updates
    const readRes2 = await request(app).get('/todos');
    expect(readRes2.body).toHaveLength(1);
    expect(readRes2.body[0].title).toBe('Updated lifecycle');
    expect(readRes2.body[0].completed).toBe(true);

    // Delete
    const deleteRes = await request(app).delete(`/todos/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.title).toBe('Updated lifecycle');
    expect(deleteRes.body.completed).toBe(true);

    // Read after delete
    const readRes3 = await request(app).get('/todos');
    expect(readRes3.body).toHaveLength(0);

    // Verify 404 on deleted todo
    const update404 = await request(app)
      .put(`/todos/${id}`)
      .send({ title: 'Should fail' });
    expect(update404.status).toBe(404);

    const delete404 = await request(app).delete(`/todos/${id}`);
    expect(delete404.status).toBe(404);
  });

  it('multiple todos CRUD operations do not interfere', async () => {
    const a = await createTodo('Alpha');
    const b = await createTodo('Beta');
    const c = await createTodo('Gamma');

    // Update middle todo
    await request(app)
      .put(`/todos/${b.id}`)
      .send({ title: 'Beta Updated', completed: true });

    // Delete first todo
    await request(app).delete(`/todos/${a.id}`);

    // Verify final state
    const getRes = await request(app).get('/todos');
    expect(getRes.body).toHaveLength(2);

    const betaTodo = getRes.body.find((t) => t.id === b.id);
    const gammaTodo = getRes.body.find((t) => t.id === c.id);

    expect(betaTodo.title).toBe('Beta Updated');
    expect(betaTodo.completed).toBe(true);
    expect(gammaTodo.title).toBe('Gamma');
    expect(gammaTodo.completed).toBe(false);
  });
});

describe('TICKET-005 QA Gate: Response format validation', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('PUT success response is JSON content-type', async () => {
    const todo = await createTodo('Format check');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated' });

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('PUT 404 response is JSON content-type', async () => {
    const res = await request(app)
      .put('/todos/nonexistent')
      .send({ title: 'Test' });

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('PUT 400 response is JSON content-type', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({});

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('DELETE success response is JSON content-type', async () => {
    const todo = await createTodo('Format check');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('DELETE 404 response is JSON content-type', async () => {
    const res = await request(app).delete('/todos/nonexistent');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('PUT updated todo has exactly 4 properties', async () => {
    const todo = await createTodo('Shape test');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated shape' });

    const keys = Object.keys(res.body).sort();
    expect(keys).toEqual(['completed', 'createdAt', 'id', 'title']);
  });

  it('DELETE returned todo has exactly 4 properties', async () => {
    const todo = await createTodo('Shape test');

    const res = await request(app).delete(`/todos/${todo.id}`);

    const keys = Object.keys(res.body).sort();
    expect(keys).toEqual(['completed', 'createdAt', 'id', 'title']);
  });

  it('PUT 404 error has exactly 1 property: error', async () => {
    const res = await request(app)
      .put('/todos/nope')
      .send({ title: 'Test' });

    expect(Object.keys(res.body)).toEqual(['error']);
  });

  it('DELETE 404 error has exactly 1 property: error', async () => {
    const res = await request(app).delete('/todos/nope');

    expect(Object.keys(res.body)).toEqual(['error']);
  });
});

describe('TICKET-005 QA Gate: Code quality validation', () => {
  it('PUT route uses validateUpdateTodo middleware', () => {
    const todosRouter = require('../src/routes/todos');
    const putLayer = todosRouter.stack.find(
      (l) => l.route && l.route.path === '/:id' && l.route.methods.put
    );
    expect(putLayer).toBeDefined();
    expect(putLayer.route.stack.length).toBeGreaterThanOrEqual(2);
  });

  it('DELETE route has a single handler (no unnecessary middleware)', () => {
    const todosRouter = require('../src/routes/todos');
    const deleteLayer = todosRouter.stack.find(
      (l) => l.route && l.route.path === '/:id' && l.route.methods.delete
    );
    expect(deleteLayer).toBeDefined();
    expect(deleteLayer.route.stack).toHaveLength(1);
  });

  it('routes use the storage module (readTodos/writeTodos)', () => {
    const src = require('fs').readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'todos.js'),
      'utf8'
    );
    expect(src).toContain('readTodos');
    expect(src).toContain('writeTodos');
  });

  it('validateUpdateTodo middleware exists and is a function', () => {
    const { validateUpdateTodo } = require('../src/middleware/validate');
    expect(typeof validateUpdateTodo).toBe('function');
    expect(validateUpdateTodo.length).toBe(3); // (req, res, next)
  });
});

describe('TICKET-005 QA Gate: Regression — existing endpoints unaffected', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('GET /health still works', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /todos still creates todos', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Regression POST' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Regression POST');
  });

  it('GET /todos still returns all todos', async () => {
    await createTodo('One');
    await createTodo('Two');
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('POST /todos validation still works', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
