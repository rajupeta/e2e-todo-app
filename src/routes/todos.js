const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readTodos, writeTodos } = require('../storage');
const { validateCreateTodo, validateUpdateTodo } = require('../middleware/validate');

const router = express.Router();

router.post('/', validateCreateTodo, async (req, res) => {
  try {
    const todo = {
      id: uuidv4(),
      title: req.body.title,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const todos = await readTodos();
    todos.push(todo);
    await writeTodos(todos);

    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const todos = await readTodos();
    res.status(200).json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validateUpdateTodo, async (req, res) => {
  try {
    const todos = await readTodos();
    const index = todos.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.body.title !== undefined) {
      todos[index].title = req.body.title;
    }
    if (req.body.completed !== undefined) {
      todos[index].completed = req.body.completed;
    }

    await writeTodos(todos);
    res.status(200).json(todos[index]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const todos = await readTodos();
    const index = todos.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const [deleted] = todos.splice(index, 1);
    await writeTodos(todos);
    res.status(200).json(deleted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
