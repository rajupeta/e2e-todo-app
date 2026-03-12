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

    it('returns empty array when file contains a non-array JSON value', async () => {
      await fs.writeFile(TODOS_FILE, '{"key": "value"}', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns empty array when file contains just whitespace', async () => {
      await fs.writeFile(TODOS_FILE, '   \n  ', 'utf8');
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

    it('can write and read back an empty array', async () => {
      await writeTodos([{ id: '1', title: 'Something' }]);
      await writeTodos([]);
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });
  });

  describe('readTodos - additional edge cases', () => {
    it('returns empty array when file contains JSON null', async () => {
      await fs.writeFile(TODOS_FILE, 'null', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns empty array when file contains JSON number', async () => {
      await fs.writeFile(TODOS_FILE, '42', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns empty array when file contains JSON string', async () => {
      await fs.writeFile(TODOS_FILE, '"hello"', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('returns empty array when file contains JSON boolean', async () => {
      await fs.writeFile(TODOS_FILE, 'true', 'utf8');
      const todos = await readTodos();
      expect(todos).toEqual([]);
    });

    it('preserves todo object structure with all fields', async () => {
      const todo = {
        id: 'abc-123',
        title: 'Complete project',
        completed: true,
        createdAt: '2026-03-12T00:00:00.000Z',
      };
      await writeTodos([todo]);
      const todos = await readTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0]).toEqual(todo);
      expect(todos[0].id).toBe('abc-123');
      expect(todos[0].completed).toBe(true);
      expect(todos[0].createdAt).toBe('2026-03-12T00:00:00.000Z');
    });

    it('handles special characters in todo titles', async () => {
      const data = [
        { id: '1', title: 'Todo with "quotes" & <brackets>', completed: false },
        { id: '2', title: 'Unicode: café, naïve, résumé 🎉', completed: false },
      ];
      await writeTodos(data);
      const todos = await readTodos();
      expect(todos).toEqual(data);
    });

    it('handles large number of todos', async () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i + 1),
        title: `Todo item #${i + 1}`,
        completed: i % 2 === 0,
      }));
      await writeTodos(data);
      const todos = await readTodos();
      expect(todos).toHaveLength(1000);
      expect(todos[0].id).toBe('1');
      expect(todos[999].id).toBe('1000');
    });
  });

  describe('writeTodos - additional edge cases', () => {
    it('writes valid UTF-8 encoded file', async () => {
      await writeTodos([{ id: '1', title: 'Test' }]);
      const raw = await fs.readFile(TODOS_FILE, 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('file is readable after multiple rapid writes', async () => {
      await writeTodos([{ id: '1', title: 'First' }]);
      await writeTodos([{ id: '2', title: 'Second' }]);
      await writeTodos([{ id: '3', title: 'Third' }]);
      await writeTodos([{ id: '4', title: 'Fourth' }]);
      await writeTodos([{ id: '5', title: 'Fifth' }]);
      const todos = await readTodos();
      expect(todos).toEqual([{ id: '5', title: 'Fifth' }]);
    });

    it('readTodos works after file is deleted and recreated', async () => {
      await writeTodos([{ id: '1', title: 'Before delete' }]);
      await fs.unlink(TODOS_FILE);
      const afterDelete = await readTodos();
      expect(afterDelete).toEqual([]);
      await writeTodos([{ id: '2', title: 'After recreate' }]);
      const afterRecreate = await readTodos();
      expect(afterRecreate).toEqual([{ id: '2', title: 'After recreate' }]);
    });
  });

  describe('async behavior', () => {
    it('readTodos returns a promise', () => {
      const result = readTodos();
      expect(result).toBeInstanceOf(Promise);
      return result;
    });

    it('writeTodos returns a promise', () => {
      const result = writeTodos([]);
      expect(result).toBeInstanceOf(Promise);
      return result;
    });
  });
});
