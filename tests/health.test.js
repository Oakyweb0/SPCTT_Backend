import { describe, it } from 'node:test';
import assert from 'node:assert';

import { config } from '../src/config/env.js';
import app from '../src/app.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';

describe('SPCTT Backend Health & Unit Verification', () => {
  it('Should load environment configuration successfully', () => {
    assert.ok(config.PORT, 'PORT should be defined');
    assert.ok(config.DB.NAME, 'Database name should be defined');
    assert.ok(config.JWT.SECRET, 'JWT secret should be defined');
  });

  it('Should correctly generate and verify JWT tokens', () => {
    const payload = { user_id: 99, email: 'test@spctt.org', role: 'user' };
    const token = generateToken(payload, '1h');
    assert.ok(token, 'Token string should be generated');

    const result = verifyToken(token);
    assert.strictEqual(result.valid, true, 'Token should be valid');
    assert.strictEqual(result.decoded.user_id, 99);
    assert.strictEqual(result.decoded.email, 'test@spctt.org');
  });

  it('Should initialize express app object with handlers', () => {
    assert.ok(app, 'Express app should be initialized');
    assert.strictEqual(typeof app.listen, 'function', 'App should have listen method');
  });
});
