const { validateCreateTodo, validateUpdateTodo } = require('../src/middleware/validate');

/**
 * QA Integration tests for TICKET-003
 * Test agent — validates middleware behavior in Express-like request pipeline
 */

// --- Helpers ---

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

// =============================================================================
// Middleware pipeline behavior tests
// =============================================================================

describe('validateCreateTodo: middleware pipeline behavior', () => {
  it('does not call next() when validation fails', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('calls next() exactly once when validation passes', () => {
    const req = mockReq({ title: 'Valid todo' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called with no arguments (no error)
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('does not call next() with an error argument on failure', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    // Middleware handles errors via res, not next(err)
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves extra body fields when passing to next', () => {
    const req = mockReq({ title: 'Buy milk', extra: 'data', count: 42 });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.extra).toBe('data');
    expect(req.body.count).toBe(42);
  });
});

describe('validateUpdateTodo: middleware pipeline behavior', () => {
  it('does not call next() when validation fails', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('calls next() exactly once when validation passes', () => {
    const req = mockReq({ completed: true });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('preserves extra body fields when passing to next', () => {
    const req = mockReq({ title: 'Updated', meta: { source: 'api' } });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.meta).toEqual({ source: 'api' });
  });
});

// =============================================================================
// Boundary value tests for title field
// =============================================================================

describe('validateCreateTodo: title boundary values', () => {
  it('rejects title that is exactly one space', () => {
    const req = mockReq({ title: ' ' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts title that is exactly one non-space character', () => {
    const req = mockReq({ title: 'x' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects title of type number 0 (falsy)', () => {
    const req = mockReq({ title: 0 });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects title of type number (non-zero)', () => {
    const req = mockReq({ title: 42 });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects title with only non-breaking space (U+00A0) as whitespace', () => {
    const req = mockReq({ title: '\u00A0' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    // Modern JS trim() strips \u00A0, so this is treated as empty
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// validateUpdateTodo: combined field validation order
// =============================================================================

describe('validateUpdateTodo: field validation ordering', () => {
  it('checks title validity before completed when both are present and invalid', () => {
    const req = mockReq({ title: '', completed: 'not-bool' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    // Title is checked first in the implementation
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
  });

  it('reports completed error when title is valid but completed is invalid', () => {
    const req = mockReq({ title: 'Valid', completed: 'not-bool' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
  });

  it('reports completed error when title is absent but completed is wrong type', () => {
    const req = mockReq({ completed: 42 });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
  });
});

// =============================================================================
// Response format validation
// =============================================================================

describe('Error response structure', () => {
  it('validateCreateTodo error response has only "error" key', () => {
    const req = mockReq({ title: '' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(Object.keys(body)).toEqual(['error']);
    expect(typeof body.error).toBe('string');
  });

  it('validateUpdateTodo error response has only "error" key (empty body)', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(Object.keys(body)).toEqual(['error']);
    expect(typeof body.error).toBe('string');
  });

  it('validateUpdateTodo error response has only "error" key (bad completed)', () => {
    const req = mockReq({ completed: 'yes' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error).toBe('Completed must be a boolean');
  });

  it('all error messages are non-empty strings', () => {
    const cases = [
      { fn: validateCreateTodo, body: {} },
      { fn: validateCreateTodo, body: { title: '' } },
      { fn: validateUpdateTodo, body: {} },
      { fn: validateUpdateTodo, body: { title: '' } },
      { fn: validateUpdateTodo, body: { completed: 'yes' } },
    ];

    cases.forEach(({ fn, body }) => {
      const req = mockReq(body);
      const res = mockRes();
      const next = mockNext();

      fn(req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.error).toBeTruthy();
      expect(responseBody.error.length).toBeGreaterThan(0);
    });
  });
});
