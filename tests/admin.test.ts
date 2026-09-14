import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminEnabled,
  checkPassword,
  createSession,
  validSession,
} from '../src/lib/admin';
test('admin panel stays off without a long password', () => {
  delete process.env.ADMIN_PASSWORD;
  assert.equal(adminEnabled(), false);
  assert.equal(checkPassword(''), false);
  process.env.ADMIN_PASSWORD = 'short';
  assert.equal(adminEnabled(), false);
  assert.equal(validSession(createSession()), false);
});
test('sessions are signed, expire and die when the password changes', () => {
  process.env.ADMIN_PASSWORD = 'una-contrasena-larga';
  assert.equal(checkPassword('una-contrasena-larga'), true);
  assert.equal(checkPassword('una-contrasena-larg'), false);
  const now = Date.now();
  const session = createSession(now);
  assert.equal(validSession(session, now + 1000), true);
  assert.equal(validSession(session, now + 13 * 3600000), false);
  const [expires, signature] = session.split('.');
  assert.equal(validSession(`${Number(expires) + 1}.${signature}`, now), false);
  assert.equal(validSession('garbage', now), false);
  process.env.ADMIN_PASSWORD = 'otra-contrasena-larga';
  assert.equal(validSession(session, now + 1000), false);
});
