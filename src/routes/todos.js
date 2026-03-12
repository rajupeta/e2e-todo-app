const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readTodos, writeTodos } = require('../storage');
const { validateCreateTodo } = require('../middleware/validate');

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

module.exports = router;
