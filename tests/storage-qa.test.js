const fs = require('fs/promises');
const fsSynch = require('fs');
const path = require('path');
const { readTodos, writeTodos } = require('../src/storage');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

/**
 * QA Validation tests for TICKET-002
 * Test agent — additional coverage for acceptance criteria & regression prevention
 */
describe('TICKET-002 QA: Acceptance Criteria Validation', () => {
  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  describe('AC1: readTodos() returns [] when todos.json does not exist', () => {
    it('returns empty array after file removal', async () => {
      await fs.unlink(TODOS_FILE).catch(() => {});
      const result = await readTodos();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array of length 0, not a truthy empty-ish value', async () => {
      await fs.unlink(TODOS_FILE).catch(() => {});
      const result = await readTodos();
      expect(result).toHaveLength(0);
      expect(result.length).toBe(0);
    });
  });

  describe('AC2: writeTodos persists data that readTodos can retrieve', () => {
    it('round-trips a single todo', async () => {
      const todo = { id: 'rt-1', title: 'Round trip test', completed: false, createdAt: '2026-03-12T00:00:00.000Z' };
      await writeTodos([todo]);
      const result = await readTodos();
      expect(result).toEqual([todo]);
    });

    it('round-trips multiple todos', async () => {
      const todos = [
        { id: 'rt-1', title: 'First', completed: false },
        { id: 'rt-2', title: 'Second', completed: true },
        { id: 'rt-3', title: 'Third', completed: false },
      ];
      await writeTodos(todos);
      const result = await readTodos();
      expect(result).toEqual(todos);
      expect(result).toHaveLength(3);
    });

    it('data persists to disk (file exists after write)', async () => {
      await writeTodos([{ id: '1', title: 'Persist check' }]);
      const exists = fsSynch.existsSync(TODOS_FILE);
      expect(exists).toBe(true);
    });

    it('written file contains valid JSON matching the input', async () => {
      const todos = [{ id: 'json-check', title: 'Validate JSON' }];
      await writeTodos(todos);
      const raw = await fs.readFile(TODOS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(todos);
    });
  });

  describe('AC3: All storage unit tests pass (regression check)', () => {
    it('module exports readTodos function', () => {
      const storage = require('../src/storage');
      expect(typeof storage.readTodos).toBe('function');
    });

    it('module exports writeTodos function', () => {
      const storage = require('../src/storage');
      expect(typeof storage.writeTodos).toBe('function');
    });

    it('module does not export unexpected properties', () => {
      const storage = require('../src/storage');
      const keys = Object.keys(storage);
      expect(keys).toContain('readTodos');
      expect(keys).toContain('writeTodos');
      expect(keys).toHaveLength(2);
    });
  });

  describe('AC4: File operations are async (use fs/promises)', () => {
    it('readTodos returns a Promise', () => {
      const p = readTodos();
      expect(p).toBeInstanceOf(Promise);
      return p;
    });

    it('writeTodos returns a Promise', () => {
      const p = writeTodos([]);
      expect(p).toBeInstanceOf(Promise);
      return p;
    });

    it('source code imports fs/promises (not fs sync)', () => {
      const src = fsSynch.readFileSync(path.join(__dirname, '..', 'src', 'storage.js'), 'utf8');
      expect(src).toMatch(/require\(['"]fs\/promises['"]\)/);
      expect(src).not.toMatch(/readFileSync/);
      expect(src).not.toMatch(/writeFileSync/);
    });
  });

  describe('AC5: No crashes on missing or empty file', () => {
    it('does not throw when file is missing', async () => {
      await fs.unlink(TODOS_FILE).catch(() => {});
      await expect(readTodos()).resolves.toBeDefined();
    });

    it('does not throw when file is empty string', async () => {
      await fs.writeFile(TODOS_FILE, '', 'utf8');
      await expect(readTodos()).resolves.toBeDefined();
    });

    it('does not throw when file contains only newlines', async () => {
      await fs.writeFile(TODOS_FILE, '\n\n\n', 'utf8');
      await expect(readTodos()).resolves.toEqual([]);
    });

    it('does not throw when file contains corrupt JSON', async () => {
      await fs.writeFile(TODOS_FILE, '{{{{', 'utf8');
      await expect(readTodos()).resolves.toEqual([]);
    });
  });
});

describe('TICKET-002 QA: Edge Cases & Code Quality', () => {
  afterEach(async () => {
    await fs.writeFile(TODOS_FILE, '[]', 'utf8');
  });

  describe('ENOENT handling', () => {
    it('readTodos gracefully handles ENOENT (not just any error)', async () => {
      await fs.unlink(TODOS_FILE).catch(() => {});
      // Should return [] for file-not-found, not throw
      const result = await readTodos();
      expect(result).toEqual([]);
    });
  });

  describe('Pretty-print format', () => {
    it('writeTodos produces 2-space indented JSON', async () => {
      const data = [{ id: '1', title: 'Indent test', completed: false }];
      await writeTodos(data);
      const raw = await fs.readFile(TODOS_FILE, 'utf8');
      // 2-space indent means lines should start with "  " (two spaces)
      const lines = raw.split('\n');
      // The second line should have 2-space indent for array element opening brace
      expect(lines[1]).toMatch(/^\s{2}/);
      // Verify it matches the expected format exactly
      expect(raw).toBe(JSON.stringify(data, null, 2));
    });
  });

  describe('Initial todos.json state', () => {
    it('todos.json file exists in the project root', () => {
      expect(fsSynch.existsSync(TODOS_FILE)).toBe(true);
    });
  });

  describe('Concurrency safety', () => {
    it('multiple sequential writes followed by read returns last write', async () => {
      for (let i = 0; i < 10; i++) {
        await writeTodos([{ id: String(i), title: `Write ${i}` }]);
      }
      const result = await readTodos();
      expect(result).toEqual([{ id: '9', title: 'Write 9' }]);
    });
  });

  describe('Data integrity', () => {
    it('writeTodos with nested objects preserves structure', async () => {
      const complex = [
        {
          id: 'nested-1',
          title: 'Nested test',
          completed: false,
          metadata: { tags: ['urgent', 'work'], priority: 1 },
        },
      ];
      await writeTodos(complex);
      const result = await readTodos();
      expect(result).toEqual(complex);
      expect(result[0].metadata.tags).toEqual(['urgent', 'work']);
    });

    it('writeTodos with empty string title preserves it', async () => {
      const data = [{ id: '1', title: '', completed: false }];
      await writeTodos(data);
      const result = await readTodos();
      expect(result[0].title).toBe('');
    });
  });
});
