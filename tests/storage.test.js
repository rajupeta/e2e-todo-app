const fs = require('fs/promises');
const path = require('path');
const { readTodos, writeTodos } = require('../src/storage');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

describe('storage', () => {
  afterEach(async () => {
    // Restore an empty todos.json after each test
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  describe('readTodos', () => {
    it('returns empty array when todos.json does not exist', async () => {
      await fs.unlink(TODOS_FILE).catch(() => {});
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns empty array when todos.json is empty', async () => {
      await fs.writeFile(TODOS_FILE, '', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns parsed array from todos.json', async () => {
      const data = [{ id: '1', title: 'Test', completed: false }];
      await fs.writeFile(TODOS_FILE, JSON.stringify(data), 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual(data);
    });

    it('handles corrupt/invalid JSON gracefully', async () => {
      await fs.writeFile(TODOS_FILE, '{not valid json!!!', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });
  });

  describe('writeTodos', () => {
    it('persists data that readTodos can retrieve', async () => {
      const data = [
        { id: '1', title: 'Buy milk', completed: false },
        { id: '2', title: 'Walk dog', completed: true },
      ];
      await writeTodos(data);
      const todos = await readTodos();
      expect(todos).toEqual(data);
    });

    it('writes pretty-printed JSON with 2-space indent', async () => {
      const data = [{ id: '1', title: 'Test' }];
      await writeTodos(data);
      const raw = await fs.readFile(TODOS_FILE, 'utf8');
      expect(raw).toBe(JSON.stringify(data, null, 2));
    });

    it('overwrites existing data', async () => {
      await writeTodos([{ id: '1', title: 'First' }]);
      await writeTodos([{ id: '2', title: 'Second' }]);
      const todos = await readTodos();
      expect(todos).toEqual([{ id: '2', title: 'Second' }]);
    });
  });
});
