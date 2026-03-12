const fs = require('fs/promises');
const path = require('path');

const TODOS_FILE = path.join(__dirname, '..', 'todos.json');

async function readTodos() {
  try {
    const data = await fs.readFile(TODOS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    if (err instanceof SyntaxError) {
      return [];
    }
    throw err;
  }
}

async function writeTodos(todos) {
  await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

module.exports = { readTodos, writeTodos };
