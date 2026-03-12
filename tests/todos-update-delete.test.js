const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

async function createTodo(title) {
  const res = await request(app).post('/todos').send({ title });
  return res.body;
}

describe('PUT /todos/:id', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('updates title and returns 200 with updated todo', async () => {
    const todo = await createTodo('Original');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
    expect(res.body.title).toBe('Updated');
    expect(res.body.completed).toBe(false);
  });

  it('updates completed and returns 200 with updated todo', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
    expect(res.body.title).toBe('Task');
    expect(res.body.completed).toBe(true);
  });

  it('updates both title and completed', async () => {
    const todo = await createTodo('Old');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'New', completed: true });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.completed).toBe(true);
  });

  it('persists the update to storage', async () => {
    const todo = await createTodo('Before');

    await request(app)
      .put(`/todos/${todo.id}`)
      .send({ title: 'After' });

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data[0].title).toBe('After');
  });

  it('returns 404 for nonexistent id', async () => {
    const res = await request(app)
      .put('/todos/nonexistent-id')
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 400 when no valid fields provided', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({});

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

  it('returns 400 when completed is not boolean', async () => {
    const todo = await createTodo('Task');

    const res = await request(app)
      .put(`/todos/${todo.id}`)
      .send({ completed: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /todos/:id', () => {
  beforeEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  it('deletes the todo and returns 200 with the deleted todo', async () => {
    const todo = await createTodo('To delete');

    const res = await request(app).delete(`/todos/${todo.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todo.id);
    expect(res.body.title).toBe('To delete');
  });

  it('removes the todo from storage', async () => {
    const todo = await createTodo('Gone');

    await request(app).delete(`/todos/${todo.id}`);

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(0);
  });

  it('only removes the targeted todo', async () => {
    const todo1 = await createTodo('Keep');
    const todo2 = await createTodo('Remove');

    await request(app).delete(`/todos/${todo2.id}`);

    const data = JSON.parse(await fs.readFile(TODOS_FILE, 'utf8'));
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(todo1.id);
  });

  it('returns 404 for nonexistent id', async () => {
    const res = await request(app).delete('/todos/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});
