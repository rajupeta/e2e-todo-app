function validateCreateTodo(req, res, next) {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  next();
}

function validateUpdateTodo(req, res, next) {
  const { title, completed } = req.body;

  const hasTitle = title !== undefined;
  const hasCompleted = completed !== undefined;

  if (!hasTitle && !hasCompleted) {
    return res.status(400).json({ error: 'At least one of title or completed is required' });
  }

  if (hasTitle && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (hasCompleted && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed must be a boolean' });
  }

  next();
}

module.exports = { validateCreateTodo, validateUpdateTodo };
