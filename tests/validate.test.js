const { validateCreateTodo, validateUpdateTodo } = require('../src/middleware/validate');

function mockReq(body = {}) {
  return { body };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

describe('validateCreateTodo', () => {
  it('returns 400 when title is missing', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is an empty string', () => {
    const req = mockReq({ title: '' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is whitespace only', () => {
    const req = mockReq({ title: '   ' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is not a string', () => {
    const req = mockReq({ title: 123 });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is null', () => {
    const req = mockReq({ title: null });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is a boolean', () => {
    const req = mockReq({ title: true });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when title is a valid non-empty string', () => {
    const req = mockReq({ title: 'Buy milk' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('validateUpdateTodo', () => {
  it('returns 400 when no fields are provided', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'At least one of title or completed is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when title is an empty string', () => {
    const req = mockReq({ title: '' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when completed is not a boolean', () => {
    const req = mockReq({ completed: 'yes' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when only valid title is provided', () => {
    const req = mockReq({ title: 'Updated title' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when only valid completed is provided', () => {
    const req = mockReq({ completed: true });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when both valid title and completed are provided', () => {
    const req = mockReq({ title: 'Updated', completed: false });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when title is null', () => {
    const req = mockReq({ title: null });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when completed is a number', () => {
    const req = mockReq({ completed: 1 });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when completed is null', () => {
    const req = mockReq({ completed: null });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when completed is false', () => {
    const req = mockReq({ completed: false });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
