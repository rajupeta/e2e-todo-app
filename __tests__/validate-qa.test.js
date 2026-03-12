const { validateCreateTodo, validateUpdateTodo } = require('../src/middleware/validate');

/**
 * QA Validation tests for TICKET-003
 * Test agent — comprehensive edge case coverage and acceptance criteria validation
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
// AC1: POST validation rejects missing/empty title with 400 and error message
// =============================================================================

describe('AC1: validateCreateTodo rejects missing/empty title', () => {
  it('rejects when body is completely empty (no title key)', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is undefined', () => {
    const req = mockReq({ title: undefined });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is empty string', () => {
    const req = mockReq({ title: '' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
  });

  it('rejects when title is only tabs and newlines', () => {
    const req = mockReq({ title: '\t\n\r' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is a number (type coercion check)', () => {
    const req = mockReq({ title: 0 });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is an array', () => {
    const req = mockReq({ title: ['Buy milk'] });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is an object', () => {
    const req = mockReq({ title: { text: 'Buy milk' } });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid non-empty title', () => {
    const req = mockReq({ title: 'Buy milk' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts title with leading/trailing spaces (non-empty after trim)', () => {
    const req = mockReq({ title: '  Buy milk  ' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts single character title', () => {
    const req = mockReq({ title: 'A' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// =============================================================================
// AC2: PUT validation rejects requests with no valid fields with 400
// =============================================================================

describe('AC2: validateUpdateTodo rejects requests with no valid fields', () => {
  it('rejects empty body', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'At least one of title or completed is required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects body with only unrecognized fields', () => {
    const req = mockReq({ description: 'some desc', priority: 'high' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'At least one of title or completed is required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is empty string and no completed field', () => {
    const req = mockReq({ title: '' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when completed is a string (type validation)', () => {
    const req = mockReq({ completed: 'true' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when completed is 0 (falsy but not boolean)', () => {
    const req = mockReq({ completed: 0 });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is whitespace-only', () => {
    const req = mockReq({ title: '   ' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// AC3: PUT validation accepts title-only, completed-only, or both
// =============================================================================

describe('AC3: validateUpdateTodo accepts valid field combinations', () => {
  it('accepts valid title only', () => {
    const req = mockReq({ title: 'Updated title' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts completed: true only', () => {
    const req = mockReq({ completed: true });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts completed: false only', () => {
    const req = mockReq({ completed: false });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts both title and completed: true', () => {
    const req = mockReq({ title: 'New title', completed: true });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts both title and completed: false', () => {
    const req = mockReq({ title: 'New title', completed: false });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts valid fields even with extra unrecognized fields present', () => {
    const req = mockReq({ title: 'New title', priority: 'high' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// =============================================================================
// AC5: Error responses use consistent format: { error: 'message' }
// =============================================================================

describe('AC5: Error response format consistency', () => {
  const errorScenarios = [
    { name: 'create with missing title', fn: validateCreateTodo, body: {} },
    { name: 'create with empty title', fn: validateCreateTodo, body: { title: '' } },
    { name: 'create with null title', fn: validateCreateTodo, body: { title: null } },
    { name: 'update with empty body', fn: validateUpdateTodo, body: {} },
    { name: 'update with empty title', fn: validateUpdateTodo, body: { title: '' } },
    { name: 'update with non-boolean completed', fn: validateUpdateTodo, body: { completed: 'yes' } },
  ];

  it.each(errorScenarios)(
    '$name — returns { error: string } format',
    ({ fn, body }) => {
      const req = mockReq(body);
      const res = mockRes();
      const next = mockNext();

      fn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledTimes(1);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('error');
      expect(typeof responseBody.error).toBe('string');
      expect(responseBody.error.length).toBeGreaterThan(0);
      // Ensure no other keys exist in the error response
      expect(Object.keys(responseBody)).toEqual(['error']);
    }
  );
});

// =============================================================================
// Additional edge cases
// =============================================================================

describe('Edge cases: validateCreateTodo', () => {
  it('does not modify the request object', () => {
    const body = { title: 'Test todo' };
    const req = mockReq(body);
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(req.body).toEqual({ title: 'Test todo' });
  });

  it('returns a value from res.status().json() (for Express chaining)', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    const result = validateCreateTodo(req, res, next);

    // The middleware returns the result of res.status(400).json(...)
    // which is the res object (from our mock)
    expect(result).toBe(res);
  });

  it('accepts a very long title string', () => {
    const req = mockReq({ title: 'A'.repeat(10000) });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts title with unicode characters', () => {
    const req = mockReq({ title: '买牛奶 🥛' });
    const res = mockRes();
    const next = mockNext();

    validateCreateTodo(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Edge cases: validateUpdateTodo', () => {
  it('rejects when both title and completed are invalid types', () => {
    const req = mockReq({ title: 123, completed: 'not-bool' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when title is an empty array', () => {
    const req = mockReq({ title: [] });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('validates title before completed (title error takes precedence)', () => {
    const req = mockReq({ title: '', completed: 'invalid' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    // Title validation runs first, so error should be about title
    expect(res.json).toHaveBeenCalledWith({ error: 'Title is required' });
  });

  it('does not modify the request object', () => {
    const body = { title: 'Updated', completed: true };
    const req = mockReq(body);
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    expect(req.body).toEqual({ title: 'Updated', completed: true });
  });

  it('accepts title with special characters', () => {
    const req = mockReq({ title: '<script>alert("xss")</script>' });
    const res = mockRes();
    const next = mockNext();

    validateUpdateTodo(req, res, next);

    // Validation only checks type/emptiness, not content sanitization
    expect(next).toHaveBeenCalled();
  });
});

// =============================================================================
// Module exports verification
// =============================================================================

describe('Module exports', () => {
  it('exports validateCreateTodo as a function', () => {
    expect(typeof validateCreateTodo).toBe('function');
  });

  it('exports validateUpdateTodo as a function', () => {
    expect(typeof validateUpdateTodo).toBe('function');
  });

  it('middleware functions accept 3 arguments (req, res, next)', () => {
    expect(validateCreateTodo.length).toBe(3);
    expect(validateUpdateTodo.length).toBe(3);
  });
});
